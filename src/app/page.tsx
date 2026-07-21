import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/env";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <p className="text-5xl">⚗️</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            ห้องเรียนวิทย์และคณิต
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            เลือกเส้นทางให้ตรงกับเป้าหมาย: ฝึกสอบแข่งขัน สอวน. ชีทเคมี ม.ปลาย หรือชีทคณิต ม.ต้นตามแนวทาง สสวท.
          </p>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-3" aria-label="เลือกเส้นทางเรียน">
          <article className="flex flex-col rounded-3xl border border-indigo-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <span className="rounded-2xl bg-indigo-100 p-3 text-3xl">🏅</span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                สอบแข่งขัน
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-bold text-indigo-950">ติวเคมี สอวน. ค่าย 1</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              บทเรียนสอนสลับฝึก คลังโจทย์ไต่ระดับ เฉลยละเอียด และสรุปจุดอ่อนรายบุคคล
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">
              <li>✓ โจทย์ต้นฉบับ 8 หมวด</li>
              <li>✓ โหมดเรียน ฝึก และข้อสอบ</li>
              <li>✓ ต้องเข้าสู่ระบบเพื่อบันทึกสถิติ</li>
            </ul>
            <Link
              href={hasSupabaseEnv ? "/topics" : "/"}
              className={`mt-7 rounded-2xl px-5 py-3 text-center font-bold text-white ${hasSupabaseEnv ? "bg-indigo-600 hover:bg-indigo-700" : "cursor-not-allowed bg-slate-400"}`}
            >
              {hasSupabaseEnv ? "เข้าสู่ส่วน สอวน. →" : "ยังไม่ได้เชื่อมระบบข้อสอบ"}
            </Link>
          </article>

          <article className="flex flex-col rounded-3xl border border-sky-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <span className="rounded-2xl bg-sky-100 p-3 text-3xl">📐</span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">ม.1</span>
            </div>
            <h2 className="mt-5 text-2xl font-bold text-sky-950">คณิตศาสตร์ ม.ต้น</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">ชีทเรียนและแบบฝึกตามแนวทาง สสวท. ทำทีละบท พร้อมเฉลยละเอียด</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-600"><li>✓ ดาวน์โหลด PDF ได้</li><li>✓ พร้อมแล้ว 3 บท รวม 423 ข้อ</li><li>✓ รอตรวจทานโดยครูผู้สอน</li></ul>
            <Link href="/math-m1" className="mt-7 rounded-2xl bg-sky-600 px-5 py-3 text-center font-bold text-white transition hover:bg-sky-700">ดูชีทคณิต ม.1 →</Link>
          </article>

          <article className="flex flex-col rounded-3xl border border-teal-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <span className="rounded-2xl bg-teal-100 p-3 text-3xl">📚</span>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                ม.4 - ม.6
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-bold text-teal-950">เคมีทั่วไปตามแนวทาง สสวท.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              ชีทพร้อมสอน ครบเนื้อหา ตัวอย่าง แบบฝึก และเฉลย แยกเป็น 14 บทตามลำดับหลักสูตร
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">
              <li>✓ ดาวน์โหลด PDF ได้โดยไม่ต้องเข้าสู่ระบบ</li>
              <li>✓ ทำและตรวจคุณภาพทีละบท</li>
              <li>✓ บทที่ 1 พร้อมให้ตรวจแล้ว</li>
            </ul>
            <Link
              href="/general-chemistry"
              className="mt-7 rounded-2xl bg-teal-600 px-5 py-3 text-center font-bold text-white transition hover:bg-teal-700"
            >
              ดูชีทเคมีทั่วไป →
            </Link>
          </article>
        </section>

        {!hasSupabaseEnv && (
          <p className="mx-auto mt-6 max-w-2xl rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            ส่วนเคมีทั่วไปใช้งานได้ตามปกติ ส่วน สอวน. จะเปิดเมื่อเชื่อม Supabase แล้ว
          </p>
        )}
      </div>
    </main>
  );
}
