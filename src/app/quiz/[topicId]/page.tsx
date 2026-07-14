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
}: {
  params: Promise<{ topicId: string }>;
}) {
  if (!hasSupabaseEnv) redirect("/");

  const { topicId } = await params;
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

  const shuffled = shuffle((questions ?? []) as QuizQuestion[]);

  return <QuizRunner topic={topic} questions={shuffled} />;
}
