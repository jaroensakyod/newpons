// เติม subtopic จาก content/subtopics.json ที่ยังไม่มีในตาราง subtopics ของ DB
// idempotent — รันซ้ำได้ (insert เฉพาะแถวที่ขาด ไม่ลบของเดิม)
// ใช้: node --env-file=.env.local scripts/sync-subtopics.mjs
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("ขาด SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
  process.exit(1);
}
const supabase = createClient(url, key);

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "subtopics.json"), "utf8"));

const { data: topics, error: tErr } = await supabase.from("topics").select("id, name");
if (tErr) { console.error("อ่าน topics ไม่ได้:", tErr.message); process.exit(1); }
const topicIdByName = new Map(topics.map((t) => [t.name, t.id]));

const { data: existing, error: sErr } = await supabase.from("subtopics").select('id, topic_id, name, "order"');
if (sErr) { console.error("อ่าน subtopics ไม่ได้:", sErr.message); process.exit(1); }
const have = new Set(existing.map((s) => `${s.topic_id}|||${s.name}`));
const maxOrderByTopic = new Map();
for (const s of existing) {
  maxOrderByTopic.set(s.topic_id, Math.max(maxOrderByTopic.get(s.topic_id) ?? 0, s.order ?? 0));
}

const toInsert = [];
for (const [topicName, list] of Object.entries(data)) {
  if (topicName.startsWith("_")) continue;
  const topicId = topicIdByName.get(topicName);
  if (!topicId) { console.error(`หมวด "${topicName}" ไม่มีในตาราง topics — ข้าม`); continue; }
  for (const { subtopic } of list) {
    const k = `${topicId}|||${subtopic}`;
    if (!have.has(k)) {
      const nextOrder = (maxOrderByTopic.get(topicId) ?? 0) + 1;
      maxOrderByTopic.set(topicId, nextOrder);
      toInsert.push({ topic_id: topicId, name: subtopic, order: nextOrder });
    }
  }
}

if (!toInsert.length) {
  console.log("subtopics ครบแล้ว — ไม่มีอะไรต้องเติม");
  process.exit(0);
}
console.log(`จะเติม ${toInsert.length} subtopic:`);
toInsert.forEach((r) => console.log(`  + [topic ${r.topic_id}] ${r.name}`));

const { error: insErr } = await supabase.from("subtopics").insert(toInsert);
if (insErr) { console.error("insert ไม่สำเร็จ:", insErr.message); process.exit(1); }
console.log("เติมสำเร็จ");
