-- ============================================================
-- สคีมาแอปติวเคมี สอวน. ค่าย 1 (MVP)
-- วิธีใช้: เปิด Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- รันซ้ำได้ (idempotent)
-- ============================================================

-- ---------- ตาราง ----------

create table if not exists public.topics (
  id      serial primary key,
  name    text not null unique,
  "order" int  not null
);

create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  topic_id      int  not null references public.topics (id) on delete cascade,
  stem          text not null,
  choices       jsonb not null,
  correct_index int  not null check (correct_index between 0 and 3),
  explanation   text not null,
  difficulty    int  not null default 2 check (difficulty between 1 and 5),
  created_at    timestamptz not null default now()
);

create table if not exists public.attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  question_id  uuid not null references public.questions (id) on delete cascade,
  chosen_index int  not null,
  is_correct   boolean not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_questions_topic on public.questions (topic_id);
create index if not exists idx_attempts_user on public.attempts (user_id);
create index if not exists idx_attempts_question on public.attempts (question_id);

-- ---------- Row Level Security ----------

alter table public.topics    enable row level security;
alter table public.questions enable row level security;
alter table public.attempts  enable row level security;

drop policy if exists "topics: read for signed-in" on public.topics;
create policy "topics: read for signed-in"
  on public.topics for select to authenticated using (true);

-- questions: จงใจ "ไม่มี" select policy — ห้ามอ่านตารางตรง
-- (กันเด็กเปิด devtools ดูเฉลย) ให้อ่านผ่าน view quiz_questions
-- และตรวจคำตอบผ่านฟังก์ชัน submit_answer เท่านั้น

drop policy if exists "attempts: read own" on public.attempts;
create policy "attempts: read own"
  on public.attempts for select to authenticated using (auth.uid() = user_id);

-- attempts: ไม่มี insert policy — การบันทึกทำในฟังก์ชัน submit_answer

-- ---------- View สำหรับทำข้อสอบ (ไม่มีเฉลย) ----------
-- หมายเหตุ: view นี้รันด้วยสิทธิ์เจ้าของ (bypass RLS ของ questions)
-- ตั้งใจให้เป็นแบบนั้นเพื่อเปิดเฉพาะคอลัมน์ที่ไม่ใช่เฉลย

-- ใช้ drop+create (ไม่ใช่ or replace) กัน error 42P16 ตอนโครงคอลัมน์เปลี่ยน
-- หมายเหตุ: นิยามสุดท้ายที่มีผลจริงคือเวอร์ชัน subtopic_id ใน migration ท้ายไฟล์
drop view if exists public.quiz_questions;
create view public.quiz_questions as
  select id, topic_id, stem, choices, difficulty
  from public.questions;

revoke all on public.quiz_questions from anon;
grant select on public.quiz_questions to authenticated;

-- ---------- ฟังก์ชันตรวจคำตอบ + บันทึก attempt ----------

create or replace function public.submit_answer(
  p_question_id uuid,
  p_chosen_index int
)
returns table (is_correct boolean, correct_index int, explanation text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correct int;
  v_explanation text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_chosen_index is null or p_chosen_index not between 0 and 3 then
    raise exception 'invalid choice index';
  end if;

  select q.correct_index, q.explanation
    into v_correct, v_explanation
  from public.questions q
  where q.id = p_question_id;

  if not found then
    raise exception 'question not found';
  end if;

  insert into public.attempts (user_id, question_id, chosen_index, is_correct)
  values (auth.uid(), p_question_id, p_chosen_index, p_chosen_index = v_correct);

  return query select p_chosen_index = v_correct, v_correct, v_explanation;
end;
$$;

revoke all on function public.submit_answer(uuid, int) from public, anon;
grant execute on function public.submit_answer(uuid, int) to authenticated;

-- ---------- ฟังก์ชันสถิติ % ถูกต่อหมวด (ของผู้ใช้ที่ล็อกอิน) ----------

create or replace function public.topic_stats()
returns table (
  topic_id int,
  topic_name text,
  topic_order int,
  total_attempts bigint,
  correct_attempts bigint,
  question_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    t.id,
    t.name,
    t."order",
    (select count(*)
       from public.attempts a
       join public.questions q on q.id = a.question_id
      where q.topic_id = t.id and a.user_id = auth.uid()),
    (select count(*)
       from public.attempts a
       join public.questions q on q.id = a.question_id
      where q.topic_id = t.id and a.user_id = auth.uid() and a.is_correct),
    (select count(*) from public.questions q where q.topic_id = t.id)
  from public.topics t
  order by t."order";
$$;

revoke all on function public.topic_stats() from public, anon;
grant execute on function public.topic_stats() to authenticated;

-- ---------- บทเรียนต่อหมวด (เฟสเนื้อหา) ----------

create table if not exists public.contents (
  id         serial primary key,
  topic_id   int  not null unique references public.topics (id) on delete cascade,
  lesson_md  text not null,
  video_urls jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.contents enable row level security;

drop policy if exists "contents: read for signed-in" on public.contents;
create policy "contents: read for signed-in"
  on public.contents for select to authenticated using (true);

-- ---------- ข้อมูลหมวด 8 หมวด (เคมีค่าย 1) ----------

insert into public.topics (id, name, "order") values
  (1, 'ทักษะพื้นฐานปฏิบัติการเคมี', 1),
  (2, 'โครงสร้างอะตอม', 2),
  (3, 'ตารางธาตุและสมบัติของธาตุ', 3),
  (4, 'พันธะเคมี', 4),
  (5, 'โมลและปริมาณสารสัมพันธ์', 5),
  (6, 'แก๊สและสมบัติของแก๊ส', 6),
  (7, 'สารละลาย', 7),
  (8, 'ของแข็งและของเหลว', 8)
on conflict (id) do update set name = excluded.name, "order" = excluded."order";

select setval(pg_get_serial_sequence('public.topics', 'id'),
              (select max(id) from public.topics));

-- ============================================================
-- Migration: บันไดความยากต่อหัวข้อย่อย (subtopic) — 2026-07-16
-- แหล่งข้อมูล canonical subtopic ต่อหมวด: content/subtopics.json
-- รันซ้ำได้ (idempotent) เหมือนเดิม
-- ============================================================

create table if not exists public.subtopics (
  id       serial primary key,
  topic_id int  not null references public.topics (id) on delete cascade,
  name     text not null,
  "order"  int  not null,
  unique (topic_id, name)
);

create index if not exists idx_subtopics_topic on public.subtopics (topic_id);

alter table public.subtopics enable row level security;

drop policy if exists "subtopics: read for signed-in" on public.subtopics;
create policy "subtopics: read for signed-in"
  on public.subtopics for select to authenticated using (true);

-- nullable ชั่วคราว: ข้อเก่าที่ยังไม่ได้แท็ก subtopic จะยังใช้งานได้ปกติ
alter table public.questions
  add column if not exists subtopic_id int references public.subtopics (id) on delete set null;

create index if not exists idx_questions_subtopic on public.questions (subtopic_id);

-- quiz_questions view ต้องรวม subtopic_id ด้วย (ยังไม่มีเฉลย เหมือนเดิม)
-- ต้อง drop ก่อนเพราะ create or replace แทรกคอลัมน์กลาง view เดิมไม่ได้ (42P16)
drop view if exists public.quiz_questions;
create view public.quiz_questions as
  select id, topic_id, subtopic_id, stem, choices, difficulty
  from public.questions;

revoke all on public.quiz_questions from anon;
grant select on public.quiz_questions to authenticated;

-- ---------- Seed หัวข้อย่อยต่อหมวด (จาก content/subtopics.json) ----------

insert into public.subtopics (topic_id, name, "order")
select t.id, s.name, s.ord
from public.topics t
join (values
  ('ทักษะพื้นฐานปฏิบัติการเคมี', 'ความปลอดภัยและสัญลักษณ์อันตราย', 1),
  ('ทักษะพื้นฐานปฏิบัติการเคมี', 'เลขนัยสำคัญและการอ่านเครื่องมือวัด', 2),
  ('ทักษะพื้นฐานปฏิบัติการเคมี', 'ความเที่ยงและความแม่นของข้อมูล', 3),
  ('ทักษะพื้นฐานปฏิบัติการเคมี', 'การแปลงหน่วยและคำนวณความหนาแน่น', 4),
  ('ทักษะพื้นฐานปฏิบัติการเคมี', 'วิธีการทางวิทยาศาสตร์และการเจือจางกรด', 5),

  ('โครงสร้างอะตอม', 'แบบจำลองอะตอมและอนุภาคมูลฐาน', 1),
  ('โครงสร้างอะตอม', 'สัญลักษณ์นิวเคลียร์ ไอโซโทป และไอออน', 2),
  ('โครงสร้างอะตอม', 'การจัดเรียงอิเล็กตรอนและออร์บิทัล', 3),
  ('โครงสร้างอะตอม', 'สเปกตรัมและแบบจำลองโบร์', 4),
  ('โครงสร้างอะตอม', 'กัมมันตภาพรังสีและครึ่งชีวิต', 5),
  ('โครงสร้างอะตอม', 'มวลอะตอมเฉลี่ยและร้อยละความอุดมสมบูรณ์ไอโซโทป', 6),

  ('ตารางธาตุและสมบัติของธาตุ', 'แนวโน้มสมบัติธาตุ (ขนาด IE EN EA)', 1),
  ('ตารางธาตุและสมบัติของธาตุ', 'การระบุ/ทำนายธาตุจากเบาะแสตำแหน่งและ config', 2),
  ('ตารางธาตุและสมบัติของธาตุ', 'ออกไซด์กรด-เบสและปฏิกิริยากับน้ำ/คลอรีน', 3),
  ('ตารางธาตุและสมบัติของธาตุ', 'ธาตุแทรนซิชัน เลขออกซิเดชัน และสารเชิงซ้อน', 4),
  ('ตารางธาตุและสมบัติของธาตุ', 'สมบัติเฉพาะหมู่ธาตุ (แฮโลเจน แอลคาไล ไฮโดรเจน ออกซิเจน)', 5),
  ('ตารางธาตุและสมบัติของธาตุ', 'กัมมันตภาพรังสีของธาตุหนักและตำแหน่งในตารางธาตุ', 6),

  ('พันธะเคมี', 'ชนิดพันธะและการเรียกชื่อสารประกอบ', 1),
  ('พันธะเคมี', 'โครงสร้างลิวอิสและกฎออกเตต', 2),
  ('พันธะเคมี', 'รูปร่างโมเลกุล VSEPR และมุมพันธะ', 3),
  ('พันธะเคมี', 'สภาพขั้วและแรงระหว่างโมเลกุล', 4),
  ('พันธะเคมี', 'พลังงานพันธะและวัฏจักรบอร์น-ฮาเบอร์', 5),
  ('พันธะเคมี', 'ผลึกของแข็งและการตกตะกอน', 6),

  ('โมลและปริมาณสารสัมพันธ์', 'โมล อนุภาค และการแปลงหน่วยพื้นฐาน', 1),
  ('โมลและปริมาณสารสัมพันธ์', 'สูตรเอมพิริคัล สูตรโมเลกุล และไฮเดรต', 2),
  ('โมลและปริมาณสารสัมพันธ์', 'สารกำหนดปริมาณและผลได้ร้อยละ (ขั้นเดียว)', 3),
  ('โมลและปริมาณสารสัมพันธ์', 'ปริมาณสัมพันธ์หลายขั้นตอนและอุตสาหกรรม', 4),
  ('โมลและปริมาณสารสัมพันธ์', 'การไทเทรตและการตกตะกอนเชิงปริมาณ', 5),
  ('โมลและปริมาณสารสัมพันธ์', 'หามวลอะตอม/มวลโมเลกุลจากข้อมูลปฏิกิริยา', 6),

  ('แก๊สและสมบัติของแก๊ส', 'กฎแก๊สเดี่ยว (บอยล์ ชาร์ล เกย์-ลูสแซก)', 1),
  ('แก๊สและสมบัติของแก๊ส', 'กฎแก๊สรวมและ PV=nRT', 2),
  ('แก๊สและสมบัติของแก๊ส', 'ทฤษฎีจลน์ของแก๊สและการแพร่ (เกรแฮม)', 3),
  ('แก๊สและสมบัติของแก๊ส', 'ความดันย่อยและแก๊สผสม', 4),
  ('แก๊สและสมบัติของแก๊ส', 'ปริมาณสัมพันธ์ของแก๊สในปฏิกิริยา', 5),

  ('สารละลาย', 'หน่วยความเข้มข้นและการแปลงหน่วย', 1),
  ('สารละลาย', 'การเตรียมและเจือจางสารละลาย', 2),
  ('สารละลาย', 'ความเข้มข้นหลังผสมสารละลายและการตกตะกอน', 3),
  ('สารละลาย', 'สมบัติคอลลิเกทีฟ (จุดเดือด-จุดเยือกแข็ง)', 4),
  ('สารละลาย', 'สมการไอออนิกสุทธิและการไทเทรต', 5),

  ('ของแข็งและของเหลว', 'ความดันไอและจุดเดือด', 1),
  ('ของแข็งและของเหลว', 'แรงยึดเหนี่ยวระหว่างโมเลกุลกับสมบัติของเหลว', 2),
  ('ของแข็งและของเหลว', 'การเปลี่ยนสถานะและสถานะของสารที่อุณหภูมิห้อง', 3)
) as s(topic_name, name, ord) on s.topic_name = t.name
on conflict (topic_id, name) do update set "order" = excluded."order";

-- ---------- สถิติ % ถูก แยกตาม subtopic + difficulty (สำหรับหน้าจุดอ่อน) ----------

create or replace function public.subtopic_stats()
returns table (
  topic_id int,
  topic_name text,
  subtopic_id int,
  subtopic_name text,
  subtopic_order int,
  difficulty int,
  total_attempts bigint,
  correct_attempts bigint,
  question_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    t.id,
    t.name,
    s.id,
    s.name,
    s."order",
    q.difficulty,
    count(a.id) filter (where a.user_id = auth.uid()),
    count(a.id) filter (where a.user_id = auth.uid() and a.is_correct),
    count(distinct q.id)
  from public.subtopics s
  join public.topics t on t.id = s.topic_id
  join public.questions q on q.subtopic_id = s.id
  left join public.attempts a on a.question_id = q.id
  group by t.id, t.name, s.id, s.name, s."order", q.difficulty
  order by t."order", s."order", q.difficulty;
$$;

revoke all on function public.subtopic_stats() from public, anon;
grant execute on function public.subtopic_stats() to authenticated;
