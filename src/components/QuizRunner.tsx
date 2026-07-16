"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MathMarkdown } from "@/components/MathMarkdown";
import type { QuizQuestion, SubmitResult, Topic } from "@/lib/types";

const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];

function shuffledIndices(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizRunner({
  topic,
  questions,
  mode = "random",
}: {
  topic: Topic;
  questions: QuizQuestion[];
  mode?: "random" | "ladder";
}) {
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const [order, setOrder] = useState<number[]>(() =>
    questions.map((_, i) => i)
  );
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = order.length;
  const q = total > 0 ? questions[order[idx]] : null;

  async function choose(choiceIndex: number) {
    if (!q || selected !== null || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (!supabase) throw new Error("ยังไม่ได้ตั้งค่า Supabase (.env.local)");
      const { data, error } = await supabase.rpc("submit_answer", {
        p_question_id: q.id,
        p_chosen_index: choiceIndex,
      });
      if (error) throw error;
      const r = (Array.isArray(data) ? data[0] : data) as SubmitResult;
      if (!r) throw new Error("ไม่ได้รับผลตรวจจากเซิร์ฟเวอร์");
      setSelected(choiceIndex);
      setResult(r);
      if (r.is_correct) setCorrectCount((c) => c + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ส่งคำตอบไม่สำเร็จ ลองใหม่อีกครั้ง"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (idx + 1 >= total) {
      setFinished(true);
    } else {
      setIdx(idx + 1);
      setSelected(null);
      setResult(null);
      setError(null);
    }
  }

  function restart() {
    // โหมดบันได: คงลำดับง่าย→ยากเดิม (เซิร์ฟเวอร์เรียงมาแล้ว) · โหมดสุ่ม: สับใหม่
    setOrder(
      mode === "ladder"
        ? questions.map((_, i) => i)
        : shuffledIndices(questions.length)
    );
    setIdx(0);
    setSelected(null);
    setResult(null);
    setCorrectCount(0);
    setFinished(false);
    setError(null);
  }

  if (!q) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl">📭</p>
        <h1 className="mt-3 text-lg font-bold">
          หมวด “{topic.name}” ยังไม่มีข้อสอบ
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          นำเข้าข้อสอบด้วย <code>npm run import:questions</code> ก่อนนะ
        </p>
        <Link
          href="/topics"
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
        >
          ← กลับหน้าหมวด
        </Link>
      </main>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / total) * 100);
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-10 text-center">
        <p className="text-5xl">{pct >= 75 ? "🎉" : pct >= 50 ? "💪" : "📚"}</p>
        <h1 className="mt-4 text-2xl font-bold">จบหมวด “{topic.name}”</h1>
        <p className="mt-3 text-4xl font-bold text-indigo-600">
          {correctCount}/{total}
        </p>
        <p className="mt-1 text-slate-500">ตอบถูก {pct}%</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={restart}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
          >
            🔁 ทำอีกรอบ
          </button>
          <Link
            href="/topics"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            เลือกหมวดอื่น
          </Link>
          <Link
            href="/summary"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            📊 ดูจุดอ่อน
          </Link>
        </div>
        <Link
          href={`/lesson/${topic.id}`}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          📖 ทบทวนบทเรียนหมวดนี้ก่อนทำรอบใหม่ →
        </Link>
      </main>
    );
  }

  const progress = ((idx + (result ? 1 : 0)) / total) * 100;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/topics"
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100"
        >
          ← ออก
        </Link>
        <p className="truncate text-sm font-semibold text-slate-700">
          {mode === "ladder" && (
            <span title="โหมดไต่บันได — เรียงจากง่ายไปยาก">🪜 </span>
          )}
          {topic.name}
        </p>
        <p className="shrink-0 text-sm text-slate-500">
          {idx + 1}/{total}
        </p>
      </header>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">
            ข้อที่ {idx + 1}
          </span>
          <span className="text-xs text-amber-500" title="ระดับความยาก">
            {"★".repeat(q.difficulty)}
            <span className="text-slate-200">
              {"★".repeat(Math.max(0, 5 - q.difficulty))}
            </span>
          </span>
        </div>
        <div className="mt-2 text-[17px] leading-relaxed">
          <MathMarkdown>{q.stem}</MathMarkdown>
        </div>
      </section>

      <div className="mt-4 space-y-3">
        {q.choices.map((choice, i) => {
          let style =
            "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50";
          if (result) {
            if (i === result.correct_index) {
              style = "border-emerald-400 bg-emerald-50";
            } else if (i === selected) {
              style = "border-rose-400 bg-rose-50";
            } else {
              style = "border-slate-200 bg-white opacity-60";
            }
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={result !== null || submitting}
              className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition disabled:cursor-default ${style}`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  result && i === result.correct_index
                    ? "bg-emerald-500 text-white"
                    : result && i === selected
                      ? "bg-rose-500 text-white"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {CHOICE_LABELS[i]}
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <MathMarkdown>{choice}</MathMarkdown>
              </span>
              {result && i === result.correct_index && (
                <span className="shrink-0 pt-0.5 text-emerald-600">✓</span>
              )}
              {result && !result.is_correct && i === selected && (
                <span className="shrink-0 pt-0.5 text-rose-600">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {submitting && (
        <p className="mt-4 text-center text-sm text-slate-400">
          กำลังตรวจคำตอบ...
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {result && (
        <section
          className={`mt-5 rounded-2xl border-2 p-5 ${
            result.is_correct
              ? "border-emerald-200 bg-emerald-50"
              : "border-rose-200 bg-rose-50"
          }`}
        >
          <p
            className={`text-lg font-bold ${
              result.is_correct ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {result.is_correct
              ? "✓ ถูกต้อง!"
              : `✗ ยังไม่ถูก — คำตอบคือ ${CHOICE_LABELS[result.correct_index]}`}
          </p>
          <div className="mt-3 rounded-xl bg-white/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              เฉลยละเอียด
            </p>
            <div className="mt-2 text-[15px] leading-relaxed">
              <MathMarkdown>{result.explanation}</MathMarkdown>
            </div>
          </div>
          <button
            onClick={next}
            className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            {idx + 1 >= total ? "ดูสรุปคะแนน →" : "ข้อถัดไป →"}
          </button>
        </section>
      )}
    </main>
  );
}
