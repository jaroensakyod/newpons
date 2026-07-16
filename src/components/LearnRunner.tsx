"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MathMarkdown } from "@/components/MathMarkdown";
import type { QuizQuestion, SubmitResult, Topic } from "@/lib/types";

const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];

export type LearnStep = {
  title: string;
  markdown: string;
  questions: QuizQuestion[];
};

export default function LearnRunner({
  topic,
  steps,
}: {
  topic: Topic;
  steps: LearnStep[];
}) {
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const [stepIdx, setStepIdx] = useState(0);
  // phase: -1 = กำลังอ่านเนื้อหา, 0..n-1 = กำลังทำโจทย์ข้อที่ n ของ step นี้
  const [qIdx, setQIdx] = useState(-1);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = steps[stepIdx];
  const totalDrills = steps.reduce((s, st) => s + st.questions.length, 0);
  const doneDrills =
    steps.slice(0, stepIdx).reduce((s, st) => s + st.questions.length, 0) +
    Math.max(0, qIdx) +
    (result ? 1 : 0);
  const q = qIdx >= 0 ? step.questions[qIdx] : null;

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
      setAnswered((c) => c + 1);
      if (r.is_correct) setCorrect((c) => c + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ส่งคำตอบไม่สำเร็จ ลองใหม่อีกครั้ง"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setSelected(null);
    setResult(null);
    setError(null);
    if (qIdx + 1 < step.questions.length) {
      setQIdx(qIdx + 1);
    } else if (stepIdx + 1 < steps.length) {
      setStepIdx(stepIdx + 1);
      setQIdx(steps[stepIdx + 1].markdown ? -1 : 0);
    } else {
      setFinished(true);
    }
  }

  function startDrill() {
    setQIdx(0);
    setSelected(null);
    setResult(null);
  }

  if (finished) {
    const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-10 text-center">
        <p className="text-5xl">{pct >= 75 ? "🎉" : pct >= 50 ? "💪" : "📚"}</p>
        <h1 className="mt-4 text-2xl font-bold">
          เรียนจบหมวด “{topic.name}”
        </h1>
        <p className="mt-3 text-4xl font-bold text-indigo-600">
          {correct}/{answered}
        </p>
        <p className="mt-1 text-slate-500">ตอบถูก {pct}% ระหว่างเรียน</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/quiz/${topic.id}?mode=ladder`}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
          >
            🪜 ไต่บันไดข้อสอบเต็มหมวด
          </Link>
          <Link
            href="/topics"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            เลือกหมวดอื่น
          </Link>
        </div>
      </main>
    );
  }

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
          🎓 {topic.name}
        </p>
        <p className="shrink-0 text-sm text-slate-500">
          ช่วง {stepIdx + 1}/{steps.length}
        </p>
      </header>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{
            width: `${totalDrills > 0 ? (doneDrills / totalDrills) * 100 : 0}%`,
          }}
        />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-indigo-500">
        ช่วงที่ {stepIdx + 1}: {step.title}
      </p>

      {qIdx === -1 ? (
        <>
          <article className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <MathMarkdown className="text-[15.5px] leading-relaxed">
              {step.markdown}
            </MathMarkdown>
          </article>
          <button
            onClick={() =>
              step.questions.length > 0 ? startDrill() : next()
            }
            className="mt-5 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            {step.questions.length > 0
              ? `อ่านจบแล้ว → ฝึก ${step.questions.length} ข้อ`
              : stepIdx + 1 < steps.length
                ? "ช่วงถัดไป →"
                : "จบบทเรียน →"}
          </button>
        </>
      ) : q ? (
        <>
          {!step.markdown && qIdx === 0 && !result && (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              หัวข้อนี้ยังไม่มีเนื้อหาสอนในบทเรียน — ฝึกจากโจทย์และเฉลยละเอียดไปก่อน
            </p>
          )}
          <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                ฝึกข้อ {qIdx + 1}/{step.questions.length}
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
                {qIdx + 1 < step.questions.length
                  ? "ข้อถัดไป →"
                  : stepIdx + 1 < steps.length
                    ? "จบช่วงนี้ → ช่วงถัดไป"
                    : "ดูสรุปผล →"}
              </button>
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}
