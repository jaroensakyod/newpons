// นำเข้าบทเรียนจาก content/lessons/NN-*.md + videos.json เข้า Supabase (ตาราง contents)
// รันซ้ำได้ — upsert ทับของเดิมต่อหมวด (ไม่กระทบ attempts)
// ใช้: npm run import:lessons
// ต้องมีใน .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "content", "lessons");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "ต้องตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local ก่อน"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- อ่านหมวดจาก DB (map เลขลำดับไฟล์ NN → topic ตาม "order") ----
const { data: topics, error: topicErr } = await supabase
  .from("topics")
  .select('id, name, "order"');
if (topicErr) {
  console.error("อ่านตาราง topics ไม่ได้:", topicErr.message);
  process.exit(1);
}
const topicByOrder = new Map(topics.map((t) => [t.order, t]));

// ---- videos.json (ไม่บังคับ) ----
let videosByTopicName = {};
const videosPath = path.join(DIR, "videos.json");
if (fs.existsSync(videosPath)) {
  videosByTopicName = JSON.parse(fs.readFileSync(videosPath, "utf8"));
}

// ---- นำเข้าทีละไฟล์ ----
const files = fs.existsSync(DIR)
  ? fs.readdirSync(DIR).filter((f) => /^\d{2}-.*\.md$/.test(f)).sort()
  : [];
if (files.length === 0) {
  console.error("ไม่พบไฟล์บทเรียน (NN-*.md) ใน content/lessons");
  process.exit(1);
}

let imported = 0;
for (const file of files) {
  const order = Number(file.slice(0, 2));
  const topic = topicByOrder.get(order);
  if (!topic) {
    console.error(`${file}: ไม่พบหมวดลำดับที่ ${order} ในตาราง topics — ข้าม`);
    continue;
  }

  const lesson_md = fs.readFileSync(path.join(DIR, file), "utf8");
  const video_urls = videosByTopicName[topic.name] ?? [];

  const { error: upErr } = await supabase.from("contents").upsert(
    {
      topic_id: topic.id,
      lesson_md,
      video_urls,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "topic_id" }
  );
  if (upErr) {
    console.error(`นำเข้า "${topic.name}" ล้มเหลว:`, upErr.message);
    console.error(
      "ถ้าขึ้นว่าไม่พบตาราง contents — รัน supabase/schema.sql (เวอร์ชันล่าสุด) ใน SQL Editor ก่อน"
    );
    process.exit(1);
  }
  console.log(
    `✓ นำเข้าบทเรียน "${topic.name}" (${Math.round(lesson_md.length / 1000)}k ตัวอักษร, ${video_urls.length} คลิป)`
  );
  imported++;
}

console.log(`\nเสร็จสิ้น — นำเข้า/อัปเดตบทเรียน ${imported} หมวด`);
