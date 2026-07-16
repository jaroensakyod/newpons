import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import SignOutButton from "@/components/SignOutButton";
import type { TopicStat } from "@/lib/types";

export const dynamic = "force-dynamic";

function pctColor(pct: number) {
  if (pct < 50) return "bg-rose-100 text-rose-700";
  if (pct < 75) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export default async function TopicsPage() {
  if (!hasSupabaseEnv) redirect("/");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("topic_stats");

  if (error) {
    throw new Error(
      `โหลดหมวดไม่สำเร็จ (${error.message}) — รัน supabase/schema.sql ใน SQL Editor แล้วหรือยัง?`
    );
  }

  const stats = (data ?? []) as TopicStat[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">⚗️ ติวเคมี สอวน. ค่าย 1</h1>
          <p className="mt-1 text-sm text-slate-500">
            เลือกหมวดที่อยากฝึก — ตอบแล้วเห็นเฉลยละเอียดทันที
          </p>
        </div>
        <SignOutButton />
      </header>

      <Link
        href="/summary"
        className="mt-6 flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 transition hover:border-indigo-300 hover:bg-indigo-100"
      >
        <div>
          <p className="font-semibold text-indigo-900">📊 สรุปจุดอ่อนของฉัน</p>
          <p className="text-sm text-indigo-700">
            ดู % ถูกต่อหมวด เรียงจากหมวดที่อ่อนสุด
          </p>
        </div>
        <span className="text-indigo-400">→</span>
      </Link>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {stats.map((t) => {
          const attempted = t.total_attempts > 0;
          const pct = attempted
            ? Math.round((t.correct_attempts / t.total_attempts) * 100)
            : null;
          const hasQuestions = t.question_count > 0;
          const isHeavy = t.topic_name === "โมลและปริมาณสารสัมพันธ์";

          return (
            <div
              key={t.topic_id}
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                  {t.topic_order}
                </span>
                {isHeavy && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                    🔥 ออกสอบหนักสุด
                  </span>
                )}
              </div>
              <h2 className="mt-3 font-semibold leading-snug">{t.topic_name}</h2>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  {hasQuestions
                    ? `${t.question_count} ข้อ`
                    : "ยังไม่มีข้อสอบ (รอ import)"}
                </span>
                {attempted && pct !== null ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${pctColor(pct)}`}
                  >
                    ถูก {pct}%
                  </span>
                ) : (
                  hasQuestions && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                      ยังไม่เคยทำ
                    </span>
                  )
                )}
              </div>
              <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
                <Link
                  href={`/lesson/${t.topic_id}`}
                  className="rounded-xl border border-slate-300 bg-white py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700"
                >
                  📖 บทเรียน
                </Link>
                {hasQuestions ? (
                  <>
                    <Link
                      href={`/quiz/${t.topic_id}?mode=ladder`}
                      title="เรียงจากง่ายไปยาก"
                      className="rounded-xl border border-indigo-300 bg-indigo-50 py-2 text-center text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      🪜 ไต่บันได
                    </Link>
                    <Link
                      href={`/quiz/${t.topic_id}`}
                      title="สุ่มลำดับข้อ"
                      className="rounded-xl bg-indigo-600 py-2 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      🎲 สุ่มข้อ
                    </Link>
                  </>
                ) : (
                  <span className="col-span-2 cursor-not-allowed rounded-xl bg-slate-100 py-2 text-center text-sm font-semibold text-slate-400">
                    ✏️ ทำข้อสอบ
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {stats.length === 0 && (
        <p className="mt-10 text-center text-slate-500">
          ยังไม่มีหมวดในฐานข้อมูล — รัน supabase/schema.sql ก่อนนะ
        </p>
      )}
    </main>
  );
}
