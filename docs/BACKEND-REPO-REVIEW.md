# BACKEND-REPO-REVIEW — ผลอ่าน repo ฝั่งเพื่อน

อ่านเมื่อ: 2026-10-31 · repo: `anonmianwe/test-for-AI-skills-competition` (commit `b6d8ec5`, clone แบบอ่านอย่างเดียวนอกโปรเจกต์นี้) · ผู้เขียน: ฝั่งแพน · ผู้อ่าน: แพน เพื่อน และผู้ใช้
ป้าย: `FACT` = เห็นในไฟล์ของ repo นั้นโดยตรง · `PROPOSED` = ข้อเสนอของเรา · `OPEN` = ต้องมีคนตัดสิน
ข้อจำกัด: ผมอ่านแค่ไฟล์ที่ commit ไว้ ไม่ได้รันโค้ด ไม่ได้เห็น `extra.md` / `full_test_data/` (ถูกกันออกจาก git) ไม่ได้ตรวจว่า repo เป็น private/public จริง (PROGRESS.md เขียนว่า private)

## 1. สถานะจริงของ repo เพื่อน (`FACT`)

- เป็น **web-kit template + แผน**: FastAPI + PostgreSQL + worker + React/TypeScript/Ant Design (โฟลเดอร์ `backend/`, `frontend/`, `compose.yaml`, `dev.py`, `docs/SPEC.md`)
- `PROGRESS.md`: "planning finished … **no app feature is built, so F1 has not started**" มี commit เดียว มีโค้ดตัวอย่างของ template (documents, users, demo jobs) ที่จะถูกลบ
- ฟีเจอร์ที่ใช้งานได้จริงตอนนี้คือโครงของ template: session login, audit log, job + event + worker, SSE (`/api/jobs/{id}/events`), upload, migration (Alembic), `dev.py`
- **ยังไม่มี**: ตัวอ่าน Excel ตามโจทย์, ตัวตรวจกฎ, solver, คำขอพิเศษ, ส่งออก, ยกเลิก job, CORS, Docker production, WeasyPrint, โดเมน/VPS
- SPEC ระบุว่า **F10 (solver แข็งแรง) เป็นรายการเสี่ยงที่สุด** "ยังไม่เคยรัน solver กับข้อมูลนี้"
- ดังนั้น "ตัวอย่าง response จริง" ที่เราขอในรอบ 1 (A3) **ยังไม่มีให้ส่ง** — รูปแบบ response ของฟีเจอร์ยังไม่ถูกออกแบบ ต้องออกแบบร่วมกันตอนนี้

## 2. สิ่งที่ตอบแล้ว (ไม่ต้องถามเพื่อนซ้ำ)

| เรื่อง | คำตอบจาก repo |
|---|---|
| รายการ endpoint | `docs/SPEC.md` §6 (ตารางด้านล่าง) |
| สถานะ job | template: `queued, running, done, failed`; SPEC เพิ่ม `cancelled` + `cancel_requested` |
| SSE | `GET /api/jobs/{id}/events`: ส่ง `id:` + `data:` JSON ต่อ event, รองรับ `Last-Event-ID`, จบด้วย `event: end` + `{status}`, **ไม่มี heartbeat**, วนอ่าน DB ทุก 0.5 วินาที, จบเฉพาะ `done`/`failed` (ต้องเพิ่ม `cancelled`) |
| CORS | **ไม่มี** (`main.py` ไม่มี CORS middleware) |
| Cookie | `SessionMiddleware` `same_site="lax"`, `https_only` นอก dev |
| Security headers | `nosniff`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin` ทุก response |
| Config | env: `APP_ENV, DATABASE_URL, SECRET_KEY, FILES_DIR, SESSION_HOURS, MAX_UPLOAD_MB(20)` ฯลฯ |
| Stack | Python ≥3.12, FastAPI ≥0.162, SQLAlchemy 2, Alembic, openpyxl, uv — **ยังไม่มี** WeasyPrint, solver lib, LLM client |
| ลำดับสร้าง | F1 → F9 (deploy) → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F10 → F11 |

## 3. ความขัดแย้งกับแผนฝั่งเรา (ต้องตัดสิน)

| # | ขัดกันเรื่อง | ฝั่งเพื่อน (`FACT`) | ฝั่งเรา | ข้อเสนอ (`PROPOSED`) |
|---|---|---|---|---|
| C1 | **Frontend มี 2 ชุด** | SPEC วางแผนทำ 6 หน้าใน `frontend/` (React **TypeScript** + Ant Design + i18n th/en) และ F9 สร้าง container `web` | `apps/web` (React+Vite **JSX**, Tailwind) deploy บน Vercel ตามที่ผู้ใช้เลือก B | ใช้ `apps/web` ของเราเป็น UI เดียว · ฝั่งเพื่อน **ทำเฉพาะ API/worker/DB** ลบ/ไม่ใช้ `frontend/` และไม่สร้าง container `web` · เพื่อนต้องแก้ SPEC §5, §9 (F1–F8 ตัดส่วนหน้าเว็บออก) |
| C2 | **ล็อกอิน** | SPEC: ล็อกอินร่วมของกรรมการ 1 บัญชี ทุก route ต้องล็อกอิน (cookie SameSite=lax) · ทั้งที่ `agent-questions.md` Q1 ของตัวเองแนะนำให้ถอดล็อกอิน | ผู้ใช้ตัดสินแล้ว: **ไม่มีล็อกอิน** (เสียเวลาตอนแข่ง) | ตามที่ผู้ใช้ตัดสิน: ไม่มีล็อกอิน (ตัด F1 ส่วน login) · ชดเชยความปลอดภัยด้วย rate limit, จำกัดขนาด/จำนวน job, ล้างข้อมูล · ถ้าเลือกมีล็อกอินภายหลัง: ต้องใช้โดเมนเดียวกัน (เช่น `app.<domain>` กับ `api.<domain>`) ให้ cookie เป็น same-site หรือใช้ `SameSite=None; Secure` + CORS credentials + `EventSource withCredentials` |
| C3 | **พื้นที่ทำงานร่วมเดียว** | "Everyone shares one workspace. A confirmed upload becomes the active data for everyone" · **รันได้ทีละ job เดียว** (ตัวที่สองได้ 409) · ผลเป็น `latest` ของทั้งระบบ | เว็บสาธารณะ ไม่มีล็อกอิน กรรมการอาจทดสอบพร้อมกัน/มีคนแปลกหน้าเข้า | **OPEN สำคัญ:** ถ้ากรรมการ 2 คนใช้พร้อมกัน ข้อมูลของคนหนึ่งจะถูกทับโดยอีกคน ข้อเสนอ: ให้ Frontend สร้าง `workspaceId` (UUID เก็บใน localStorage) ส่งทุก request เป็น header `X-Workspace-Id`, Backend แยก dataset/requests/runs ตามค่านี้ และคิว job แทนการปฏิเสธ 409 (ถ้าไม่ทำ ต้องยอมรับความเสี่ยงและเขียนไว้ใน SPEC §10) |
| C4 | **สองโปรเจกต์ Git** | repo `backend/`+`frontend/` แยกต่างหาก (PROGRESS: private, Q3 ยังเปิด) | monorepo `apps/web, apps/api, docs` | โจทย์ต้องการ "ลิงก์ซอร์สโค้ด" ที่กรรมการเปิดได้ → ต้องตัดสินว่า (ก) ส่ง 2 ลิงก์ (repo เรา = Frontend+เอกสาร, repo เพื่อน = Backend) ทั้งคู่เปิดให้กรรมการดู หรือ (ข) รวม Backend เข้า monorepo นี้ (ย้ายเป็น `apps/api`) · ต้องแก้ `FOLDER-STRUCTURE.md` ตามที่เลือก |
| C5 | **ข้อมูลโจทย์ใน git** | `extra.md` และ `full_test_data/` ถูกกันออกจาก git จนกว่าผู้จัดจะยืนยันว่าชื่อครูเป็นชื่อจริงหรือไม่ (Q2/Q6) | `proposition data/` อยู่ในโปรเจกต์นี้ (ยังไม่ commit) | **ผมแก้ความผิดพลาดของตัวเอง:** ก่อนหน้านี้ผมเขียนในเอกสารว่าชื่อในไฟล์ "เป็นข้อมูลสมมติ" โดยไม่มีหลักฐาน → ให้ถือว่า **ยังไม่ยืนยัน** · ผมเพิ่ม `.gitignore` ที่ราก repo ให้ไม่ commit `proposition data/` จนกว่าผู้จัดตอบ (ย้อนกลับได้โดยลบบรรทัดนั้น) · ไฟล์ตัวอย่างที่ commit/ขึ้นเว็บให้ใช้ข้อมูลสร้างขึ้นเอง (F8 ของเพื่อน) |
| C6 | **ข้อมูลส่วนบุคคลในเมทาดาทา** | `backend/pyproject.toml` ใส่อีเมลส่วนตัวใน `authors` (เพื่อนระบุในคำถาม Q3 เองแล้ว) | repo ที่ส่งกรรมการ | ลบ/เปลี่ยนก่อนเปิด repo ให้กรรมการ (ตรวจ commit author ด้วย) |
| C7 | **Deploy `web`** | F9 จะสร้าง Docker `web` + HTTPS ทั้งหมดบน VPS | Vercel + Caddy เฉพาะ API | ตัด container `web` ออก; Caddy proxy แค่ `/api` |
| C8 | **ตอบรูปแบบผล** | SPEC ไม่กำหนดรูปแบบ response (sessions/report/grid) | contract ของเรา (`API-CONTRACT.md` v0.2.x) กำหนดแล้วแต่เป็นข้อเสนอ | ใช้ contract ของเราเป็นร่าง ให้เพื่อนปรับตามความเป็นจริงแล้วแช่แข็ง (ดู §5) |

## 4. กระทบยอด endpoint: SPEC §6 (Backend) ↔ API-CONTRACT (เรา)

หลักการ: **ใช้ชื่อ/เส้นทางของ Backend** (เป็นเจ้าของ) · ใช้รูปแบบข้อมูลของเรากับ endpoint ของเขา

| ความสามารถ | เส้นทางของ Backend (SPEC §6) | เส้นทางเดิมในเอกสารเรา | หมายเหตุ |
|---|---|---|---|
| อัปโหลด+ตรวจ | `POST /api/datasets` | `POST /imports` | ตอบ summary + issues ครบ |
| ข้อมูลที่ใช้อยู่ | `GET /api/datasets/active` | `GET /imports/{id}` | **ไม่มี id** — "active" ทั้งระบบ (ดู C3) |
| ยืนยันใช้ข้อมูล | `POST /api/datasets/{id}/confirm` | (ไม่มี — เราคิดว่าเป็นสถานะ UI) | **เป็น action ของ Backend**; ไฟล์ที่มีข้อผิดยืนยันไม่ได้ (B18) |
| ไฟล์แม่แบบ/ตัวอย่าง | `GET /api/samples/{name}` | static ใน `public/samples` | ใช้ของ Backend ได้ (เพื่อนสร้างด้วย F8) |
| ตีความ/จัดการคำขอ | `GET/POST /api/requests`, `PATCH /api/requests/{id}` (มี version), `POST /api/requests/confirm-all` | `POST /requests/interpret` | **โมเดลต่างกัน:** คำขอเป็นทรัพยากรที่มี `confirmed`, `version`, `read_by` (rules/person/ai) · "ตีความ" เกิดตอนอัปโหลด/เพิ่มคำขอ · `PATCH` ต้องส่ง version (ชนกัน = แจ้งว่าถูกแก้) |
| เริ่มจัดตาราง | `POST /api/runs` (ข้อมูล seed) | `POST /schedules` | เริ่ม job |
| สถานะ/ความคืบหน้า | `GET /api/jobs/{id}`, `GET /api/jobs/{id}/events` (SSE) | `GET /schedules/{id}` | |
| ยกเลิก | `POST /api/jobs/{id}/cancel` | `POST /schedules/{id}/cancel` | |
| ผลล่าสุด | `GET /api/runs/latest` | `result` ใน `GET /schedules/{id}` | ผูก "latest" ไม่ใช่ id |
| ตารางรายสัปดาห์ | `GET /api/runs/latest/grid` | (เราคิดว่า UI ประกอบเอง) | Backend ประกอบให้ (กลุ่ม/ครู/ห้อง + จำนวนคาบรวม) → **ใช้ของ Backend ลดงาน UI** |
| ค้นหา | `GET /api/search` | (UI ทำเอง) | ใช้ของ Backend |
| เปรียบเทียบ | `POST /api/comparisons`, `GET /api/comparisons/latest` | `POST /evaluations` | เป็น job (async) แล้ว |
| สรุป | `GET /api/runs/latest/summary` | ฟิลด์ `summary` | endpoint แยก |
| ส่งออก | `GET /api/runs/latest/export.xlsx`, `/export.pdf` | `GET /schedules/{id}/export?format=` | |
| พื้นฐาน | `GET /api/health`; (template) `auth/*`, `me` | — | `auth/*`/`me` ตัดตาม C2 |

**ผลต่อ API-CONTRACT:** ต้องเขียน §2 ใหม่ตามตารางนี้ (เส้นทาง, ไม่มี `importId`/`jobId` สำหรับผล, requests เป็นทรัพยากร, เพิ่ม confirm, grid, search, summary) — **ผมยังไม่ได้เขียนทับ** เพราะ C2/C3 (ล็อกอิน, workspace) เปลี่ยนรูปแบบ request/response ต้องตัดสินก่อน

## 5. ต้องทำต่อ (ลำดับ)

1. **ผู้ใช้ตัดสิน** C1 (ใช้ `apps/web` เป็น UI เดียว), C2 (ไม่มีล็อกอิน), C3 (แยก workspace หรือยอมรับความเสี่ยง), C4 (2 repo หรือรวม) — คำถามอยู่ท้ายเอกสารนี้
2. ส่งไฟล์นี้ + `REQUEST-TO-BACKEND*.md` ให้เพื่อน; เพื่อน **แก้ SPEC** (C1, C2, C3, C7) แล้วบอกกลับ
3. เมื่อได้คำตอบ: ผมเขียน `API-CONTRACT.md` §2 ใหม่ตามเส้นทางจริงของ Backend แล้วแช่แข็งร่วมกัน
4. เพื่อนเริ่ม F1 (ตัดส่วน login/หน้าเว็บ) + F9 (deploy API ที่ HTTPS + CORS) และส่ง URL → แพนต่อ API จริง
5. ระหว่างนี้แพนทำ 6 หน้าบน mock ตาม `API-CONTRACT` เดิม โดยเก็บ service layer แยกเพื่อเปลี่ยนเส้นทางทีหลังได้ (ตรงกับกฎ pages ไม่เรียก fetch)

## 6. ความเสี่ยงด้านเวลา (พูดตรง ๆ)

- Backend ยังไม่มีฟีเจอร์เลยสักตัว ขณะที่งานของโจทย์เป็น 6 หน้า ซึ่งหน้า 3+4 (48 คะแนน) พึ่ง solver + ตัวตรวจกฎ ที่ยังไม่เคยลอง และต้องส่ง 16.30 น. วันเดียว
- ลำดับในแผนเพื่อน (F1 → **F9 deploy** → F2 …) ช่วยให้เจอปัญหา deploy เร็ว แต่กินเวลา ต้องแน่ใจว่า VPS/โดเมนพร้อมก่อน (Q1)
- ข้อเสนอเพื่อลดความเสี่ยง `PROPOSED`: ให้เพื่อนทำ **ตัวอ่าน Excel + ตัวตรวจกฎ 10 ข้อ + baseline** ก่อน (ทำให้หน้า 1, 3 และ 5 บางส่วนมีของจริงเร็ว) แล้วค่อยพัฒนา solver; แพนใช้ mock ตามสัญญาข้อมูลระหว่างรอ

## 7. คำถามถึงผู้ใช้

1. **C1:** ยืนยันว่าใช้ `apps/web` (JSX, Vercel) เป็นหน้าเว็บเดียว และให้เพื่อนทำแต่ Backend (ไม่ใช้ `frontend/` ของ repo เขา)?
2. **C2:** ยืนยัน "ไม่มีล็อกอิน" (SPEC ของเพื่อนยังเขียนว่ามีล็อกอินร่วม — เพื่อนต้องแก้)?
3. **C3:** ให้แยกข้อมูลตามเบราว์เซอร์ (`X-Workspace-Id`) หรือยอมรับ "ข้อมูลร่วมทั้งระบบ"? ผมแนะนำแยก เพราะกรรมการหลายคนอาจใช้พร้อมกันและไม่มีล็อกอินกั้น
4. **C4:** ส่ง 2 repo (ทั้งสองเปิดให้กรรมการดู) หรือรวม Backend เข้า repo นี้?
5. **C5:** ผู้จัดยืนยันหรือยังว่าชื่อครูในไฟล์โจทย์เป็นชื่อจริงหรือไม่? (จนกว่าจะรู้ ผมกัน `proposition data/` ไม่ให้ commit)

## 8. ผลการตัดสิน (บันทึกต่อท้าย)

| # | เรื่อง | ผล | ที่มา |
|---|---|---|---|
| C1 | UI ชุดเดียว | ใช้ `apps/web`; ปรับ services/schemas/mocks ให้เรียกตาม SPEC §6 ของ Backend (หน้าตา 6 หน้าไม่เปลี่ยน) | ผู้ใช้เลือกตัวเลือกที่แนะนำ |
| C2 | ล็อกอิน | **ไม่มีล็อกอิน** (เพื่อนต้องตัดการล็อกอินและการตรวจสิทธิ์ของ `/api` ที่เกี่ยวกับ 6 หน้า + ใส่ rate limit แทน และแก้ SPEC §2/§6) | ผู้ใช้เลือกตัวเลือกที่แนะนำ |
| C3 | แยก workspace | **ยังเปิด** — contract ปัจจุบันยังใช้ข้อมูลร่วมทั้งระบบตาม SPEC | รอผู้ใช้ |
| C4 | จำนวน repo | **ยังเปิด** | รอผู้ใช้ |
| C5 | ข้อมูลโจทย์ใน git | `proposition data/` อยู่ใน `.gitignore` จนกว่าผู้จัดตอบ | ผม (ย้อนกลับได้) |

หมายเหตุการทำงานคู่ขนาน: session ฝั่ง Frontend เขียน API-CONTRACT **§1.2 (v0.3)** และกำลังแก้ `apps/web/src/{services,schemas,mocks}` ตาม SPEC อยู่แล้ว เอกสารนี้ไม่ได้เขียนทับ ข้อสังเกต: `API-CONTRACT.md` ยังมี §2 เดิม (`/api/v1/...`) ค้างอยู่ใต้ §1.2 ซึ่งขัดกัน ควรลบหรือทำเครื่องหมาย "แทนที่แล้ว" เมื่อ Frontend แก้เสร็จ และรหัส error/สถานะใน §1.2 (`RUN_IN_PROGRESS`, `status: valid|invalid`) ต่างจากชื่อใน SPEC (`checked|active|replaced`) ต้องให้เพื่อนยืนยันชุดเดียว
