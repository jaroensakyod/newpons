// นำเข้าข้อสอบจาก content/questions/*.json เข้า Supabase
// ใช้: npm run import:questions            → ข้ามหมวดที่มีข้อสอบอยู่แล้ว
//      npm run import:questions -- --replace → ลบข้อสอบเดิมของหมวดในไฟล์ก่อนแล้วลงใหม่
//        (คำเตือน: --replace จะลบ attempts ของข้อเดิมไปด้วยเพราะ cascade)
// ต้องมีใน .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "content", "questions");
const REPLACE = process.argv.includes("--replace");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "ต้องตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local ก่อน\n" +
      "(service role key อยู่ที่ Dashboard → Project Settings → API)"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- โหลดและตรวจขั้นต้น ----
const files = fs.existsSync(DIR)
  ? fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()
  : [];
if (files.length === 0) {
  console.error("ไม่พบไฟล์ .json ใน content/questions");
  process.exit(1);
}

const all = [];
for (const file of files) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
  } catch (e) {
    console.error(`${file}: JSON parse ไม่ผ่าน → ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error(`${file}: ต้องเป็น JSON array`);
    process.exit(1);
  }
  data.forEach((q, i) => {
    const bad =
      typeof q.topic !== "string" ||
      typeof q.stem !== "string" ||
      !Array.isArray(q.choices) ||
      q.choices.length !== 4 ||
      !Number.isInteger(q.correct_index) ||
      q.correct_index < 0 ||
      q.correct_index > 3 ||
      typeof q.explanation !== "string" ||
      !Number.isInteger(q.difficulty) ||
      q.difficulty < 1 ||
      q.difficulty > 5;
    if (bad) {
      console.error(
        `${file}[${i}]: ข้อมูลไม่ครบ/ผิดรูปแบบ — รัน npm run validate:questions เพื่อดูรายละเอียด`
      );
      process.exit(1);
    }
    all.push(q);
  });
}

// ---- จับคู่ชื่อหมวด → topic_id ----
const { data: topics, error: topicErr } = await supabase
  .from("topics")
  .select("id, name");
if (topicErr) {
  console.error("อ่านตาราง topics ไม่ได้:", topicErr.message);
  console.error("รัน supabase/schema.sql ใน SQL Editor แล้วหรือยัง?");
  process.exit(1);
}
const topicIdByName = new Map(topics.map((t) => [t.name, t.id]));

const unknown = [...new Set(all.map((q) => q.topic))].filter(
  (name) => !topicIdByName.has(name)
);
if (unknown.length) {
  console.error("พบชื่อหมวดที่ไม่มีในตาราง topics:", unknown.join(", "));
  process.exit(1);
}

// ---- จัดกลุ่มต่อหมวด แล้วนำเข้า ----
const byTopic = new Map();
for (const q of all) {
  const id = topicIdByName.get(q.topic);
  if (!byTopic.has(id)) byTopic.set(id, []);
  byTopic.get(id).push(q);
}

let inserted = 0;
for (const [topicId, qs] of byTopic) {
  const topicName = topics.find((t) => t.id === topicId).name;

  const { count, error: countErr } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topicId);
  if (countErr) {
    console.error(`นับข้อสอบหมวด "${topicName}" ไม่ได้:`, countErr.message);
    process.exit(1);
  }

  if (count > 0 && !REPLACE) {
    console.log(
      `⏭  "${topicName}" มีอยู่แล้ว ${count} ข้อ — ข้าม (ใช้ --replace ถ้าต้องการลงใหม่)`
    );
    continue;
  }
  if (count > 0 && REPLACE) {
    const { error: delErr } = await supabase
      .from("questions")
      .delete()
      .eq("topic_id", topicId);
    if (delErr) {
      console.error(`ลบข้อสอบเดิมหมวด "${topicName}" ไม่ได้:`, delErr.message);
      process.exit(1);
    }
    console.log(`🗑  ลบข้อสอบเดิมหมวด "${topicName}" ${count} ข้อ`);
  }

  const rows = qs.map((q) => ({
    topic_id: topicId,
    stem: q.stem,
    choices: q.choices,
    correct_index: q.correct_index,
    explanation: q.explanation,
    difficulty: q.difficulty,
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error: insErr } = await supabase.from("questions").insert(chunk);
    if (insErr) {
      console.error(`นำเข้าหมวด "${topicName}" ล้มเหลว:`, insErr.message);
      process.exit(1);
    }
    inserted += chunk.length;
  }
  console.log(`✓ นำเข้า "${topicName}" ${rows.length} ข้อ`);
}

console.log(`\nเสร็จสิ้น — นำเข้าใหม่ ${inserted} ข้อ`);
