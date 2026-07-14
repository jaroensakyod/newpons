// หน้าเช็คการเรนเดอร์ KaTeX ชั่วคราว (ลบได้) — เปิดที่ /dev/katex-check
import { MathMarkdown } from "@/components/MathMarkdown";

const sample = `**โจทย์ตัวอย่าง**: CO$_2$ ที่มี O อยู่ 16 กรัม มีปริมาตรกี่ลิตรที่ STP (กำหนด O = 16, แก๊ส 1 โมล = 22.4 L)

**วิธีทำ**

ขั้นที่ 1: หาโมลของอะตอม O

$$16\\ \\cancel{\\text{g O}} \\times \\frac{1\\ \\text{mol O}}{16\\ \\cancel{\\text{g O}}} = 1\\ \\text{mol O}$$

ขั้นที่ 2: ใน $\\mathrm{CO_2}$ 1 โมเลกุล มี O 2 อะตอม ดังนั้น

$$1\\ \\cancel{\\text{mol O}} \\times \\frac{1\\ \\text{mol CO}_2}{2\\ \\cancel{\\text{mol O}}} = 0.5\\ \\text{mol CO}_2$$

ขั้นที่ 3: ที่ STP

$$0.5 \\times 22.4 = \\textcolor{green}{11.2\\ \\text{L}}$$

สมการอื่นๆ: $\\frac{PV}{T} = nR$, $2H_2 + O_2 \\to 2H_2O$, $\\Delta E = h\\nu$`;

export default function KatexCheckPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <MathMarkdown>{sample}</MathMarkdown>
      </div>
    </main>
  );
}
