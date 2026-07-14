"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function toThaiError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (m.includes("email not confirmed"))
    return "อีเมลนี้ยังไม่ได้ยืนยัน — เช็คกล่องจดหมายก่อน แล้วค่อยเข้าสู่ระบบ";
  if (m.includes("user already registered"))
    return "อีเมลนี้สมัครไว้แล้ว — สลับไปแท็บเข้าสู่ระบบได้เลย";
  if (m.includes("password should be at least"))
    return "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "รูปแบบอีเมลไม่ถูกต้อง";
  if (m.includes("rate limit") || m.includes("too many"))
    return "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่";
  if (m.includes("fetch")) return "ต่อ Supabase ไม่ได้ — เช็คอินเทอร์เน็ตหรือค่าใน .env.local";
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          router.push("/topics");
          router.refresh();
          return;
        }
        // โปรเจกต์เปิด confirm email ไว้ — ต้องกดลิงก์ในอีเมลก่อน
        setNotice(
          "สมัครสำเร็จ! ระบบส่งลิงก์ยืนยันไปที่อีเมลแล้ว กดยืนยันเสร็จค่อยกลับมาเข้าสู่ระบบ"
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/topics");
        router.refresh();
      }
    } catch (err) {
      setError(toThaiError(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="text-center">
        <p className="text-5xl">⚗️</p>
        <h1 className="mt-3 text-2xl font-bold">ติวเคมี สอวน. ค่าย 1</h1>
        <p className="mt-1 text-sm text-slate-500">
          ทำข้อสอบ → เห็นเฉลยละเอียดทันที → รู้ว่าอ่อนหมวดไหน
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setNotice(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === "signin"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setNotice(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === "signup"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            สมัครใหม่
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              อีเมล
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              รหัสผ่าน
            </label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading
              ? "กำลังดำเนินการ..."
              : mode === "signup"
                ? "สมัครและเริ่มติว"
                : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </main>
  );
}
