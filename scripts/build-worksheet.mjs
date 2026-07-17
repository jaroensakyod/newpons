// สร้างชีทเรียน+แบบฝึกหัดต่อบท (พิมพ์เป็น PDF ได้ เช่นเปิดบน iPad → แชร์ → พิมพ์ → บันทึก PDF)
// เนื้อหาบทเรียนเต็ม + แบบฝึกหัดเรียงตามหัวข้อย่อยจากง่ายไปยาก + เฉลยย่อ/เฉลยละเอียดท้ายชีท
// ใช้: node scripts/build-worksheet.mjs → docs/worksheets/chNN.html (เปิดจากไฟล์ตรงได้ รูปชี้ relative)
// ดีไซน์อ้างอิงแนวชีทติวเตอร์ไทย (ฟอนต์ Sarabun, แถบหัวบทสี, กล่องหลักคิด/ระวัง/ตรวจสอบ, ดาวไล่สีตามความยาก)
// หมายเหตุ: มีเฉลยท้ายชีท — เจ้าของตัดสินใจเองว่าจะแจกทั้งชีทหรือตัดหน้าเฉลยออก

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";
import { marked } from "marked";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const Q_DIR = path.join(ROOT, "content", "questions");
const L_DIR = path.join(ROOT, "content", "lessons");
const OUT_DIR = path.join(ROOT, "docs", "worksheets");

const TOPICS = [
  { n: 1, name: "ทักษะพื้นฐานปฏิบัติการเคมี", lesson: "01-lab-basics.md" },
  { n: 2, name: "โครงสร้างอะตอม", lesson: "02-atomic-structure.md" },
  { n: 3, name: "ตารางธาตุและสมบัติของธาตุ", lesson: "03-periodic-table.md" },
  { n: 4, name: "พันธะเคมี", lesson: "04-chemical-bonding.md" },
  { n: 5, name: "โมลและปริมาณสารสัมพันธ์", lesson: "05-mole-stoichiometry.md" },
  { n: 6, name: "แก๊สและสมบัติของแก๊ส", lesson: "06-gases.md" },
  { n: 7, name: "สารละลาย", lesson: "07-solutions.md" },
  { n: 8, name: "ของแข็งและของเหลว", lesson: "08-solids-liquids.md" },
];
const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];
const DIFFICULTY_COLOR = ["", "#16a34a", "#65a30d", "#ca8a04", "#ea580c", "#dc2626"];

const subtopicOrder = JSON.parse(
  fs.readFileSync(path.join(ROOT, "content", "subtopics.json"), "utf8")
);

// จัดกล่องเน้นความสำคัญ (หลักคิด/ขั้นที่/ตรวจสอบ/ระวัง/ตอบ) จากรูปแบบ **ป้าย:** ที่ใช้ในเนื้อหาจริง
function styleCallouts(html) {
  return html.replace(/<p><strong>([^<]{1,50})<\/strong>/g, (whole, rawLabel) => {
    const label = rawLabel.replace(/[:：]\s*$/, "").trim();
    if (label === "ตอบ") {
      return `<p class="cal cal-answer"><strong>${rawLabel}</strong>`;
    }
    // ตัวอย่างโจทย์/วิธีทำ — ไม่มีกล่องสี แค่คุมจังหวะขึ้นหน้าใหม่ (กันฉีกจากคำตอบ)
    if (/^ตัวอย่างโจทย์/.test(label)) {
      return `<p class="cal cal-example"><strong>${rawLabel}</strong>`;
    }
    if (label === "วิธีทำ") {
      return `<p class="cal cal-method"><strong>${rawLabel}</strong>`;
    }
    const stepMatch = label.match(/^ขั้นที่\s*\d+/);
    if (stepMatch) {
      const num = label.match(/\d+/)[0];
      return `<p class="cal cal-step"><span class="step-badge">${num}</span> <strong>${rawLabel}</strong>`;
    }
    if (/หลักคิด|วิธีคิด|หลักการ|นิยาม|สูตรลัด|วิธีจำ|เกร็ดเพิ่ม/.test(label)) {
      return `<p class="cal cal-info"><strong>${rawLabel}</strong>`;
    }
    if (/ตรวจสอบ|^ตรวจ|สรุป|สังเกต|ข้อสังเกต/.test(label)) {
      return `<p class="cal cal-check"><strong>${rawLabel}</strong>`;
    }
    if (/ระวัง|ตัวลวง/.test(label)) {
      return `<p class="cal cal-warn"><strong>${rawLabel}</strong>`;
    }
    return whole;
  });
}

// รวมช่วง "ตัวอย่างโจทย์ ... → วิธีทำ → ตอบ" เป็นก้อนเดียวกันไม่ให้พิมพ์ตัดหน้ากลางคัน
// สแกนหา cal-example แต่ละจุด แล้วหาจุดจบที่ใกล้ที่สุด (กล่องตอบ / ตัวอย่างถัดไป / หัวข้อถัดไป)
function wrapWorkedExamples(html) {
  const START = '<p class="cal cal-example">';
  const ANSWER_RE = /<p class="cal cal-answer">[\s\S]*?<\/p>/;
  const NEXT_EXAMPLE_RE = /<p class="cal cal-example">/;
  const NEXT_HEADING_RE = /<h[1-6][ >]/;

  let out = "";
  let cursor = 0;
  while (true) {
    const startIdx = html.indexOf(START, cursor);
    if (startIdx === -1) {
      out += html.slice(cursor);
      break;
    }
    out += html.slice(cursor, startIdx);
    const afterOpen = startIdx + START.length;
    const rest = html.slice(afterOpen);

    const answerMatch = rest.match(ANSWER_RE);
    const nextExampleMatch = rest.match(NEXT_EXAMPLE_RE);
    const nextHeadingMatch = rest.match(NEXT_HEADING_RE);
    const candidates = [answerMatch, nextExampleMatch, nextHeadingMatch]
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);

    let endInRest;
    if (candidates[0] === answerMatch) {
      // เจอกล่องตอบก่อน — ห่อรวมถึงกล่องตอบพอดี
      endInRest = answerMatch.index + answerMatch[0].length;
    } else if (candidates.length > 0) {
      // เจอตัวอย่างถัดไป/หัวข้อถัดไปก่อนโดยไม่มีกล่องตอบ — ห่อแค่ย่อหน้าเปิดเรื่อง กันเผลอรวมข้ามตัวอย่าง
      endInRest = rest.indexOf("</p>") + 4;
    } else {
      // ไม่เจออะไรเลย (ตัวอย่างสุดท้ายของไฟล์) — ห่อจนจบเนื้อหา
      endInRest = rest.length;
    }

    const block = START + rest.slice(0, endInRest);
    out += `<div class="worked-example">${block}</div>`;
    cursor = afterOpen + endInRest;
  }
  return out;
}

// placeholder ต้องไม่มีช่องว่าง — เซลล์ตารางของ marked จะ trim ช่องว่างรอบเซลล์ทิ้ง
// ถ้าใช้ " M0 " (มีช่องว่าง) แบบเดิม จะแทนคืนไม่เจอเมื่อ math อยู่ในตาราง (เหลือ "M0" ค้างเป็นข้อความดิบ)
const MATH_TOKEN = (i) => `@@MATH${i}@@`;
const MATH_TOKEN_RE = /@@MATH(\d+)@@/g;

function maskMath(text) {
  const maths = [];
  const masked = text.replace(
    /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g,
    (_, disp, inline) => {
      maths.push(
        katex.renderToString(disp ?? inline, {
          throwOnError: false,
          strict: "ignore",
          displayMode: disp !== undefined,
        })
      );
      return MATH_TOKEN(maths.length - 1);
    }
  );
  return { masked, maths };
}

// เรนเดอร์ markdown + math: กัน math ออกก่อนด้วย placeholder แล้วค่อยคืนหลัง marked
function renderMd(md) {
  const { masked, maths } = maskMath(md);
  let html = marked.parse(masked, { gfm: true, breaks: false });
  html = html.replace(MATH_TOKEN_RE, (_, i) => maths[Number(i)]);
  html = styleCallouts(html);
  // รูปในบทเรียนชี้ /images/... → ชี้ relative ไป public/ เพื่อเปิดจากไฟล์ตรงได้
  return html.replaceAll('src="/images/', 'src="../../public/images/');
}

// ใช้เฉพาะเนื้อหาบทเรียน (ไม่ใช่โจทย์/เฉลย) — ห่อ "ตัวอย่างโจทย์...→วิธีทำ→ตอบ" กันฉีกหน้า
function renderLessonMd(md) {
  return wrapWorkedExamples(renderMd(md));
}

// อ่านโจทย์ทุกไฟล์ จัดกลุ่มตามหมวด
const byTopic = new Map(TOPICS.map((t) => [t.name, []]));
for (const file of fs.readdirSync(Q_DIR).filter((f) => f.endsWith(".json"))) {
  for (const q of JSON.parse(fs.readFileSync(path.join(Q_DIR, file), "utf8"))) {
    byTopic.get(q.topic)?.push(q);
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const learnMap = JSON.parse(
  fs.readFileSync(path.join(ROOT, "content", "learn-map.json"), "utf8")
);

function splitSections(md) {
  const sections = [];
  let current = null;
  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { heading: line.slice(3).trim(), body: line + "\n" };
    } else if (current) {
      current.body += line + "\n";
    } else {
      // ส่วนก่อนหัวข้อแรก (ชื่อบท/คำนำ) — เก็บเป็น intro
      sections.push({ heading: "__intro__", body: (sections.pop()?.body ?? "") + line + "\n" });
    }
  }
  if (current) sections.push(current);
  return sections;
}

// เรนเดอร์แบบ inline (ไม่ห่อ <p>) สำหรับตัวเลือก — ป้าย ก. อยู่บรรทัดเดียวกับข้อความ
function renderMdInline(text) {
  const { masked, maths } = maskMath(text);
  let html = marked.parseInline(masked, { gfm: true });
  return html.replace(MATH_TOKEN_RE, (_, i) => maths[Number(i)]);
}

function renderExercise(q, num) {
  // ตัวเลือกสั้นทุกตัว → จัด 2 คอลัมน์ ประหยัดพื้นที่แบบหนังสือ
  const allShort = q.choices.every((c) => c.length <= 30 && !c.includes("\n"));
  const choices = q.choices
    .map(
      (c, ci) =>
        `<li><span class="cl">${CHOICE_LABELS[ci]}.</span> ${renderMdInline(c)}</li>`
    )
    .join("");
  const color = DIFFICULTY_COLOR[q.difficulty] ?? DIFFICULTY_COLOR[3];
  return `<div class="ex">
    <p class="qh"><span class="qnum">ข้อ ${num}</span><span class="stars" style="color:${color}">${"★".repeat(q.difficulty)}<span class="stars-off">${"★".repeat(Math.max(0, 5 - q.difficulty))}</span></span>${q.style ? `<span class="style-tag">แนว ${q.style}</span>` : ""}</p>
    <div class="stem">${renderMd(q.stem)}</div>
    <ol class="choices${allShort ? " cols2" : ""}">${choices}</ol>
  </div>`;
}

for (const topic of TOPICS) {
  const lessonPath = path.join(L_DIR, topic.lesson);
  const lessonMd = fs.existsSync(lessonPath)
    ? fs.readFileSync(lessonPath, "utf8")
    : "";
  const stOrder = (subtopicOrder[topic.name] ?? []).map((s) => s.subtopic);
  const pool = [...(byTopic.get(topic.name) ?? [])];
  const mapSteps = Array.isArray(learnMap[String(topic.n)])
    ? learnMap[String(topic.n)]
    : null;

  let bodyHtml = "";
  const ordered = []; // ลำดับข้อสุดท้าย (ไว้ทำเฉลยท้ายบท)

  if (mapSteps && lessonMd) {
    // ── สไตล์หนังสือติว: สอนช่วงสั้น → แบบฝึกหัดของช่วงนั้นทันที ──
    const sections = splitSections(lessonMd);
    const used = new Set();
    bodyHtml = mapSteps
      .map((step, si) => {
        const body = step.headings
          .map((p) => sections.find((s) => s.heading.startsWith(p))?.body ?? "")
          .filter(Boolean)
          .join("\n");
        const stepPool = pool
          .filter(
            (q) => step.subtopics.includes(q.subtopic ?? "") && !used.has(q)
          )
          .sort((a, b) => a.difficulty - b.difficulty);
        const take =
          step.drill >= stepPool.length ? stepPool : stepPool.slice(0, step.drill);
        take.forEach((q) => used.add(q));
        const exHtml = take
          .map((q) => {
            ordered.push(q);
            return renderExercise(q, ordered.length);
          })
          .join("\n");
        return `<section class="step">
          <h2 class="step-head"><span class="step-num">${si + 1}</span>${step.title}</h2>
          ${body ? renderLessonMd(body) : step.note ? `<p class="note">${step.note}</p>` : ""}
          ${take.length ? `<div class="drill"><p class="drill-head">✏️ ฝึกทันที ${take.length} ข้อ (ง่าย→ยาก)</p>${exHtml}</div>` : ""}
        </section>`;
      })
      .join("\n");
    // โจทย์ตกค้างที่ไม่ตรง step ใด (กันหล่น)
    const leftover = pool.filter((q) => !used.has(q));
    if (leftover.length) {
      const exHtml = leftover
        .sort((a, b) => a.difficulty - b.difficulty)
        .map((q) => {
          ordered.push(q);
          return renderExercise(q, ordered.length);
        })
        .join("\n");
      bodyHtml += `<section class="step"><h2 class="step-head"><span class="step-num">+</span>แบบฝึกหัดเพิ่มเติม</h2><div class="drill">${exHtml}</div></section>`;
    }
  } else {
    // ── แบบเดิม (บทที่ยังไม่มี learn-map): บทเรียนเต็ม แล้วแบบฝึกหัดท้ายบท ──
    const qs = pool.sort((a, b) => {
      const sa = stOrder.indexOf(a.subtopic ?? "");
      const sb = stOrder.indexOf(b.subtopic ?? "");
      if (sa !== sb) return sa - sb;
      return a.difficulty - b.difficulty;
    });
    let currentSub = null;
    const exercises = qs
      .map((q) => {
        ordered.push(q);
        let head = "";
        if (q.subtopic !== currentSub) {
          currentSub = q.subtopic;
          head = `<h3 class="sub">${currentSub ?? "อื่น ๆ"}</h3>`;
        }
        return head + renderExercise(q, ordered.length);
      })
      .join("\n");
    bodyHtml = `${lessonMd ? renderLessonMd(lessonMd) : "<p>(ยังไม่มีบทเรียน)</p>"}
<h2>✏️ แบบฝึกหัดท้ายบท (${qs.length} ข้อ — เรียงตามหัวข้อ ง่าย→ยาก)</h2>
${exercises}`;
  }

  const key = ordered
    .map((q, i) => `<span class="k">${i + 1}. ${CHOICE_LABELS[q.correct_index]}</span>`)
    .join(" ");

  const solutions = ordered
    .map(
      (q, i) => `<div class="sol">
      <p class="sol-head">ข้อ ${i + 1} — ตอบ ${CHOICE_LABELS[q.correct_index]}. ${renderMd(q.choices[q.correct_index])}</p>
      ${renderMd(q.explanation)}
    </div>`
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ชีทบทที่ ${topic.n} ${topic.name} — ติวเคมี สอวน. ค่าย 1</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css"/>
<style>
  :root {
    --brand: #0d9488; --brand-dark: #115e59; --brand-light: #f0fdfa; --brand-tint: #ccfbf1;
    --info: #2563eb; --info-bg: #eff6ff;
    --check: #059669; --check-bg: #ecfdf5;
    --warn: #ea580c; --warn-bg: #fff7ed;
  }
  * { box-sizing: border-box; }
  body { font-family: 'Sarabun', 'Noto Sans Thai', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1e293b; line-height: 1.75; font-size: 15px; }
  h1 { font-size: 1.5rem; margin: 0; color: #fff; }
  h2 { font-size: 1.12rem; margin-top: 2rem; color: var(--brand-dark); }
  h3 { font-size: 1.02rem; }
  h3.sub { margin-top: 1.8rem; color: var(--brand-dark); border-left: 4px solid var(--brand); padding-left: 8px; }
  /* ตารางยาวปล่อยให้ไหลข้ามหน้าได้ (ไม่บังคับอยู่หน้าเดียวทั้งก้อน กันหน้าว่างเปล่า) —
     แต่หัวตารางย้ำซ้ำทุกหน้าที่ตัด และห้ามตัดกลางแถว */
  table { border-collapse: collapse; width: 100%; font-size: 13.5px; break-inside: auto; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th, td { border: 1px solid #d1e7e5; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: var(--brand); color: #fff; font-weight: 600; }
  tr:nth-child(even) td { background: var(--brand-light); }
  img { max-width: 100%; }

  /* ── หัวกระดาษ (cover band) ── */
  .cover { display: flex; align-items: center; gap: 18px; background: linear-gradient(135deg, var(--brand-dark), var(--brand)); border-radius: 16px; padding: 18px 24px; margin-bottom: 8px; }
  .cover .num { flex-shrink: 0; width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,.16); border: 2px solid rgba(255,255,255,.55); display: flex; align-items: center; justify-content: center; font-size: 1.7rem; font-weight: 800; color: #fff; }
  .cover .cov-sub { margin: 4px 0 0; font-size: .82rem; color: #ccfbf1; }
  .draftnote { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; border-radius: 8px; padding: 7px 14px; font-size: .8rem; margin: 10px 0 20px; }

  /* ── ช่วงสอน+ฝึก ── */
  .ex { margin: 10px 0 12px; break-inside: avoid; border-bottom: 1px dotted #d1e7e5; padding-bottom: 8px; }
  .ex:last-child { border-bottom: none; }
  .stem p { margin: 2px 0 4px; }
  .step { margin-top: 1.2rem; }
  .step-head { display: flex; align-items: center; gap: 10px; background: var(--brand-light); border-radius: 8px; padding: 8px 14px; break-after: avoid; color: var(--brand-dark); }
  .step-num { flex-shrink: 0; width: 1.7em; height: 1.7em; border-radius: 50%; background: var(--brand); color: #fff; font-size: .85em; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
  .drill { border-left: 3px solid var(--brand-tint); padding: 2px 0 2px 14px; margin-top: 8px; }
  .drill-head { font-weight: 700; color: var(--brand-dark); margin: 6px 0 2px; break-after: avoid; }
  .note { background: var(--warn-bg); border-radius: 8px; padding: 8px 12px; font-size: .9rem; color: #9a3412; }
  .qh { margin: 0 0 2px; display: flex; align-items: baseline; gap: 10px; }
  .qnum { font-weight: 700; }
  .stars { font-size: .85rem; letter-spacing: 1px; }
  .stars-off { color: #e2e8f0; }
  .style-tag { background: #fef3c7; color: #92400e; font-size: .68rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; margin-left: auto; }
  ol.choices { list-style: none; padding-left: 1.2em; margin: 4px 0; }
  ol.choices.cols2 { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; row-gap: 2px; }
  ol.choices li { margin: 3px 0; line-height: 1.55; }
  ol.choices li p { display: inline; margin: 0; }
  .cl { font-weight: 700; margin-right: 5px; color: var(--brand-dark); }
  .stem > p { margin: 2px 0; }

  /* ── กล่องเน้น (หลักคิด/ขั้นที่/ตรวจสอบ/ระวัง/ตอบ) ── */
  .cal { border-radius: 6px; padding: 6px 12px; margin: 8px 0 !important; }
  .cal-info { background: var(--info-bg); border-left: 4px solid var(--info); }
  .cal-info strong { color: var(--info); }
  .cal-check { background: var(--check-bg); border-left: 4px solid var(--check); }
  .cal-check strong { color: var(--check); }
  .cal-warn { background: var(--warn-bg); border-left: 4px solid var(--warn); }
  .cal-warn strong { color: var(--warn); }
  .cal-step { border-left: 3px solid var(--brand); padding-left: 10px; }
  .step-badge { display: inline-flex; align-items: center; justify-content: center; width: 1.4em; height: 1.4em; border-radius: 50%; background: var(--brand); color: #fff; font-size: .72em; font-weight: 700; }
  .cal-answer { background: var(--brand-light); border: 2px solid var(--brand-tint); border-radius: 10px; padding: 8px 14px; }
  .cal-answer strong { color: var(--brand-dark); font-size: 1.05em; }
  .cal-example { border-top: 2px dashed var(--brand-tint); padding: 12px 0 0; margin-top: 22px !important; }
  .cal-example strong { color: var(--brand-dark); }
  .cal-method { margin: 10px 0 4px !important; }
  /* กันพิมพ์ตัดหน้ากลาง "ตัวอย่างโจทย์ → วิธีทำ → ตอบ" (จัดกลุ่มไว้ตอน build ด้วย wrapWorkedExamples) */
  .worked-example { break-inside: avoid; }

  /* ── ท้ายเล่ม: เฉลยย่อ / เฉลยละเอียด ── */
  .keybox { margin-top: 3rem; border: 2px dashed #99f6e4; border-radius: 10px; padding: 14px 18px; }
  .keybox .k { display: inline-block; min-width: 3.6em; padding: 3px 6px; margin: 2px; background: var(--brand-light); border: 1px solid var(--brand-tint); border-radius: 6px; font-size: .85em; text-align: center; }
  .katex-display { overflow-x: auto; }
  .pdfbtn { position: fixed; bottom: 20px; right: 20px; z-index: 50;
    background: var(--brand); color: #fff; border: none; border-radius: 999px;
    padding: 14px 22px; font-size: 16px; font-weight: 700; font-family: inherit;
    box-shadow: 0 4px 14px rgba(13,148,136,.45); cursor: pointer; }
  .pdfbtn:active { transform: scale(.97); }
  .sol { border-bottom: 1px dashed #d1e7e5; padding: 8px 0; break-inside: avoid; font-size: .93em; }
  .sol-head { font-weight: 700; color: var(--check); background: var(--check-bg); border-radius: 6px; padding: 4px 10px; display: inline-block; }
  .solbox h2 { border-bottom: 2px solid var(--check); padding-bottom: 4px; }
  @media print {
    .pdfbtn { display: none; }
    .keybox { break-before: page; }
    .solbox { break-before: page; }
    .step { break-before: page; }
    .step:first-of-type { break-before: auto; }
    body { font-size: 13px; }
  }
</style>
</head>
<body>
<button class="pdfbtn" onclick="window.print()">🖨️ บันทึกเป็น PDF</button>
<header class="cover">
  <div class="num">${topic.n}</div>
  <div>
    <h1>${topic.name}</h1>
    <p class="cov-sub">ชีทเรียน+แบบฝึกหัด · ติวเคมี สอวน. ค่าย 1${mapSteps ? " · สอนสลับฝึกทีละช่วง" : ""}</p>
  </div>
</header>
<p class="draftnote">✏️ แบบฝึกหัดเรียงตามหัวข้อจากง่ายไปยาก (ดาวสีบอกระดับความยาก) · เฉลยย่อ+เฉลยละเอียดอยู่ท้ายเล่ม · ฉบับร่าง — รอเจ้าของรีวิว</p>
${bodyHtml}
<div class="keybox">
  <h2 style="margin-top:0">เฉลยย่อ บทที่ ${topic.n}</h2>
  ${key}
</div>
<div class="solbox">
  <h2>เฉลยละเอียด บทที่ ${topic.n}</h2>
  ${solutions}
</div>
</body>
</html>`;

  const out = path.join(OUT_DIR, `ch${String(topic.n).padStart(2, "0")}.html`);
  fs.writeFileSync(out, html);
  console.log(
    `✓ ${path.relative(ROOT, out)} — ${mapSteps ? "สอนสลับฝึก " + mapSteps.length + " ช่วง" : "บทเรียน+ท้ายบท"} · ${ordered.length} ข้อ`
  );
}
