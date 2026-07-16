import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import QuizRunner from "@/components/QuizRunner";
import type { QuizQuestion, Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  if (!hasSupabaseEnv) redirect("/");

  const { topicId } = await params;
  const { mode } = await searchParams;
  const ladder = mode === "ladder";
  const id = Number(topicId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("*")
    .eq("id", id)
    .single<Topic>();
  if (!topic) notFound();

  const { data: questions, error } = await supabase
    .from("quiz_questions")
    .select("id, stem, choices, difficulty")
    .eq("topic_id", id);

  if (error) {
    throw new Error(
      `โหลดข้อสอบไม่สำเร็จ (${error.message}) — รัน supabase/schema.sql ครบทั้งไฟล์แล้วหรือยัง?`
    );
  }

  // สุ่มก่อนเสมอ — โหมดบันไดค่อยเรียงตามความยากทับ (stable sort → สุ่มภายในระดับเดียวกัน)
  const shuffled = shuffle((questions ?? []) as QuizQuestion[]);
  const ordered = ladder
    ? [...shuffled].sort((a, b) => a.difficulty - b.difficulty)
    : shuffled;

  return (
    <QuizRunner
      topic={topic}
      questions={ordered}
      mode={ladder ? "ladder" : "random"}
    />
  );
}
