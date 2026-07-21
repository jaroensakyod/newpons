import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import katex from "katex";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chapters = {"01":{slug:"01-decimals-fractions",title:"ทศนิยมและเศษส่วน",number:"1"},"02":{slug:"02-integers",title:"จำนวนเต็ม",number:"2"},"03":{slug:"03-geometric-constructions",title:"การสร้างทางเรขาคณิต",number:"3"}};
const chapter = chapters[process.argv[2] ?? "01"] ?? chapters["01"];
const content = fs.readFileSync(path.join(ROOT, `content/math-m1/${chapter.slug}.md`), "utf8");
const questions = JSON.parse(fs.readFileSync(path.join(ROOT, `content/math-m1/${chapter.slug}-questions.json`), "utf8"));
const katexCss = fs.readFileSync(path.join(ROOT, "node_modules", "katex", "dist", "katex.min.css"), "utf8") + `
*{box-sizing:border-box}img{display:block;width:auto;max-width:94%;max-height:218mm;height:auto;margin:12px auto;object-fit:contain;break-inside:avoid}.question-image{max-width:72%;max-height:72mm;margin:8px auto}.page-break+.solution-section{break-before:auto}`;
const outDir = path.join(ROOT, "docs", "math-m1");
fs.mkdirSync(outDir, { recursive: true });

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");
const renderQuestionMath = (value) => escapeHtml(value).replace(
  /(?<![\d.])(-?\d+)\/(-?\d+)(?![\d.])/g,
  (_, numerator, denominator) => katex.renderToString(`\\frac{${numerator}}{${denominator}}`, { throwOnError: false })
);
const labels = ["ก", "ข", "ค", "ง"];
const renderQuestionMarkup = (value) => renderQuestionMath(value)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replaceAll("\n", "<br>");
const questionImage = (q) => q.image ? `<img class="question-image" src="file:///${path.join(ROOT,"public",q.image).replaceAll("\\","/")}" alt="ภาพประกอบข้อ ${escapeHtml(q.id)}">` : "";
const exercise = (q, num) => `<article class="question"><h3>ข้อ ${num} <small>${escapeHtml(q.subtopic)}</small></h3><p>${renderQuestionMath(q.stem)}</p>${questionImage(q)}<ol class="choices">${q.choices.map((x, ci) => `<li><span class="choice-label">${labels[ci]}.</span>${renderQuestionMath(x)}</li>`).join("")}</ol></article>`;
const solution = (q, num) => `<article class="solution"><h3>ข้อ ${num} — ตอบ ${labels[q.correct_index]}</h3>${questionImage(q)}<p>${renderQuestionMarkup(q.explanation)}</p></article>`;
const renderMath = (md) => {
  const maths = [];
  const token = (math, displayMode) => {
    const id = maths.length;
    maths.push(katex.renderToString(math.trim(), { displayMode, throwOnError: false }));
    return `@@MATH${id}@@`;
  };
  const masked = md
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => token(math, true))
    .replace(/\$([^$\n]+?)\$/g, (_, math) => token(math, false));
  return marked.parse(masked)
    .replace(/src="\/images\//g, `src="file:///${path.join(ROOT,"public","images").replaceAll("\\","/")}/`)
    .replace(/@@MATH(\d+)@@/g, (_, id) => maths[Number(id)]);
};
const parts = content.split(/(?=^## )/m);
const intro = parts.shift() ?? "";
const ordered = [];
const flow = parts.map((part) => {
  const heading = part.match(/^## (.+)$/m)?.[1]?.trim() ?? "";
  const take = questions.filter((q) => q.section === heading);
  const drills = take.map((q) => { ordered.push(q); return exercise(q, ordered.length); }).join("");
  return `<section class="learn-step">${renderMath(part)}${drills ? `<div class="drill"><h2>✏️ ฝึกทันที ${take.length} ข้อ</h2>${drills}</div>` : ""}</section>`;
}).join("");
if (ordered.length !== questions.length) throw new Error(`จัดโจทย์ลงช่วงได้ ${ordered.length}/${questions.length} ข้อ`);
const solutions = parts.map((part) => {
  const heading = part.match(/^## (.+)$/m)?.[1]?.trim() ?? "";
  const take = ordered.filter((q) => q.section === heading);
  if (!take.length) return "";
  return `<section class="solution-section"><h2>${escapeHtml(heading)}</h2>${take.map((q) => solution(q, ordered.indexOf(q) + 1)).join("")}</section>`;
}).join("");
const html = `<!doctype html><html lang="th"><meta charset="utf-8"><title>คณิต ม.1 บท${chapter.title}</title><style>${katexCss}
@page{size:A4;margin:16mm 14mm 15mm}body{font-family:Sarabun,Arial,sans-serif;color:#172033;line-height:1.55;font-size:14px}h1{font-size:29px;margin:0}h2{color:#155e75;border-bottom:2px solid #a5f3fc;padding-bottom:4px;break-after:avoid}h3{margin:0 0 5px}.cover{background:linear-gradient(120deg,#0e7490,#0891b2);color:#fff;border-radius:16px;padding:28px;margin-bottom:20px}.cover p{margin:8px 0}.learn-step{break-before:page}.learn-step:first-of-type{break-before:auto}.drill{margin-top:18px;border-top:3px solid #38bdf8;padding-top:8px}.question,.solution{break-inside:avoid;border:1px solid #dbeafe;border-radius:9px;padding:11px 13px;margin:9px 0}.question h3{color:#1d4ed8}.question small{font-weight:normal;color:#64748b;margin-left:8px}.question p,.solution p{margin:5px 0}.choices{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin:7px 0 0;padding:0;list-style:none}.choices li{display:flex;align-items:center;gap:7px;min-height:28px}.choice-label{font-weight:700;color:#334155;min-width:20px}.solution-section{break-before:page}.solution{border-color:#bbf7d0;background:#f0fdf4}.solution h3{color:#15803d}.page-break{break-before:page}.note{background:#ecfeff;border-left:4px solid #0891b2;padding:9px 12px;border-radius:5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#cffafe}code{background:#f1f5f9;padding:1px 3px;border-radius:3px}</style><body>
<section class="cover"><p>คณิตศาสตร์ ม.1 · บทที่ ${chapter.number} · ชีทดาวน์โหลด</p><h1>${chapter.title}</h1><p>สอนสลับฝึก ${parts.length} ส่วน · แบบฝึก ${questions.length} ข้อ · เฉลยละเอียดทุกข้อ</p><p><strong>ฉบับร่างเพื่อรอตรวจทานโดยครูผู้สอน</strong></p></section>
${renderMath(intro)}${flow}<section class="page-break"><h1>เฉลยละเอียด แยกตามส่วน</h1><p class="note">อ่านหลักคิดและวิธีทำทีละขั้น แล้วกลับไปแก้ข้อที่พลาดอีกครั้ง</p></section>${solutions}</body></html>`;
const outName=`m1-ch${chapter.slug}.html`;
fs.writeFileSync(path.join(outDir, outName), html);
console.log(`✓ docs/math-m1/${outName}`);
