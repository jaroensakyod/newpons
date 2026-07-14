// ตรวจไฟล์บทเรียนใน content/lessons ก่อนนำเข้า:
// ครบ 6 ไฟล์, LaTeX เรนเดอร์ผ่าน KaTeX, ไม่มีอักษรไทยใน math mode,
// videos.json (ถ้ามี) ต้องเป็น YouTube URL ที่รูปแบบถูกต้อง
// ใช้: npm run validate:lessons

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "content", "lessons");

const EXPECTED_FILES = [
  "01-lab-basics.md",
  "02-atomic-structure.md",
  "03-periodic-table.md",
  "04-chemical-bonding.md",
  "05-mole-stoichiometry.md",
  "06-gases.md",
  "07-solutions.md",
  "08-solids-liquids.md",
];

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

const errors = [];
const warnings = [];

function checkLatex(text, where) {
  const mathRe = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let m;
  let count = 0;
  while ((m = mathRe.exec(text)) !== null) {
    const expr = m[1] ?? m[2];
    count++;
    if (/[฀-๿]/.test(expr)) {
      errors.push(`${where}: อักษรไทยใน math mode: $${expr.slice(0, 60)}$`);
      continue;
    }
    try {
      katex.renderToString(expr, { throwOnError: true, strict: "ignore" });
    } catch (e) {
      errors.push(
        `${where}: KaTeX เรนเดอร์ไม่ผ่าน: $${expr.slice(0, 60)}$ → ${e.message}`
      );
    }
  }
  return count;
}

if (!fs.existsSync(DIR)) {
  console.error(`ไม่พบโฟลเดอร์ ${DIR}`);
  process.exit(1);
}

for (const file of EXPECTED_FILES) {
  const fullPath = path.join(DIR, file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`ไม่พบไฟล์ ${file}`);
    continue;
  }
  const text = fs.readFileSync(fullPath, "utf8");
  const words = text.replace(/\s+/g, " ").length;
  const mathCount = checkLatex(text, file);
  const h2Count = (text.match(/^## /gm) || []).length;

  if (!text.trimStart().startsWith("# ")) {
    warnings.push(`${file}: ไม่ได้ขึ้นต้นด้วย # heading`);
  }
  if (h2Count < 3) {
    warnings.push(`${file}: มีแค่ ${h2Count} หัวข้อย่อย (## ) — น้อยผิดปกติ`);
  }
  if (words < 2000) {
    warnings.push(`${file}: สั้นผิดปกติ (~${words} ตัวอักษร)`);
  }
  console.log(
    `  ${file}: ~${Math.round(words / 1000)}k ตัวอักษร, ${h2Count} หัวข้อ, ${mathCount} สมการ`
  );
}

// ---- videos.json ----
const videosPath = path.join(DIR, "videos.json");
if (fs.existsSync(videosPath)) {
  try {
    const videos = JSON.parse(fs.readFileSync(videosPath, "utf8"));
    for (const [topicName, list] of Object.entries(videos)) {
      if (!CANONICAL_TOPICS.includes(topicName)) {
        errors.push(`videos.json: หมวด "${topicName}" ไม่ตรง 6 หมวดมาตรฐาน`);
      }
      if (!Array.isArray(list)) {
        errors.push(`videos.json["${topicName}"]: ต้องเป็น array`);
        continue;
      }
      list.forEach((v, i) => {
        if (typeof v.url !== "string" || typeof v.title !== "string") {
          errors.push(`videos.json["${topicName}"][${i}]: ต้องมี url และ title`);
          return;
        }
        if (!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(v.url)) {
          errors.push(
            `videos.json["${topicName}"][${i}]: ไม่ใช่ YouTube URL: ${v.url}`
          );
        }
      });
      console.log(`  🎬 ${topicName}: ${list.length} คลิป`);
    }
  } catch (e) {
    errors.push(`videos.json: parse ไม่ผ่าน → ${e.message}`);
  }
} else {
  warnings.push("ไม่พบ videos.json — บทเรียนจะไม่มีคลิปประกอบ (ไม่บังคับ)");
}

if (warnings.length) {
  console.log(`\n⚠ คำเตือน ${warnings.length} รายการ:`);
  warnings.forEach((w) => console.log("  - " + w));
}
if (errors.length) {
  console.error(`\n✗ พบข้อผิดพลาด ${errors.length} รายการ:`);
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log("\n✓ ผ่านทุกการตรวจ — พร้อมนำเข้า (npm run import:lessons)");
