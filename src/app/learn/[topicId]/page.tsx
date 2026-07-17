import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import LearnRunner, { type LearnStep } from "@/components/LearnRunner";
import type { QuizQuestion, Topic } from "@/lib/types";
import learnMap from "../../../../content/learn-map.json";

export const dynamic = "force-dynamic";

type MapStep = {
  title: string;
  headings: string[];
  subtopics: string[];
  drill: number;
  note?: string;
};

// แบ่ง markdown เป็นช่วงตามหัวข้อ ## (คืน map: หัวข้อ → เนื้อหารวมหัวข้อ)
function splitSections(md: string): { heading: string; body: string }[] {
  const lines = md.split("\n");
  const sections: { heading: string; body: string }[] = [];
  let current: { heading: string; body: string } | null = null;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { heading: line.slice(3).trim(), body: line + "\n" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections;
}

// เลือกโจทย์ N ข้อที่ง่ายสุด (เรียง difficulty) — ช่วงสอนแรกของ subtopic ได้ข้อง่าย
// ข้อยากตกไปอยู่ช่วงกวาดท้าย (drill=99) ซึ่งสอนเนื้อหาครบแล้ว กันโจทย์มาก่อนบทเรียน
function pickEasiest(qs: QuizQuestion[], n: number): QuizQuestion[] {
  return [...qs].sort((a, b) => a.difficulty - b.difficulty).slice(0, n);
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  if (!hasSupabaseEnv) redirect("/");

  const { topicId } = await params;
  const id = Number(topicId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const mapSteps = (learnMap as unknown as Record<string, MapStep[]>)[
    String(id)
  ];
  if (!Array.isArray(mapSteps)) notFound(); // หมวดนี้ยังไม่มีเส้นทางเรียน (key อื่นเช่น _comment ไม่นับ)

  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("*")
    .eq("id", id)
    .single<Topic>();
  if (!topic) notFound();

  const [{ data: content }, { data: questions }, { data: subtopics }] =
    await Promise.all([
      supabase
        .from("contents")
        .select("lesson_md")
        .eq("topic_id", id)
        .maybeSingle<{ lesson_md: string }>(),
      supabase
        .from("quiz_questions")
        .select("id, stem, choices, difficulty, subtopic_id")
        .eq("topic_id", id),
      supabase.from("subtopics").select("id, name").eq("topic_id", id),
    ]);

  const sections = splitSections(content?.lesson_md ?? "");
  const subtopicIdByName = new Map(
    (subtopics ?? []).map((s: { id: number; name: string }) => [s.name, s.id])
  );
  const allQuestions = (questions ?? []) as (QuizQuestion & {
    subtopic_id: number | null;
  })[];

  // กันโจทย์ซ้ำเมื่อหลายช่วงใช้ subtopic เดียวกัน — จำ id ที่หยิบไปแล้ว
  const usedIds = new Set<string>();
  const steps: LearnStep[] = mapSteps.map((step) => {
    const body = step.headings
      .map(
        (prefix) =>
          sections.find((s) => s.heading.startsWith(prefix))?.body ?? ""
      )
      .filter(Boolean)
      .join("\n");
    const wantedIds = new Set(
      step.subtopics
        .map((name) => subtopicIdByName.get(name))
        .filter((v): v is number => typeof v === "number")
    );
    const pool = allQuestions.filter(
      (q) =>
        q.subtopic_id !== null &&
        wantedIds.has(q.subtopic_id) &&
        !usedIds.has(q.id)
    );
    const picked = pickEasiest(pool, step.drill);
    picked.forEach((q) => usedIds.add(q.id));
    return {
      title: step.title,
      markdown: body,
      note: step.note,
      questions: picked,
    };
  });

  return <LearnRunner topic={topic} steps={steps} />;
}
