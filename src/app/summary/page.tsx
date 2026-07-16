import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import type { TopicStat, SubtopicStat } from "@/lib/types";

export const dynamic = "force-dynamic";

function barColor(pct: number) {
  if (pct < 50) return "bg-rose-500";
  if (pct < 75) return "bg-amber-500";
  return "bg-emerald-500";
}

export default async function SummaryPage() {
  if (!hasSupabaseEnv) redirect("/");

  const supabase = await createClient();
  const [{ data, error }, { data: subtopicData, error: subtopicError }] =
    await Promise.all([
      supabase.rpc("topic_stats"),
      supabase.rpc("subtopic_stats"),
    ]);

  if (error) {
    throw new Error(
      `โหลดสถิติไม่สำเร็จ (${error.message}) — รัน supabase/schema.sql แล้วหรือยัง?`
    );
  }
  // subtopic_stats เป็นฟีเจอร์เสริม — ถ้ายังไม่ได้รัน migration ก็ไม่ต้องพังทั้งหน้า
  const subtopicRows = subtopicError ? [] : ((subtopicData ?? []) as SubtopicStat[]);

  const stats = (data ?? []) as TopicStat[];

  // รวมทุกระดับความยากเข้าเป็น % ต่อ subtopic แล้วจัดกลุ่มตาม topic_id
  const subtopicsByTopic = new Map<
    number,
    { subtopic_id: number; subtopic_name: string; total: number; correct: number }[]
  >();
  for (const row of subtopicRows) {
    if (!subtopicsByTopic.has(row.topic_id)) subtopicsByTopic.set(row.topic_id, []);
    const list = subtopicsByTopic.get(row.topic_id)!;
    let entry = list.find((s) => s.subtopic_id === row.subtopic_id);
    if (!entry) {
      entry = { subtopic_id: row.subtopic_id, subtopic_name: row.subtopic_name, total: 0, correct: 0 };
      list.push(entry);
    }
    entry.total += row.total_attempts;
    entry.correct += row.correct_attempts;
  }
  const attempted = stats
    .filter((t) => t.total_attempts > 0)
    .map((t) => ({
      ...t,
      pct: Math.round((t.correct_attempts / t.total_attempts) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);
  const untouched = stats.filter(
    (t) => t.total_attempts === 0 && t.question_count > 0
  );
  const weakest = attempted[0];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 สรุปจุดอ่อน</h1>
          <p className="mt-1 text-sm text-slate-500">
            เรียงจากหมวดที่อ่อนสุด — เอาเวลาไปลงหมวดบนสุดก่อน
          </p>
        </div>
        <Link
          href="/topics"
          className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100"
        >
          ← หน้าหมวด
        </Link>
      </header>

      {weakest && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-500">
            ควรเสริมด่วนที่สุด
          </p>
          <p className="mt-1 text-lg font-bold text-rose-900">
            {weakest.topic_name}
          </p>
          <p className="mt-1 text-sm text-rose-700">
            ตอบถูกเพียง {weakest.pct}% จากการทำ {weakest.total_attempts} ครั้ง
          </p>
          <Link
            href={`/quiz/${weakest.topic_id}`}
            className="mt-3 inline-block rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            ฝึกหมวดนี้เลย →
          </Link>
        </div>
      )}

      {attempted.length === 0 && (
        <div className="mt-10 text-center">
          <p className="text-4xl">🌱</p>
          <p className="mt-3 font-semibold">ยังไม่มีข้อมูล</p>
          <p className="mt-1 text-sm text-slate-500">
            ทำข้อสอบสักหมวดก่อน แล้วกลับมาดูว่าอ่อนตรงไหน
          </p>
          <Link
            href="/topics"
            className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
          >
            ไปทำข้อสอบ →
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {attempted.map((t) => {
          const subtopics = (subtopicsByTopic.get(t.topic_id) ?? [])
            .filter((s) => s.total > 0)
            .map((s) => ({ ...s, pct: Math.round((s.correct / s.total) * 100) }))
            .sort((a, b) => a.pct - b.pct);

          return (
            <div
              key={t.topic_id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300"
            >
              <Link href={`/quiz/${t.topic_id}`} className="block">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{t.topic_name}</p>
                  <p className="shrink-0 text-sm font-bold text-slate-700">
                    {t.pct}%
                  </p>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${barColor(t.pct)}`}
                    style={{ width: `${Math.max(t.pct, 3)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  ถูก {t.correct_attempts} จาก {t.total_attempts} ครั้งที่ตอบ
                </p>
              </Link>

              {subtopics.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {subtopics.map((s) => (
                    <div
                      key={s.subtopic_id}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-500">{s.subtopic_name}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${
                          s.pct < 50
                            ? "bg-rose-50 text-rose-600"
                            : s.pct < 75
                              ? "bg-amber-50 text-amber-600"
                              : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {s.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {untouched.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-semibold text-slate-500">
            หมวดที่ยังไม่เคยทำ
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {untouched.map((t) => (
              <Link
                key={t.topic_id}
                href={`/quiz/${t.topic_id}`}
                className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-600 transition hover:border-indigo-400 hover:text-indigo-700"
              >
                {t.topic_name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
