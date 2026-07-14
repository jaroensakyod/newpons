import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";

export default function Home() {
  // ล็อกอินแล้ว middleware จะพาไป /topics เอง — เหลือแค่คนยังไม่ล็อกอิน
  if (hasSupabaseEnv) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-amber-900">
          ⚗️ ติวเคมี สอวน. ค่าย 1 — ยังไม่ได้เชื่อม Supabase
        </h1>
        <p className="mt-2 text-amber-800">
          แอปพร้อมแล้ว เหลือแค่ตั้งค่าฐานข้อมูลตามขั้นตอนนี้:
        </p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-amber-900">
          <li>
            สร้างโปรเจกต์ฟรีที่{" "}
            <span className="font-mono font-semibold">supabase.com</span>
          </li>
          <li>
            เปิด <strong>SQL Editor</strong> แล้วรันไฟล์{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">
              supabase/schema.sql
            </code>{" "}
            ทั้งไฟล์
          </li>
          <li>
            คัดลอก{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">
              .env.example
            </code>{" "}
            เป็น{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">
              .env.local
            </code>{" "}
            แล้วเติม URL + anon key จาก Project Settings → API
          </li>
          <li>
            นำเข้าข้อสอบ:{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">
              npm run import:questions
            </code>
          </li>
          <li>
            รีสตาร์ท dev server (
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">
              npm run dev
            </code>
            ) แล้วรีเฟรชหน้านี้
          </li>
        </ol>
        <p className="mt-4 text-xs text-amber-700">
          รายละเอียดเต็มอยู่ใน README.md
        </p>
      </div>
    </main>
  );
}
