import Link from "next/link";

const chapters = [
  "ความปลอดภัยและทักษะในปฏิบัติการเคมี",
  "อะตอมและสมบัติของธาตุ",
  "พันธะเคมี",
  "โมลและสูตรเคมี",
  "สารละลาย",
  "ปริมาณสัมพันธ์",
  "แก๊สและสมบัติของแก๊ส",
  "อัตราการเกิดปฏิกิริยาเคมี",
  "สมดุลเคมี",
  "กรด-เบส",
  "เคมีไฟฟ้า",
  "เคมีอินทรีย์",
  "พอลิเมอร์",
  "เคมีกับการแก้ปัญหา",
];

export default function GeneralChemistryPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-teal-700 hover:text-teal-900">
          ← กลับหน้าเลือกเส้นทาง
        </Link>
        <header className="mt-5 rounded-3xl bg-gradient-to-r from-teal-800 to-teal-600 px-6 py-8 text-white sm:px-9">
          <p className="text-sm font-bold text-teal-100">เคมี ม.4 - ม.6 · 14 บท</p>
          <h1 className="mt-2 text-3xl font-extrabold">ชีทเคมีทั่วไปตามแนวทาง สสวท.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-teal-50">
            ชีทสำหรับใช้สอนและทบทวน ทำทีละบทและเปิดให้ตรวจคุณภาพก่อนเผยแพร่บทถัดไป เนื้อหาและแบบฝึกเขียนขึ้นใหม่โดยใช้ขอบเขตหลักสูตร สสวท. เป็นแนวทาง
          </p>
        </header>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((name, index) => {
            const ready = index === 0;
            return (
              <article key={name} className="flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 font-extrabold text-teal-800">
                    {index + 1}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ready ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {ready ? "พร้อมตรวจ" : "รอทำ"}
                  </span>
                </div>
                <h2 className="mt-4 font-bold leading-6 text-slate-900">{name}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {ready ? "เนื้อหา + ฝึกทันที + แบบฝึกหัด + เฉลยละเอียด" : "จะเริ่มหลังจากบทก่อนหน้าผ่านการตรวจ"}
                </p>
                {ready ? (
                  <a
                    href="/general-chemistry/general-chemistry-ch01.pdf"
                    download
                    className="mt-auto rounded-xl bg-teal-600 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-teal-700"
                  >
                    ดาวน์โหลด PDF
                  </a>
                ) : (
                  <span className="mt-auto cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-400">
                    ยังไม่เปิดดาวน์โหลด
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
