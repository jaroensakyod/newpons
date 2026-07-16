// ตรวจไฟล์ข้อสอบใน content/questions/*.json ก่อนนำเข้า:
// schema ครบ, ตัวเลือก 4 ตัวไม่ซ้ำกัน, LaTeX เรนเดอร์ผ่าน KaTeX ได้จริง
// ใช้: npm run validate:questions

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "content", "questions");

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

const SUBTOPICS_FILE = path.join(ROOT, "content", "subtopics.json");
const subtopicsData = fs.existsSync(SUBTOPICS_FILE)
  ? JSON.parse(fs.readFileSync(SUBTOPICS_FILE, "utf8"))
  : {};
// map: topic name -> Set ของชื่อ subtopic ที่รับได้
const canonicalSubtopicsByTopic = new Map(
  CANONICAL_TOPICS.map((t) => [
    t,
    new Set((subtopicsData[t] ?? []).map((s) => s.subtopic)),
  ])
);
const LADDER_RUNGS = [1, 2, 3, 4, 5];

const errors = [];
const warnings = [];

function checkLatex(text, where) {
  // ดึงทั้ง $$...$$ และ $...$ มาลองเรนเดอร์จริง
  const mathRe = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let m;
  while ((m = mathRe.exec(text)) !== null) {
    const expr = m[1] ?? m[2];
    if (/[฀-๿]/.test(expr)) {
      errors.push(`${where}: มีอักษรไทยใน math mode: $${expr}$`);
      continue;
    }
    try {
      katex.renderToString(expr, { throwOnError: true, strict: "ignore" });
    } catch (e) {
      errors.push(`${where}: KaTeX เรนเดอร์ไม่ผ่าน: $${expr}$ → ${e.message}`);
    }
  }
  // เครื่องหมาย $ ต้องเป็นจำนวนคู่
  const dollarCount = (text.match(/\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    errors.push(`${where}: เครื่องหมาย $ ไม่เป็นคู่ (${dollarCount} ตัว)`);
  }
}

if (!fs.existsSync(DIR)) {
  console.error(`ไม่พบโฟลเดอร์ ${DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
if (files.length === 0) {
  console.error("ไม่พบไฟล์ .json ใน content/questions");
  process.exit(1);
}

const stemsSeen = new Map();
const perTopic = new Map();
const ladderSeen = new Map(); // "topic|||subtopic" -> Set<difficulty>
let totalQuestions = 0;

for (const file of files) {
  const fullPath = path.join(DIR, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (e) {
    errors.push(`${file}: JSON parse ไม่ผ่าน → ${e.message}`);
    continue;
  }
  if (!Array.isArray(data)) {
    errors.push(`${file}: ต้องเป็น JSON array`);
    continue;
  }

  data.forEach((q, i) => {
    const where = `${file}[${i}]`;
    totalQuestions++;

    if (!q || typeof q !== "object") {
      errors.push(`${where}: ไม่ใช่ object`);
      return;
    }
    if (!CANONICAL_TOPICS.includes(q.topic)) {
      errors.push(`${where}: topic "${q.topic}" ไม่ตรงกับ 6 หมวดมาตรฐาน`);
    } else {
      perTopic.set(q.topic, (perTopic.get(q.topic) ?? 0) + 1);

      if (q.subtopic === undefined) {
        warnings.push(`${where}: ยังไม่มี subtopic (ข้อสอบเก่ารอแท็ก)`);
      } else if (typeof q.subtopic !== "string" || !canonicalSubtopicsByTopic.get(q.topic)?.has(q.subtopic)) {
        errors.push(
          `${where}: subtopic "${q.subtopic}" ไม่ตรงกับ canonical list ของหมวด "${q.topic}" (ดู content/subtopics.json)`
        );
      } else {
        const key = `${q.topic}|||${q.subtopic}`;
        if (!ladderSeen.has(key)) ladderSeen.set(key, new Set());
        ladderSeen.get(key).add(q.difficulty);
      }
    }
    if (typeof q.stem !== "string" || q.stem.trim().length < 10) {
      errors.push(`${where}: stem ว่างหรือสั้นผิดปกติ`);
    }
    if (
      !Array.isArray(q.choices) ||
      q.choices.length !== 4 ||
      q.choices.some((c) => typeof c !== "string" || c.trim() === "")
    ) {
      errors.push(`${where}: choices ต้องเป็น string 4 ตัวที่ไม่ว่าง`);
    } else {
      const trimmed = q.choices.map((c) => c.trim());
      if (new Set(trimmed).size !== 4) {
        errors.push(`${where}: มีตัวเลือกซ้ำกัน`);
      }
    }
    if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index > 3) {
      errors.push(`${where}: correct_index ต้องเป็น int 0-3 (ได้ ${q.correct_index})`);
    }
    if (typeof q.explanation !== "string" || q.explanation.trim().length < 10) {
      errors.push(`${where}: explanation ว่างหรือสั้นผิดปกติ`);
    }
    if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 5) {
      errors.push(`${where}: difficulty ต้องเป็น int 1-5 (ได้ ${q.difficulty})`);
    }

    if (typeof q.stem === "string") {
      const key = q.stem.trim();
      if (stemsSeen.has(key)) {
        warnings.push(`${where}: stem ซ้ำกับ ${stemsSeen.get(key)}`);
      } else {
        stemsSeen.set(key, where);
      }
      checkLatex(q.stem, `${where}.stem`);
    }
    if (typeof q.explanation === "string") checkLatex(q.explanation, `${where}.explanation`);
    if (Array.isArray(q.choices)) {
      q.choices.forEach((c, ci) => {
        if (typeof c === "string") checkLatex(c, `${where}.choices[${ci}]`);
      });
    }
  });
}

// ---- ตรวจความครบของบันได (ทุก subtopic ต้องมีข้อครบ difficulty 1-5) ----
const LADDER_MODE = process.argv.includes("--ladder");
const ladderGaps = [];
for (const [topic, subtopics] of Object.entries(subtopicsData)) {
  if (topic.startsWith("_")) continue;
  for (const { subtopic } of subtopics) {
    const key = `${topic}|||${subtopic}`;
    const have = ladderSeen.get(key) ?? new Set();
    const missing = LADDER_RUNGS.filter((r) => !have.has(r));
    if (missing.length) {
      ladderGaps.push(`${topic} > ${subtopic}: ขาดระดับ ${missing.join(", ")}`);
    }
  }
}
if (ladderGaps.length) {
  const bucket = LADDER_MODE ? errors : warnings;
  bucket.push(`บันไดยังไม่ครบ ${ladderGaps.length} subtopic:`);
  ladderGaps.forEach((g) => bucket.push("  " + g));
}

console.log("── สรุปจำนวนข้อต่อหมวด ──");
for (const t of CANONICAL_TOPICS) {
  console.log(`  ${t}: ${perTopic.get(t) ?? 0} ข้อ`);
}
console.log(`  รวม ${totalQuestions} ข้อ จาก ${files.length} ไฟล์`);

if (warnings.length) {
  console.log(`\n⚠ คำเตือน ${warnings.length} รายการ:`);
  warnings.forEach((w) => console.log("  - " + w));
}
if (errors.length) {
  console.error(`\n✗ พบข้อผิดพลาด ${errors.length} รายการ:`);
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log("\n✓ ผ่านทุกการตรวจ — พร้อมนำเข้า (npm run import:questions)");
