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

create or replace view public.quiz_questions as
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

-- ---------- ข้อมูลหมวด 6 หมวด (เคมีค่าย 1) ----------

insert into public.topics (id, name, "order") values
  (1, 'ทักษะพื้นฐานปฏิบัติการเคมี', 1),
  (2, 'โครงสร้างอะตอม', 2),
  (3, 'ตารางธาตุและสมบัติของธาตุ', 3),
  (4, 'พันธะเคมี', 4),
  (5, 'โมลและปริมาณสารสัมพันธ์', 5),
  (6, 'แก๊สและสมบัติของแก๊ส', 6)
on conflict (id) do update set name = excluded.name, "order" = excluded."order";

select setval(pg_get_serial_sequence('public.topics', 'id'),
              (select max(id) from public.topics));
