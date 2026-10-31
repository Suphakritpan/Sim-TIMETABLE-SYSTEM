# FOLDER-STRUCTURE — Sim-TIMETABLE-SYSTEM

สถานะ: **v0.2** — §2 (`apps/web`) ตรงกับโครงสร้างที่สร้างจริงแล้ว ส่วน `apps/api` / `packages/shared` ยังเป็นข้อเสนอ · ผู้อ่าน: แพน (Frontend) และเพื่อน (Backend) · เป็นเอกสารเดียวที่กำหนดโครงสร้างโฟลเดอร์ (ARCHITECTURE.md §2 ชี้มาที่นี่)
ป้ายสถานะ: `EXISTS` = มีอยู่จริงใน repo ตอนนี้ · `PROPOSED` = ข้อเสนอ ยังไม่ได้สร้าง · เจ้าของ: **แพน** = `apps/web`, **เพื่อน** = `apps/api`, **ร่วม** = `docs`, `packages/shared`

> ⚠️ **ต้องแก้ตามผลอ่าน repo เพื่อน** ([BACKEND-REPO-REVIEW.md](BACKEND-REPO-REVIEW.md) C1, C4): Backend อยู่ใน repo แยก (`backend/`, ไม่ใช่ `apps/api`) และไม่ใช้ `frontend/` ของเขา — โครงสร้าง `apps/api` ด้านล่างใช้เป็นแนวทางภายในของ Backend เท่านั้น จนกว่าจะตัดสินว่า 2 repo หรือรวมกัน

## 1. ภาพรวม (Monorepo, 1 Git repo)

```
/
├─ apps/
│  ├─ web/                 # Frontend React + Vite (.jsx)            — แพน   EXISTS
│  └─ api/                 # Backend Python (API + อัลกอริทึม)        — เพื่อน PROPOSED
├─ packages/
│  └─ shared/              # สัญญาข้อมูลภาษากลาง (JSON Schema + fixtures) — ร่วม PROPOSED
├─ docs/                   # ARCHITECTURE, API-CONTRACT, FOLDER-STRUCTURE — ร่วม EXISTS
├─ scripts/                # generate_sample_data.py (สร้างไฟล์ตัวอย่าง) EXISTS · export_openapi.py PROPOSED
├─ proposition data/       # โจทย์ + ข้อมูลชุดทดลอง/หลัก (อ่านอย่างเดียว) มีในเครื่อง แต่ .gitignore ไม่ commit
└─ CLAUDE.md  DESIGN_SYSTEM.md  README.md                         EXISTS
```

หลักการ: แต่ละ app **build/ทดสอบ/deploy แยกกัน** (Frontend → Vercel, Backend → host ที่รัน job ยาวได้) ติดต่อกันผ่าน HTTP ตาม `docs/API-CONTRACT.md` เท่านั้น ห้าม import ข้าม app

## 2. `apps/web` (แพน) — Frontend — `EXISTS` ตามที่สร้างจริง

```
apps/web/
├─ index.html                 # title, meta, OG, lang="th", noscript (CLAUDE.md §9, §12.5)
├─ vercel.json                # rewrite เฉพาะเส้นทางจริง (ให้ path อื่นได้ 404 จริง) + security headers + แคช assets
├─ vite.config.js  .oxlintrc.json  .npmrc  package.json  package-lock.json
├─ .env.example  .env.development  .env.production   # VITE_* (ห้ามใส่ secret)
├─ scripts/seoFiles.js        # Vite plugin: สร้าง robots.txt, sitemap.xml, llms.txt ตอน build จาก VITE_SITE_URL
├─ public/
│  ├─ favicon.svg  apple-touch-icon.png  og-image.png  404.html
│  └─ samples/                # template-blank, export-format-example, sample-{small,medium,large}-team (.xlsx)
└─ src/
   ├─ main.jsx  index.css
   ├─ app/                    # App.jsx, router.jsx (lazy-load ทีละหน้า), SessionProvider.jsx + sessionContext.js
   │                          #   (สถานะหน้าจอ โหลดจากเซิร์ฟเวอร์ตอนเปิด), HydrationGate.jsx
   ├─ pages/                  # ประกอบ component เท่านั้น ห้ามเรียก fetch
   │  ├─ ImportPage  RequestsPage  GeneratePage  TimetablePage  EvaluationPage  SummaryPage
   │  └─ NotFoundPage         # ตอบ 404 (ดู vercel.json + public/404.html)
   ├─ components/
   │  ├─ common/              # Button Card DataTable Dialog Field MotionBackground PageHeader Progress
   │  │                       #   StatTile StateBox(loading/error/empty) StatusPill Tabs Toast
   │  ├─ layout/              # AppShell TopBar navItems (เมนูเดียว = Topbar ลอย)
   │  ├─ import/              # FileDropzone ImportResult SampleDownloads
   │  ├─ requests/            # AddRequestForm RequestList
   │  ├─ schedule/            # EntityPicker JobProgress ResultPanel StageList TimetableAnimation TimetableGrid
   │  └─ evaluation/          # EvaluationChart
   ├─ services/               # จุดเดียวที่คุยกับ Backend/Mock
   │  ├─ index.js             # อ่าน VITE_DATA_MODE แล้วเลือก mock หรือ http
   │  ├─ httpClient.js        # ที่เดียวที่เรียก fetch: base URL, timeout, แปลง error → ApiError
   │  └─ httpServices.js      # importService requestService scheduleService evaluationService exportService (+ SSE)
   ├─ mocks/
   │  ├─ mockServices.js      # interface เหมือน httpServices ทุกประการ; เลือกสถานการณ์ด้วย VITE_MOCK_SCENARIO
   │  └─ fixtures/            # evaluation-result import-errors import-success request-interpret
   │                          #   schedule-baseline schedule-partial schedule-success (.json)
   ├─ schemas/                # apiSchemas.js (zod ตรวจ response ทั้ง mock และ api) + apiSchemas.test.js
   ├─ hooks/                  # useAsync useJobPolling usePageMeta
   ├─ config/                 # constants.js (เส้นทาง สถานะงาน ไฟล์ตัวอย่าง) env.js (validate ตอนเริ่ม) messages.js (ข้อความไทย + map error code)
   ├─ utils/                  # errors.js (ApiError) summary.js timetable.js (+ timetable.test.js)
   └─ styles/tokens.css       # ค่าต้องตรง DESIGN_SYSTEM.md
```

ต่างจากข้อเสนอเดิมของเอกสารนี้: ไม่มี `DesignPreviewPage`, `ErrorPage`, `context/`, `scenarios.js`, `services/<ชื่อ>Service.js` แยกไฟล์ (รวมเป็น `httpServices.js`), `components/summary/` (ใช้ `ResultPanel`/`utils/summary.js` แทน)
ทดสอบ: ไฟล์ทดสอบวางข้างไฟล์ที่ทดสอบ — มี test ของ schema (`apiSchemas.test.js`) และตัวประกอบตาราง (`timetable.test.js`); component/page ยังไม่มี test (ตรวจด้วยมือ ตาม CLAUDE.md §13.2)
`dist/` อยู่ใน `.gitignore` ของ `apps/web`

## 3. `apps/api` (เพื่อน) — Backend Python — ทั้งหมด `PROPOSED`

ชั้นของโค้ด: `routers → services → (algorithm | io | llm | jobs)` · `domain` ใช้ร่วมทุกชั้น · ห้ามข้ามชั้น (router ห้ามเรียก solver ตรง)

```
apps/api/
├─ pyproject.toml  (หรือ requirements.txt)   # ล็อกเวอร์ชันไลบรารี
├─ .env.example                              # ALLOWED_ORIGINS, LLM_API_KEY, LLM_MODEL, JOB_TIMEOUT_S, …
├─ README.md                                 # วิธีรันในเครื่อง (โจทย์แนะนำให้มี)
├─ src/timetable_api/
│  ├─ main.py                  # สร้างแอป, CORS (เฉพาะ origin จริง), ลงทะเบียน routers, handler error → envelope
│  ├─ config/settings.py       # อ่าน env + validate ตอนเริ่ม (ขาดค่า = ล้มทันที)
│  ├─ routers/                 # HTTP เท่านั้น: รับ/ตรวจ request → เรียก service → ส่ง response
│  │  ├─ imports.py  requests.py  schedules.py  evaluations.py  exports.py
│  ├─ services/                # ตรรกะธุรกิจ ประสานชั้นล่าง
│  │  ├─ import_service.py     # อ่าน+ตรวจไฟล์ → issues[] ครบทุกจุด
│  │  ├─ request_service.py    # ตีความคำขอ (LLM → fallback กฎ → ฟอร์ม)
│  │  ├─ schedule_service.py   # สร้าง job, รัน solver, รวม result + check + summary
│  │  ├─ evaluation_service.py # รัน baseline vs team บนข้อมูล+seed เดียวกัน
│  │  └─ export_service.py
│  ├─ domain/                  # โมเดลล้วน ไม่มี I/O (ตรงกับ API-CONTRACT §1)
│  │  ├─ models.py             # Teacher, Room, Group, Subject, Assignment, Placement, ...
│  │  ├─ calendar.py           # วัน/คาบ/พักเที่ยง/คาบกิจกรรม — มาจากข้อมูล/ค่ากำหนด ห้ามฝังกระจาย
│  │  └─ errors.py             # รหัสข้อผิดพลาดตาม contract
│  ├─ algorithm/               # หัวใจ — แยกจาก I/O ทดสอบได้ล้วน ๆ
│  │  ├─ rules.py              # ตัวตรวจกฎห้ามผิด 10 ข้อ (ใช้ซ้ำทั้ง check ของผลและ evaluation; ต้องแยกอิสระจาก solver)
│  │  ├─ penalty.py            # คะแนนโทษ ก–จ
│  │  ├─ model_builder.py      # แปลงข้อมูล → ตัวแปร/เงื่อนไขของ solver
│  │  ├─ solver.py             # วิธีของทีม (รับ seed, รองรับ cancel, รายงาน stage/progress ถ้าทำได้)
│  │  ├─ baseline.py           # วิธีพื้นฐาน (วางช่องแรกที่ว่าง)
│  │  └─ explain.py            # ข้อความ "จัดวิชาไหนก่อน เพราะอะไร"
│  ├─ io/
│  │  ├─ excel_reader.py       # อ่าน 7 แผ่นงานตามชื่อ/คอลัมน์ของโจทย์
│  │  ├─ validators.py         # กฎตรวจข้อมูลนำเข้า (รหัสซ้ำ, อ้างอิงไม่พบ, ห้องไม่จุ ฯลฯ) + hint
│  │  ├─ excel_writer.py       # ส่งออกแผ่น "ตารางสอน" 6 คอลัมน์ตรงตัวอักษร
│  │  └─ pdf_writer.py
│  ├─ llm/
│  │  ├─ client.py             # เรียกโมเดล (key จาก env เท่านั้น)
│  │  ├─ prompts.py            # prompt ตีความคำขอ → constraint
│  │  └─ rule_fallback.py      # ตีความด้วยกฎ/regex เมื่อ LLM ใช้ไม่ได้
│  ├─ jobs/
│  │  ├─ manager.py            # เริ่ม/ติดตาม/ยกเลิกงาน, ขีดเวลา
│  │  └─ store.py              # ที่เก็บ job+ผล (ต้องรอด request ถัดไป; วิธีเก็บเพื่อนเลือก)
│  └─ schemas/                 # Pydantic request/response ที่ส่งออกเป็น OpenAPI → packages/shared
└─ tests/
   ├─ algorithm/               # rules, penalty, determinism (seed เดิม=ผลเดิม), ชุดข้อมูลเล็กที่ตรวจด้วยมือได้
   ├─ io/                      # reader/validator/writer (เทียบรูปแบบกับไฟล์ตัวอย่าง `4_`)
   ├─ api/                     # contract test กับ fixtures ใน packages/shared
   └─ data/                    # สำเนา/ลิงก์ไปไฟล์ชุดทดลอง-หลักสำหรับ test
```

## 4. `packages/shared` (ร่วม) — สัญญาข้อมูลภาษากลาง — `PROPOSED`

```
packages/shared/
├─ openapi.json          # export จาก FastAPI (แหล่งความจริงของ schema) — สร้างด้วย scripts/export_openapi.py
├─ fixtures/             # ตัวอย่าง request/response ทุก endpoint + ทุกสถานะ
│  ├─ imports/  requests/  schedules/  evaluations/
│  └─ README.md          # ที่มาของแต่ละไฟล์ (สร้างจากชุดทดลองจริง)
└─ README.md             # ใครแก้ไฟล์ไหน, ต้องแจ้งอีกฝ่ายก่อน merge
```
Backend เป็น Python จึงแชร์ type ของ TypeScript ไม่ได้ ใช้ OpenAPI + fixtures เป็นตัวกลาง: Frontend ใช้ fixtures สร้าง mock และ zod schema, Backend ใช้ fixtures ทำ contract test

## 5. `scripts/` และไฟล์ราก — `PROPOSED`

```
scripts/
├─ generate_sample_data.py # EXISTS: สร้างไฟล์ตัวอย่าง เล็ก/กลาง/ใหญ่(600 รายการ) → apps/web/public/samples (ข้อมูลสมมติ seed คงที่ + ตรวจว่ามีคำตอบ); แม่แบบเปล่า/ตัวอย่างส่งออกเป็นไฟล์ที่เตรียมไว้แล้ว
├─ export_openapi.py      # ดึง openapi.json จาก backend
└─ check_seo.*            # PROPOSED ยังไม่มี: ตรวจหมวด 9 ของ CLAUDE.md กับ build (title/meta/H1/canonical ฯลฯ)
```
ไฟล์ราก: `.gitignore` (ครอบคลุม `node_modules`, `dist`, `.env*` ยกเว้น `.env.example`, `__pycache__`, `.venv`)

## 6. ตารางความรับผิดชอบ

| พื้นที่ | เจ้าของ | แก้ข้ามเขตได้เมื่อ |
|---|---|---|
| `apps/web/**` | แพน | แจ้งแพนก่อน |
| `apps/api/**` | เพื่อน | แจ้งเพื่อนก่อน |
| `docs/API-CONTRACT.md`, `packages/shared/**` | ร่วม | แจ้งอีกฝ่ายก่อน merge + ลง Changelog |
| `proposition data/**` | — | **ห้ามแก้** (เอกสารโจทย์/ข้อมูลต้นฉบับ) |

## 7. ข้อตกลง

**ตัดสินแล้ว (ผู้ใช้)**
1. Monorepo เดียว · Vercel ผูก `apps/web` เป็น Root Directory
2. Repo เปิดสาธารณะ (ผู้ตรวจโหลดไปรันเองได้) · Vercel ใช้ให้กรรมการเปิดดูออนไลน์ → **แก้ไข:** `proposition data/` ยัง **ไม่ commit** (อยู่ใน `.gitignore`) จนกว่าผู้จัดยืนยันว่าชื่อครูไม่ใช่ชื่อจริง (BACKEND-REPO-REVIEW.md C5); ห้าม commit `.env`, key
3. `DesignPreviewPage` ไม่มีในโค้ดที่สร้างจริงแล้ว (ไม่ต้องลบ)

**ตามคำตอบฝั่ง Backend (จากผู้ใช้) — `UNVERIFIED` จนกว่าเพื่อนยืนยันกับ template จริง ซึ่งยังไม่อยู่ใน repo นี้**
- FastAPI + PostgreSQL · openpyxl (อ่าน/เขียน Excel) · WeasyPrint + ฟอนต์ Sarabun (ยังไม่ได้ติดตั้ง/ทดสอบตัดคำไทย → ทดสอบตั้งแต่ต้น)
- job/event/schedule_run เก็บใน PostgreSQL; **worker เป็นโปรเซสแยกจากเว็บ**; job ที่ค้าง `running` ตอน worker เริ่มใหม่ → ตั้ง `failed`
- ความคืบหน้าส่งผ่าน **SSE** · ตรวจ `cancel_requested` เป็นระยะ ไม่ใช่ทุกรอบ · เขียน event ~ทุก 1%
- Deploy Backend: VPS + docker compose (+ reverse proxy แนะนำ Caddy, ต้องปิด buffering และตั้ง read timeout ยาวสำหรับ SSE) · ต้องมี volume ถาวรของฐานข้อมูลและ `FILES_DIR` → serverless ใช้ไม่ได้

ผลต่อโครงสร้าง `apps/api` ใน §3 (ปรับเมื่อเพื่อนยืนยัน): เพิ่ม `worker/` (โปรเซสแยก), `db/` (models + migrations), `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `fonts/Sarabun`; `jobs/store.py` ใน §3 ถูกแทนด้วย `db/` + ตาราง job/event/schedule_run

**ยังเปิดอยู่**
| # | เรื่อง | ผู้ตัดสิน |
|---|---|---|
| 1 | ที่อยู่ VPS, SSH และ **โดเมนจริง** (จำเป็น: เว็บบน Vercel เป็น HTTPS เรียก API แบบ http ไม่ได้ จึงต้องมี HTTPS บนโดเมน) | ผู้ใช้ |
| 2 | รายการ endpoint จริงของ template Backend (ดูหมายเหตุใน API-CONTRACT.md "ต้องกระทบยอด") | เพื่อน |
| 3 | ที่เก็บ `FILES_DIR` ขนาดและอายุไฟล์ | เพื่อน |
