import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { MathMarkdown } from "@/components/MathMarkdown";
import LessonVideos, { type LessonVideo } from "@/components/LessonVideos";
import type { Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

type LessonContent = {
  lesson_md: string;
  video_urls: LessonVideo[];
};

export default async function LessonPage({
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

  const { data: content } = await supabase
    .from("contents")
    .select("lesson_md, video_urls")
    .eq("topic_id", id)
    .maybeSingle<LessonContent>();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/topics"
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100"
        >
          ← หน้าหมวด
        </Link>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
          📖 บทเรียน
        </span>
      </header>

      {!content ? (
        <div className="mt-16 text-center">
          <p className="text-4xl">📭</p>
          <h1 className="mt-3 text-lg font-bold">
            หมวด “{topic.name}” ยังไม่มีบทเรียน
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            นำเข้าบทเรียนด้วย <code>npm run import:lessons</code> ก่อนนะ
          </p>
          <Link
            href={`/quiz/${topic.id}`}
            className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
          >
            ไปทำข้อสอบหมวดนี้แทน →
          </Link>
        </div>
      ) : (
        <>
          <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <MathMarkdown className="text-[15.5px] leading-relaxed">
              {content.lesson_md}
            </MathMarkdown>
          </article>

          <LessonVideos videos={content.video_urls ?? []} />

          <div className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-center">
            <p className="font-semibold text-indigo-900">
              อ่านจบแล้ว? วัดความเข้าใจเลย
            </p>
            <Link
              href={`/quiz/${topic.id}`}
              className="mt-3 inline-block rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
            >
              ✏️ ทำข้อสอบหมวดนี้ →
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
