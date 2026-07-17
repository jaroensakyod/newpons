// สร้างเอกสารรีวิวสำหรับเจ้าของ (แม่นเคมี): รวมข้อสอบทุกข้อ + เฉลย + คำอธิบาย
// แยกตามบท → docs/review/review.html (เปิดในเบราว์เซอร์ได้เลย ใช้ KaTeX จาก CDN)
// ใช้: node scripts/build-review.mjs
// หมายเหตุ: ไฟล์นี้มีเฉลยครบ — ใช้รีวิวภายในเท่านั้น ห้าม deploy ขึ้นเว็บ

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "content", "questions");
const OUT_DIR = path.join(ROOT, "docs", "review");
const OUT = path.join(OUT_DIR, "review.html");

const CANONICAL_TOPICS = [
  "ทักษะพื้นฐานปฏิบัติการเคมี",
  "โครงสร้างอะตอม",
  "ตารางธาตุและสมบัติของธาตุ",
  "พันธะเคมี",
  "โมลและปริมาณสารสัมพันธ์",
  "แก๊สและสมบัติของแก๊ส",
  "สารละลาย",
  "ของแข็งและของเหลว",
];
const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// แปลง math + **bold** + ย่อหน้า ให้เป็น HTML (ครอบคลุมรูปแบบที่ใช้ใน content จริง)
function render(text) {
  const parts = [];
  const mathRe = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m;
  while ((m = mathRe.exec(text)) !== null) {
    parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({
      type: "math",
      value: m[1] ?? m[2],
      display: m[1] !== undefined,
    });
    last = m.index + m[0].length;
  }
  parts.push({ type: "text", value: text.slice(last) });

  return parts
    .map((p) => {
      if (p.type === "math") {
        return katex.renderToString(p.value, {
          throwOnError: false,
          strict: "ignore",
          displayMode: p.display,
        });
      }
      return escapeHtml(p.value)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replaceAll("\n\n", "<br/><br/>")
        .replaceAll("\n", "<br/>");
    })
    .join("");
}

const byTopic = new Map(CANONICAL_TOPICS.map((t) => [t, []]));
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const items = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
  for (const q of items) {
    byTopic.get(q.topic)?.push({ ...q, _file: file });
  }
}

let total = 0;
const sections = CANONICAL_TOPICS.map((topic, ti) => {
  const items = byTopic.get(topic) ?? [];
  items.sort((a, b) => a.difficulty - b.difficulty);
  total += items.length;
  const body = items
    .map((q, i) => {
      const choices = q.choices
        .map((c, ci) => {
          const correct = ci === q.correct_index;
          return `<li class="${correct ? "correct" : ""}">
            <span class="label">${CHOICE_LABELS[ci]}</span> ${render(c)}
            ${correct ? '<span class="check">✓ คำตอบ</span>' : ""}
          </li>`;
        })
        .join("");
      return `<details class="q">
        <summary>
          <span class="qnum">ข้อ ${i + 1}</span>
          <span class="stars">${"★".repeat(q.difficulty)}${"☆".repeat(Math.max(0, 5 - q.difficulty))}</span>
          <span class="sub">${escapeHtml(q.subtopic ?? "")}</span>
          ${q.style ? `<span class="style-tag">แนว ${escapeHtml(q.style)}</span>` : ""}
          <span class="file">${escapeHtml(q._file)}</span>
        </summary>
        <div class="stem">${render(q.stem)}</div>
        <ul class="choices">${choices}</ul>
        <div class="expl"><div class="expl-head">เฉลยละเอียด</div>${render(q.explanation)}</div>
      </details>`;
    })
    .join("\n");
  return `<section id="t${ti + 1}">
    <h2>${ti + 1}. ${escapeHtml(topic)} <span class="count">${items.length} ข้อ</span></h2>
    ${body}
  </section>`;
}).join("\n");

const nav = CANONICAL_TOPICS.map(
  (t, i) =>
    `<a href="#t${i + 1}">${i + 1}. ${escapeHtml(t)} (${(byTopic.get(t) ?? []).length})</a>`
).join(" · ");

const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>รีวิวข้อสอบ ${total} ข้อ — ติวเคมี สอวน. ค่าย 1 (ฉบับมีเฉลย ใช้ภายใน)</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css"/>
<style>
  body { font-family: system-ui, "Segoe UI", sans-serif; max-width: 860px; margin: 0 auto; padding: 16px; color: #1e293b; line-height: 1.7; }
  h1 { font-size: 1.3rem; } h2 { font-size: 1.1rem; margin-top: 2.5rem; border-bottom: 2px solid #6366f1; padding-bottom: 4px; }
  .banner { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 10px; padding: 10px 14px; font-size: .9rem; }
  .nav { font-size: .85rem; margin: 12px 0; line-height: 2; }
  .count { font-weight: normal; color: #64748b; font-size: .85rem; }
  details.q { border: 1px solid #e2e8f0; border-radius: 12px; margin: 10px 0; padding: 10px 14px; background: #fff; }
  details.q[open] { border-color: #a5b4fc; }
  summary { cursor: pointer; display: flex; gap: 10px; flex-wrap: wrap; align-items: baseline; }
  .qnum { font-weight: 700; } .stars { color: #f59e0b; font-size: .85rem; }
  .sub { color: #6366f1; font-size: .8rem; } .file { color: #94a3b8; font-size: .75rem; margin-left: auto; }
  .style-tag { background: #fef3c7; color: #92400e; font-size: .72rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
  .stem { margin-top: 10px; }
  ul.choices { list-style: none; padding: 0; }
  ul.choices li { border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; margin: 6px 0; }
  ul.choices li.correct { border-color: #10b981; background: #ecfdf5; }
  .label { display: inline-block; width: 1.6em; font-weight: 700; color: #475569; }
  .check { color: #059669; font-weight: 700; font-size: .8rem; margin-left: 8px; }
  .expl { background: #f8fafc; border-radius: 10px; padding: 10px 14px; margin-top: 8px; font-size: .95rem; }
  .expl-head { font-size: .72rem; font-weight: 700; letter-spacing: .05em; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; }
  .katex-display { overflow-x: auto; }
  @media print { details.q { break-inside: avoid; } }
</style>
<script>
  // ปุ่มเปิด/ปิดทุกข้อ
  function toggleAll(open) { document.querySelectorAll("details.q").forEach(d => d.open = open); }
</script>
</head>
<body>
<h1>📋 รีวิวข้อสอบ ${total} ข้อ — ติวเคมี สอวน. ค่าย 1</h1>
<div class="banner">⚠️ ฉบับมีเฉลยครบ — ใช้รีวิวภายในเท่านั้น ห้ามแจกนักเรียน/ห้ามอัปโหลดขึ้นเว็บ<br/>
📌 ประเด็นรอตัดสิน: (1) ข้อ 11 ใน 05-mole-stoichiometry-add.json แนวใกล้ข้อ 15 คลังเดิม — ผู้ตรวจบอกรับได้ คงไว้หรือแก้?
(2) บทเรียนโครงสร้างอะตอมยังไม่มีหัวข้อกัมมันตภาพรังสี/ครึ่งชีวิต ทั้งที่มีข้อสอบแนวนี้ — เพิ่มไหม?</div>
<p class="nav">${nav}</p>
<p><button onclick="toggleAll(true)">เปิดทุกข้อ</button> <button onclick="toggleAll(false)">ปิดทุกข้อ</button>
— แต่ละข้อกดที่หัวเพื่อดูโจทย์+เฉลย · เรียงจากง่าย→ยากในแต่ละบท</p>
${sections}
</body>
</html>`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`✓ สร้าง ${path.relative(ROOT, OUT)} — รวม ${total} ข้อ`);
