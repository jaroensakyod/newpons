import Link from "next/link";

const sheets = [
  { number: 1, title: "ทศนิยมและเศษส่วน", detail: "สอนสลับฝึก 10 ส่วน แบบฝึก 116 ข้อ และเฉลยละเอียดทุกข้อ", href: "/math-m1/m1-ch01-decimals-fractions.pdf" },
  { number: 2, title: "จำนวนเต็ม", detail: "สอนสลับฝึก 15 ส่วน แบบฝึก 172 ข้อ และเฉลยละเอียดทุกข้อ", href: "/math-m1/m1-ch02-integers.pdf" },
  { number: 3, title: "การสร้างทางเรขาคณิต", detail: "ครบ 9 หน่วยตามลำดับ สสวท. แบบฝึก 135 ข้อ และเฉลยละเอียดทุกข้อ", href: "/math-m1/m1-ch03-geometric-constructions.pdf" },
];

export default function MathM1Page() {
  return <main className="min-h-screen bg-sky-50 px-4 py-10"><div className="mx-auto max-w-4xl">
    <Link href="/" className="text-sm font-semibold text-sky-700">← กลับหน้าเลือกเส้นทาง</Link>
    <header className="mt-6 rounded-3xl bg-gradient-to-r from-sky-700 to-cyan-600 p-8 text-white">
      <p className="text-sm font-bold">คณิตศาสตร์ ม.1</p><h1 className="mt-2 text-3xl font-extrabold">ชีทเรียนและแบบฝึกตามแนวทาง สสวท.</h1>
      <p className="mt-3 max-w-2xl text-sky-50">ทำทีละบท เนื้อหาครบ แบบฝึกมากพอ และตรวจทานก่อนเปิดบทถัดไป</p>
    </header>
    <section className="mt-7 grid gap-5 sm:grid-cols-2">{sheets.map(sheet => <article key={sheet.number} className="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm">
      <span className="rounded-xl bg-sky-100 px-3 py-2 font-bold text-sky-800">บทที่ {sheet.number}</span>
      <h2 className="mt-5 text-xl font-bold text-slate-900">{sheet.title}</h2><p className="mt-2 text-sm text-slate-600">{sheet.detail}</p>
      <a href={sheet.href} className="mt-5 block rounded-xl bg-sky-600 px-4 py-3 text-center font-bold text-white hover:bg-sky-700">ดาวน์โหลด PDF</a>
    </article>)}</section>
  </div></main>;
}
