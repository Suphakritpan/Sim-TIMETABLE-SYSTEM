# ARCHITECTURE — Sim-TIMETABLE-SYSTEM

สถานะ: **ร่างเพื่อตกลงร่วมกัน (v0.3)** — ส่วน Frontend (§3–§6) ปรับให้ตรงโค้ดที่สร้างแล้วใน `apps/web` — ผู้อ่าน: แพน (Frontend) และเพื่อน (Backend)
สัญญาข้อมูลอยู่ใน [API-CONTRACT.md](API-CONTRACT.md)

**ป้ายสถานะ (ใช้ทั้งสองเอกสาร)**
- `CONFIRMED` = ยืนยันจากเอกสารโจทย์/ไฟล์ Excel ตามภาคผนวกแล้ว (แหล่ง: โฟลเดอร์ `proposition data/`)
- `PROPOSED` = ข้อเสนอทางเทคนิค ยังไม่ใช่ข้อกำหนด เจ้าของต้องยืนยัน
- `UNVERIFIED` = ยังต้องตรวจสอบกับโจทย์หรือทดสอบจริงก่อนใช้


## 1. Tech stack

| ส่วน | เทคโนโลยี | สถานะ | เจ้าของ |
|---|---|---|---|
| Frontend | React + Vite, JSX | CONFIRMED (โจทย์ไม่บังคับภาษา/framework/ที่ deploy → ทีมเลือกเอง) | แพน |
| Routing / State | React Router, React state + Context (ไม่เพิ่ม state library) | PROPOSED | แพน |
| Backend | Python | CONFIRMED (โจทย์ไม่บังคับภาษา/framework/ที่ deploy → ทีมเลือกเอง) | เพื่อน |
| Python framework | FastAPI (มี template ติดตั้งไว้แล้วตามฝั่งเพื่อน) + PostgreSQL | UNVERIFIED (รอเห็น template) | เพื่อน |
| Excel / PDF | openpyxl (อ่าน+เขียน) · WeasyPrint + ฟอนต์ Sarabun (ยังไม่ทดสอบตัดคำไทย) | UNVERIFIED | เพื่อน |
| งานจัดตารางแบบ async | worker แยกโปรเซส + job/event/schedule_run ใน PostgreSQL; ความคืบหน้าผ่าน SSE | UNVERIFIED | เพื่อน |
| เก็บ job/ผลลัพธ์ | ต้องตัดสินใจ (ดู §7) — ห้ามพึ่ง memory ของ process ถาวร | PROPOSED (เปิดอยู่) | เพื่อน |
| Deploy | **CONFIRMED (ผู้ใช้เลือก B):** Frontend บน Vercel (Root = `apps/web`) + Backend บน VPS ด้วย Docker (api + worker + PostgreSQL + Caddy HTTPS) เรียกข้ามโดเมนแบบไม่ใช้ cookie — รายละเอียดใน [DEPLOYMENT.md](DEPLOYMENT.md); โดเมนของ API ยังไม่มี | ผู้ใช้ตัดสินแล้ว | ทั้งคู่ |

## 2. โครงสร้าง repo

ดูรายละเอียดที่ [FOLDER-STRUCTURE.md](FOLDER-STRUCTURE.md) (เอกสารเดียวที่กำหนดโครงสร้างโฟลเดอร์) ทิศทางพึ่งพา Backend: `routers → services → algorithm/io/llm/jobs`

## 3. หลักสำคัญ: pages ไม่เรียก `fetch()`

```
Page ──► services/index.js ──► (VITE_DATA_MODE)
                                 ├─ mock → mocks/mockServices.js
                                 └─ api  → services/httpServices.js → httpClient.js → Python API
```

- `services/index.js` เป็น **จุดเดียว** ที่อ่าน `VITE_DATA_MODE` แล้วเลือก implementation
- Mock กับ HTTP ต้องมี **ชื่อฟังก์ชันและรูปแบบข้อมูลเหมือนกันทุกประการ** (ตามตาราง §4)
- `httpClient.js` เป็นที่เดียวที่เรียก `fetch`: ใส่ base URL, timeout, แปลง error envelope เป็น `ApiError` (มี `code`, `status`, `details`)
- Response ทุกตัวผ่าน `schemas/apiSchemas.js` ตรวจก่อนถึง page ทั้งฝั่ง mock และ api เพื่อให้ mock เลื่อนออกจาก contract ไม่ได้
- Page จัดการ 4 สถานะ: loading / error / empty / success และแปลง `error.code` เป็นข้อความไทยเอง (ไม่แสดงข้อความดิบจาก backend)

### Interface — ติดตั้งแล้ว (mock ใช้งานได้; ฝั่ง api ยังไม่ได้ทดสอบกับ Backend จริง)
ผ่าน lint, vitest (schema + ตัวประกอบตาราง) และ build; การสลับ mock↔api ทำที่ `services/index.js` จุดเดียว

```js
// services/index.js — จุดสลับจุดเดียว
const impl = ENV.dataMode === 'mock' ? mock : http
export const { importService, requestService, scheduleService, evaluationService, exportService } = impl

// หน้า 3 — ไม่รู้ว่าเป็น mock หรือ api
const { jobId } = await scheduleService.start({ seed, method: GENERATE_METHOD })
const job = await scheduleService.getStatus(jobId)   // useJobPolling เรียกซ้ำจนถึงสถานะสุดท้าย
```

### สถานะฝั่งเซิร์ฟเวอร์ (contract v0.3)
ตาม SPEC ของ Backend ชุดข้อมูลที่ยืนยัน คำขอพิเศษ และผลจัดตารางล่าสุด **เก็บฝั่งเซิร์ฟเวอร์** ไม่ส่งกลับไปมาจาก browser
`app/SessionProvider.jsx` เก็บเฉพาะสถานะหน้าจอ (ชุดข้อมูลที่ยืนยัน, seed, ผลล่าสุด) และโหลดจากเซิร์ฟเวอร์ตอนเปิดหน้า/รีเฟรช (`getActive`, `getLatestRun`); `app/HydrationGate.jsx` แสดงโครงรอจนโหลดเสร็จ
งานจัดตารางติดตามด้วย SSE (`GET /api/jobs/{id}/events`) เป็นหลัก และ `GET /api/jobs/{id}` เป็นตัวสำรอง

## 4. ตาราง หน้า → Service → Endpoint → Fixture

ชื่อหน้า คะแนน และสิ่งที่ต้องทำ `CONFIRMED` จากโจทย์ §4 · service/endpoint/fixture `PROPOSED`
หลายหน้าใช้ผลจาก API เดียวกัน จึงไม่มี endpoint แยกต่อหน้า

| หน้า (คะแนน) | Page | Service function | Endpoint (contract §1.2) | Mock fixture |
|---|---|---|---|---|
| 1 นำเข้าข้อมูล (11) | ImportPage | `importService.upload(file)` · `confirm(id)` · `getActive()` | `POST /api/datasets` · `POST /api/datasets/{id}/confirm` · `GET /api/datasets/active` | `import-success`, `import-errors` |
| 2 คำขอพิเศษ (4) | RequestsPage | `requestService.list/add/update/confirmAll` | `GET\|POST /api/requests` · `PATCH /api/requests/{id}` · `POST /api/requests/confirm-all` | `request-interpret` |
| 3 จัดตาราง (25) | GeneratePage | `scheduleService.start/getStatus/cancel/getLatestRun` | `POST /api/runs` · `GET /api/jobs/{id}` (+ SSE `/events`) · `POST /api/jobs/{id}/cancel` · `GET /api/runs/latest` | `schedule-success`, `schedule-partial` |
| 4 ดูตาราง (23) | TimetablePage | ใช้ผลล่าสุดใน session + ชุดข้อมูล (ประกอบมุมมองกลุ่ม/ครู/ห้องฝั่ง UI ด้วย `utils/timetable.js`) | เดิม | เดิม |
| 5 ผลการใช้ AI (16) | EvaluationPage | `evaluationService.run({seed})` | `POST /api/comparisons` · `GET /api/comparisons/latest` | `evaluation-result` (`isSimulated: true`) |
| 6 สรุปและส่งออก (4) | SummaryPage | ผลล่าสุดใน session (`utils/summary.js`) + `exportService.download(format)` | `GET /api/runs/latest/export.xlsx\|pdf` | `/samples/export-format-example.xlsx` |
| ทั้งเว็บ (2) | — | ต้องใช้ได้บนคอมพิวเตอร์และมือถือ (responsive) | | |

endpoint ทั้งหมดเป็น `PROPOSED` รอ Backend ยืนยัน (ดู API-CONTRACT §1.2 และ BACKEND-REPO-REVIEW.md); §2 เดิมใน API-CONTRACT ถูกแทนที่แล้ว

> **ทิศทาง API (ผู้ใช้ฝั่งแพนตัดสิน 2026-10-31 = ทาง A, รอฝั่งเพื่อนอนุมัติ):** Backend สร้าง `/api/v1/*` ตาม schema เดิมของเว็บ (API-CONTRACT §2 เดิม: `imports`, `requests/interpret`, `schedules`, `evaluations`) — เสนอเป็น DEC-002 (Proposed) บนสาขา `comms` แทน DEC-001 ข้อ 2; **โค้ด `apps/web` ปัจจุบันยังเรียก route แบบ §1.2 (v0.3) จึงต้องย้ายกลับเป็น `/api/v1` ก่อนเชื่อม Backend — ยังไม่ได้ทำ** และตาราง/§1.2 นี้เป็นสถานะปัจจุบันของโค้ด ไม่ใช่ทิศทางสุดท้าย

ไฟล์แม่แบบเปล่า + ไฟล์ตัวอย่าง 3 ขนาด (เล็ก/กลาง/ใหญ่) เป็น static file ใน `apps/web/public/samples/` (`EXISTS`); ชุดตัวอย่างสร้างโดย `scripts/generate_sample_data.py` (ข้อมูลสมมติ seed คงที่)

## 5. ระบบ Mock

- เลือกชุดสถานการณ์ด้วย `VITE_MOCK_SCENARIO` (ค่าเริ่มต้น `success`) เพื่อให้ทดสอบได้ครบ ไม่ใช่เห็นแต่ทางที่สำเร็จ:
  `success` · `import-errors` · `schedule-partial` · `schedule-failed` · `api-down` (ยกเลิกระหว่างคำนวณทดสอบได้โดยกดยกเลิกในหน้า 3; ไฟล์ชื่อมีคำว่า `error` ก็ได้ผลตรวจข้อมูลผิดในโหมด mock)
- Mock job ผ่านสถานะตาม lifecycle ของ contract (`queued → running → …`) พร้อม `stage` เป็นข้อความขั้นตอน **ห้ามสุ่มเปอร์เซ็นต์ปลอมเป็นผลประมวลผล** ถ้า API จริงไม่ส่ง `progress` ให้ UI แสดงแค่ stage
- หน้า Evaluation ในโหมด mock ต้องแสดงป้าย "ข้อมูลจำลอง" (ดูฟิลด์ `isSimulated` ใน contract)
- Fixtures อยู่ที่ `apps/web/src/mocks/fixtures/` (สร้างจากไฟล์ชุดทดลองจริง ไม่ใช่ผลของอัลกอริทึมจริง) ทุก response ผ่าน `schemas/apiSchemas.js` ก่อนถึงหน้า; `packages/shared/` ยังไม่ถูกสร้าง จึงยังไม่มี fixtures กลางร่วมกับ Backend
- Mock จำลองเซิร์ฟเวอร์ที่ "จำสถานะ" (ชุดข้อมูลที่ยืนยัน คำขอที่มี `version` งาน ผลล่าสุด) ในหน่วยความจำของหน้าเว็บ รีโหลดแล้วเริ่มใหม่

## 6. Environment variables

| ตัวแปร | ตัวอย่าง | หมายเหตุ |
|---|---|---|
| `VITE_DATA_MODE` | `mock` \| `api` | dev = mock, production = api |
| `VITE_API_BASE_URL` | `http://localhost:8000` | production ตั้งใน Vercel; ห้ามใส่ secret (ตัวแปร `VITE_*` ฝังในโค้ด browser) · `src/config/env.js` ตรวจทุกตัวตอนเริ่มแอป ค่าขาด/ผิดรูปแบบ = ล้มทันที |
| `VITE_MOCK_SCENARIO` | `success` | ใช้เมื่อ mock เท่านั้น (ค่าที่รองรับดู §5) |
| `VITE_POLL_INTERVAL_MS` | `1500` | polling สถานะงาน หยุดเมื่อถึงสถานะสุดท้าย (dev = 1000) |
| `VITE_MAX_UPLOAD_MB` | `10` | ต้องตรงกับ limit ใน contract |
| `VITE_REQUEST_TIMEOUT_MS` | `15000` | timeout ของทุก request ที่ `httpClient` |
| `VITE_SITE_URL` | `https://<โดเมนจริง>` | บังคับ ไม่มี `/` ท้าย; ใช้สร้าง sitemap.xml / robots.txt / llms.txt ตอน build (`scripts/seoFiles.js`) |
| Backend: `ALLOWED_ORIGINS` | `https://<โดเมนจริง>` | CORS ระบุ origin จริงเท่านั้น |

## 7. การตัดสินใจและความเสี่ยงที่เหลือ

**ตัดสินแล้ว (โดยผู้ใช้)**
- โจทย์ไม่บังคับภาษา/framework/ที่ deploy `CONFIRMED`
- เว็บเป็นสาธารณะ ไม่มีระบบล็อกอิน (โจทย์ระบุเรื่องรหัสผ่านเฉพาะ "ถ้าเว็บมีหน้าเข้าสู่ระบบ")
- ข้อมูลอาจมีข้อมูลส่วนบุคคล แต่ไม่เผยแพร่ (ดู CLAUDE.md §13)
- เวลาทำงานจำกัด: **เสร็จภายในวันเดียว** (ส่ง 16.30 น. วันที่ 1; หลังส่งห้ามแก้เว็บ/โค้ด)
- ใช้ไลบรารีช่วยแทนการเขียนเอง (ตัวอย่าง `PROPOSED`: Frontend — React Router, ไลบรารีตารางเวลา/UI, ตรวจ schema; Backend — FastAPI, openpyxl, ตัวแก้ปัญหา constraint เช่น OR-Tools CP-SAT สำหรับจัดตาราง)

**ยังเปิดอยู่ (เพื่อนตอบ)**

| # | เรื่อง | สถานะ |
|---|---|---|
| 1 | อัลกอริทึมของทีม (CP-SAT / heuristic + local search ฯลฯ) และวิธีพื้นฐานเทียบ | PROPOSED |
| 2 | ชุดใหญ่ ≈ 600 รายการ ต้องไม่ค้าง: timeout/ขีดเวลาที่ยอมรับได้ | UNVERIFIED |
| 3 | Host ของ Backend ที่รัน job ยาวได้ (ไม่ใช่ serverless ที่ตัด request เร็ว) และที่เก็บ job/ผล ระหว่าง request | PROPOSED |
| 4 | LLM ตีความคำขอ: เลือกโมเดล (Qwen/DeepSeek ตามโจทย์) และ key เก็บฝั่ง Backend เท่านั้น + fallback เป็นกฎ/ฟอร์มเมื่อ LLM ล่ม | PROPOSED |
| 5 | seed เดิม → ผลเดิม: ต้องไม่มี randomness นอก seed รวมถึง solver multi-thread | UNVERIFIED |
| 6 | `progress` ละเอียดแค่ไหน | UNVERIFIED |
| 7 | ชนิดคำขอพิเศษ (`constraint.kind`) ที่ครอบคลุมชุดข้อมูลที่ไม่เคยเห็น | UNVERIFIED |
| 8 | คำนวณคะแนนโทษข้อ จ (คำขอพิเศษแบบทำถ้าทำได้) ทีมกำหนดน้ำหนัก | PROPOSED |

**สิ่งที่ต้องส่ง (โจทย์ §5) `CONFIRMED`:** ลิงก์เว็บ · ลิงก์ซอร์สโค้ด (เช่น GitHub) · คู่มือ 1 หน้า (เปิดเว็บแล้วกดอะไรตามลำดับ) · (แนะนำ) วิธีเปิดเว็บในเครื่องตัวเองกรณีเว็บออนไลน์มีปัญหา
