# ⚗️ ติวเคมี สอวน. ค่าย 1 (MVP)

เว็บแอปให้เด็กทำข้อสอบเคมีปรนัยเป็นหมวด → รู้ถูก/ผิดทันทีพร้อมเฉลยละเอียด (LaTeX) → เห็นว่าตัวเองอ่อนหมวดไหน

**Stack**: Next.js + Supabase (Auth + Postgres) + KaTeX + Tailwind — deploy ฟรีบน Vercel
(บรีฟและแผนเต็มอยู่ใน [docs/](docs/))

---

## เริ่มใช้งานครั้งแรก (ทำครั้งเดียว ~15 นาที)

### 1. สร้างโปรเจกต์ Supabase
1. สมัคร/ล็อกอินที่ [supabase.com](https://supabase.com) → **New project** (free tier พอ)
2. เปิด **SQL Editor** → วางเนื้อหาทั้งไฟล์ [`supabase/schema.sql`](supabase/schema.sql) → **Run**
   (สร้างตาราง + RLS + ฟังก์ชันตรวจคำตอบ + หมวด 6 หมวด — รันซ้ำได้)
3. **สำคัญ**: ไปที่ **Authentication → Sign In / Up → Email** แล้ว**ปิด "Confirm email"**
   (MVP ล็อกอินง่ายๆ ไม่ต้องรอเมลยืนยัน — เปิดกลับทีหลังได้)

### 2. ตั้งค่า .env.local
คัดลอก `.env.example` เป็น `.env.local` แล้วเติมค่าจาก **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        ← anon / publishable key
SUPABASE_SERVICE_ROLE_KEY=...            ← ใช้เฉพาะสคริปต์นำเข้าข้อสอบ ห้าม commit
```

### 3. ตรวจ + นำเข้าข้อสอบและบทเรียน

```bash
npm run validate:questions   # ตรวจ schema + LaTeX ทุกไฟล์ใน content/questions
npm run import:questions     # นำเข้า Supabase (ข้ามหมวดที่มีข้อสอบแล้ว)
npm run import:questions -- --replace   # ลงใหม่ทับของเดิม (ลบ attempts ของข้อเดิมด้วย)

npm run validate:lessons     # ตรวจบทเรียน 6 ไฟล์ + videos.json
npm run import:lessons       # นำเข้าบทเรียน (upsert ทับของเดิม รันซ้ำได้)
```

### 4. รันแอป

```bash
npm run dev
```

เปิด http://localhost:3000 → สมัครด้วยอีเมล → เลือกหมวด → ทำข้อสอบ

---

## ⚠️ ก่อนให้เด็กใช้จริง: รีวิวข้อสอบ

ข้อสอบใน [`content/questions/`](content/questions/) ร่างโดย AI และผ่านการตรวจเลขซ้ำอัตโนมัติแล้ว
แต่**ยังถือเป็น draft — ต้องรีวิวโดยคนที่แม่นเคมีก่อนปล่อยให้เด็กใช้** (ตามแผนในบรีฟข้อ 7)

รูปแบบ JSON ต่อข้อ:

```json
{
  "topic": "โมลและปริมาณสารสัมพันธ์",
  "stem": "โจทย์ (มี $LaTeX$ ได้)",
  "choices": ["ตัวเลือก 4 ตัว"],
  "correct_index": 1,
  "explanation": "เฉลยละเอียด markdown + LaTeX (ใช้ \\cancel ตัดหน่วยได้)",
  "difficulty": 2
}
```

แก้ไฟล์เสร็จ → `npm run validate:questions` → `npm run import:questions -- --replace`

> เช็คว่า LaTeX เรนเดอร์หน้าตาเป็นยังไง: เปิด http://localhost:3000/dev/katex-check
> (หน้าตัวอย่างการเรนเดอร์ `\cancel`, เศษส่วน, `\textcolor`)

---

## Deploy ขึ้น Vercel

1. push โค้ดขึ้น GitHub (`git add -A && git commit -m "MVP" && git push`)
2. ที่ [vercel.com](https://vercel.com) → **Import Project** → เลือก repo
3. ใส่ Environment Variables: `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (ไม่ต้องใส่ service role key บน Vercel)
4. Deploy → ได้ URL จริง → ที่ Supabase **Authentication → URL Configuration** ตั้ง Site URL เป็น URL นั้น

## โครงสร้างโปรเจกต์

```
src/app/login        หน้าเข้าสู่ระบบ/สมัคร (Supabase Auth)
src/app/topics       หน้าเลือกหมวด + % ถูกของแต่ละหมวด
src/app/lesson/[id]  หน้าบทเรียนต่อหมวด (markdown + KaTeX + คลิปฝัง)
src/app/quiz/[id]    หน้าทำข้อสอบ — ตอบแล้วเฉลยเด้งทันที (KaTeX)
src/app/summary      หน้าสรุปจุดอ่อน เรียงจากหมวดอ่อนสุด
supabase/schema.sql  ตาราง + RLS + ฟังก์ชัน (submit_answer, topic_stats)
content/questions/   คลังข้อสอบ JSON (source of truth — แก้ที่นี่แล้ว import)
content/lessons/     บทเรียน markdown ต่อหมวด + videos.json (คลิปประกอบ)
scripts/             validate + import ข้อสอบ/บทเรียน
docs/                build brief + master plan
```

## บทเรียน (เฟสเนื้อหา)

- บทเรียนอยู่ที่ `content/lessons/NN-*.md` (markdown + LaTeX) — เลข NN ตรงกับลำดับหมวด
- คลิปประกอบอยู่ที่ `content/lessons/videos.json` (ลิงก์ YouTube ที่ผ่านการยืนยันว่ามีจริง)
  ฝังแบบ `youtube-nocookie.com` เพื่อความเป็นส่วนตัวของเด็ก
- เช่นเดียวกับข้อสอบ: **บทเรียนร่างโดย AI + ตรวจข้อเท็จจริงซ้ำแล้ว แต่ควรรีวิวเองก่อนใช้จริง**
- แก้ไฟล์ → `npm run validate:lessons` → `npm run import:lessons` (upsert ทับเลย ไม่ต้อง --replace)

## กลไกกันโกงเบื้องต้น

เฉลย (`correct_index`, `explanation`) **ไม่ถูกส่งไปเบราว์เซอร์** ตอนทำข้อสอบ —
ฝั่งเว็บอ่านได้เฉพาะ view `quiz_questions` (ไม่มีเฉลย) และการตรวจเกิดใน
ฟังก์ชัน `submit_answer` ฝั่งฐานข้อมูล ซึ่งบันทึกผลลง `attempts` พร้อมกัน

## แผนถัดไป (เฟส 2 — สิงหาคม)

เติมข้อสอบให้ครบ/เพิ่มหมวดย่อย, บทเรียนอ่าน+คลิป, เส้นทาง prerequisite,
Elo mastery, ตรวจรูปถ่ายลายมือ — ดู [docs/master-plan.md](docs/master-plan.md)
