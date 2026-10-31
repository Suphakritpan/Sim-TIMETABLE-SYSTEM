# API-CONTRACT — Sim-TIMETABLE-SYSTEM

สถานะ: **ร่าง v0.2** · แก้ร่วมกันโดยแพน (Frontend) และเพื่อน (Backend)
แหล่งอ้างอิงโจทย์: `proposition data/` — `1_อ่านก่อน_โจทย์.pdf` (เรียกว่า **โจทย์**), `2_…ชุดทดลอง_4กลุ่ม.xlsx`, `3_…ชุดหลัก_12กลุ่ม.xlsx`, `4_ตัวอย่างไฟล์ตารางสอนที่ต้องส่งออก.xlsx`
ข้อมูลตัวอย่างในเอกสารนี้ดัดแปลงจากไฟล์โจทย์ (ยังไม่ยืนยันว่าชื่อบุคคลในไฟล์เป็นชื่อสมมติหรือจริง — ดู BACKEND-REPO-REVIEW.md C5 จึงใช้ชื่อสมมติของเราเองใน fixtures)

> ⚠️ **ต้องกระทบยอดกับ Backend จริง (UNVERIFIED)** — ข้อมูลจากเพื่อน: template Backend มี 18 endpoint ใต้ `/api` ที่เห็นแล้ว 9 ตัว: `GET /api/health`, `GET /api/auth/options`, `POST /api/auth/dev-login` (dev เท่านั้น), `POST /api/auth/logout`, `GET|PATCH /api/me`, `POST /api/jobs`, `GET /api/jobs/{job_id}`, `GET /api/jobs/{job_id}/events` (SSE) — อีก 9 ตัวอยู่ใน `routes/documents.py`, `routes/admin.py` (ยังไม่เห็น)
> - รายการนี้เป็นของ **template ปัจจุบัน** F1 จะลบ documents/users/หน้า jobs ตัวอย่าง → **Frontend ห้ามยึดรายการนี้** ให้ยึดตารางหัวข้อ 6 ของ `docs/SPEC.md` ของ Backend (**ไฟล์นั้นไม่อยู่ใน repo นี้ — รอเพื่อนส่งสำเนาหรือ `openapi.json`**)
> - `/api/jobs*` ใน template ต้องล็อกอิน (admin/staff) ขัดกับที่ตัดสินแล้วว่า **ไม่มีล็อกอิน** → เพื่อนต้องยืนยันว่า endpoint ที่หน้าเว็บใช้เป็นสาธารณะ และไม่มี `dev-login`/cookie ใน production
> - ชื่อ/รูปแบบใน contract นี้ (`/api/v1/schedules` ฯลฯ) ยังไม่ใช่ของจริง เมื่อได้ SPEC §6 ให้ **ยึดของ Backend เว้นแต่ขัดโจทย์** แล้วแก้ contract + Changelog (เป็น breaking)
> - วิธีรับความคืบหน้าของ Backend คือ **SSE** (`/jobs/{id}/events`) — เอกสารนี้ยังเขียน polling ไว้ ต้องปรับตามจริง

**กติกาแก้ไข:** ทุกการเปลี่ยนต้องลงบันทึกใน [Changelog](#changelog) ระบุว่า breaking หรือไม่ และแจ้งอีกฝ่ายก่อน merge
**ความรับผิดชอบ:** เพื่อน = ความถูกต้องของผลอัลกอริทึม · แพน = การแสดงผล

**ป้ายสถานะ**
- `CONFIRMED` = ยืนยันจากโจทย์/ไฟล์ในโฟลเดอร์ `proposition data/` แล้ว (ระบุแหล่งไว้)
- `PROPOSED` = ข้อเสนอทางเทคนิค เจ้าของต้องยืนยัน
- `UNVERIFIED` = ต้องตรวจกับโจทย์/ทดสอบจริงก่อนใช้

---

## 0. ข้อตกลงทั่วไป

| เรื่อง | ข้อตกลง | สถานะ |
|---|---|---|
| Base path | `/api/v1` | PROPOSED |
| รูปแบบ | JSON UTF-8; อัปโหลด = `multipart/form-data`; ส่งออก = ไฟล์ | PROPOSED |
| วัน | สตริงไทยตามไฟล์โจทย์: `จันทร์` `อังคาร` `พุธ` `พฤหัสบดี` `ศุกร์` (ใช้ตรงตัวเพราะไฟล์ส่งออกใช้ค่านี้) | CONFIRMED (ไฟล์ตัวอย่าง `4_`) |
| คาบ | จำนวนเต็ม 1–8 ต่อวัน (08.00–17.00 น. คาบละ 1 ชม.; เช้า 1–4, พักเที่ยง 12–13 ไม่นับคาบ, บ่าย 5–8) | CONFIRMED (โจทย์ §3) |
| วันพุธคาบ 7–8 | เวลากิจกรรม ห้ามจัดเรียน | CONFIRMED (โจทย์ §3) |
| ค่าตารางเวลาข้างต้น | ห้าม hardcode ในโค้ด ให้ส่งใน `GET /imports/{id}` ฟิลด์ `calendar` (โจทย์ย้ำว่าข้อมูลชุดใหม่ต้องใช้ได้) | PROPOSED |
| ID | รหัสจากไฟล์ใช้ตรงตัว (`TIT01`, `LR-01`, `IT-H11`, `S0007`, `30001-2011`); ID ของระบบ (`importId`, `jobId`) เป็นสตริงทึบ | CONFIRMED / PROPOSED |
| Seed | จำนวนเต็ม; seed เดิม + ข้อมูลเดิม = ผลเดิมทุกครั้ง ระบบตอบ `seed` ที่ใช้กลับเสมอ | CONFIRMED (โจทย์ หน้า 3, 5) |
| เวลาของ event | UTC ISO-8601 (`createdAt`, `finishedAt`) | PROPOSED |
| ฟิลด์ที่ไม่รู้จัก | Client เพิกเฉย (เพิ่มฟิลด์ไม่ถือเป็น breaking) | PROPOSED |
| อัปโหลด | `.xlsx` เท่านั้น ขนาด ≤ 10 MB | PROPOSED |
| Authentication | **ไม่มี** (เว็บสาธารณะ ไม่มีหน้าล็อกอิน) | CONFIRMED (ผู้ใช้ตัดสิน) |
| CORS | เฉพาะ origin ที่ตั้งใน `ALLOWED_ORIGINS` (Vercel จริง; ไม่ใช้ `*`, ไม่ใช้ credentials), expose `Content-Disposition` — ดู DEPLOYMENT.md §3.2 | PROPOSED |

### 0.1 Error envelope (HTTP ≥ 400) — PROPOSED

```json
{ "error": { "code": "IMPORT_NOT_FOUND", "message": "ข้อความสำหรับ dev/log (UI ห้ามแสดงตรง ๆ)", "details": [{ "field": "importId", "reason": "ไม่พบรหัสนี้" }], "requestId": "req_7f3a" } }
```

### 0.2 รหัสข้อผิดพลาด — PROPOSED

| code | HTTP | ความหมาย |
|---|---|---|
| `VALIDATION_FAILED` | 422 | พารามิเตอร์ request ผิดรูปแบบ |
| `FILE_TOO_LARGE` | 413 | ไฟล์เกินขนาด |
| `UNSUPPORTED_FILE_TYPE` | 415 | ไม่ใช่ `.xlsx` |
| `FILE_UNREADABLE` | 400 | เปิดไฟล์ไม่ได้/เสียหาย |
| `IMPORT_NOT_FOUND` | 404 | ไม่พบ import |
| `IMPORT_NOT_VALID` | 409 | ใช้ import ที่ `status != valid` |
| `SCHEDULE_NOT_FOUND` | 404 | ไม่พบ job |
| `SCHEDULE_NOT_READY` | 409 | อ่านผล/ส่งออกตอนงานยังไม่สิ้นสุด |
| `INTERPRET_FAILED` | 422 | ตีความคำขอไม่ได้ |
| `EVALUATION_FAILED` | 500 | ประเมินผลล้มเหลวภายใน |
| `EXPORT_FORMAT_UNSUPPORTED` | 400 | `format` ไม่ใช่ `pdf`/`xlsx` |
| `INTERNAL_ERROR` | 500 | ข้อผิดพลาดภายใน |

### 0.3 หลักการ: "ข้อมูลผิด" ≠ "API พัง" — PROPOSED

- ไฟล์เปิดได้แต่ข้อมูลผิด → `201` + `status: "invalid"` + `issues[]`
- จัดตารางไม่ได้/ไม่ครบ → job `status` เป็น `completed_partial` หรือ `infeasible` พร้อมเหตุผล (โจทย์: "ถ้าข้อมูลจัดไม่ได้จริง ต้องบอกเหตุผล ห้ามค้าง" — CONFIRMED)
- error envelope ใช้เฉพาะ request ผิดหรือระบบผิดพลาด

### 0.4 สถานะงาน (Job status) — PROPOSED

```
queued ─► running ─► completed          (จัดครบ ไม่ผิดกฎ)
                ├─► completed_partial   (จัดบางส่วน มี unscheduled)
                ├─► infeasible          (ข้อมูลจัดไม่ได้จริง มี reasons[])
                ├─► failed              (ระบบผิดพลาด)
                └─► cancelled
queued ─► cancelled
```
สถานะสุดท้าย: `completed`, `completed_partial`, `infeasible`, `failed`, `cancelled` — UI หยุด polling และห้ามเปลี่ยนอีก
(การมี "ยกเลิกระหว่างคำนวณ" และ "แถบความคืบหน้า" = CONFIRMED โจทย์ หน้า 3)

---

## 1. โมเดลข้อมูล

### 1.1 ข้อมูลนำเข้า — โครงสร้างไฟล์ Excel `CONFIRMED` (ไฟล์ `2_`, `3_`)

ไฟล์มี **7 แผ่นงาน** ชื่อและหัวคอลัมน์ตรงตัวดังนี้ (โจทย์ §2):

| แผ่นงาน | คอลัมน์ (ตามลำดับ) |
|---|---|
| `ครู` | รหัสครู · ชื่อครู · แผนก · สอนได้สูงสุดต่อวัน (คาบ) |
| `เวลาไม่สะดวก` | รหัสครู · วัน · ตั้งแต่คาบ · ถึงคาบ |
| `ห้อง` | รหัสห้อง · ชื่อห้อง · ประเภทห้อง · ความจุ (คน) · อาคาร |
| `กลุ่มเรียน` | รหัสกลุ่ม · ชื่อกลุ่ม · แผนก · จำนวนนักเรียน (คน) |
| `รายวิชา` | รหัสวิชา · ชื่อวิชา · ท-ป-น · แผนก · ห้องที่ใช้เรียนปฏิบัติ |
| `รายการสอน` | รหัสรายการสอน · รหัสวิชา · กลุ่มที่เรียน (หลายกลุ่มคั่นด้วย `,`) · รหัสครูผู้สอน |
| `คำขอพิเศษ` | ลำดับ · ผู้ส่งคำขอ · ข้อความคำขอ |

ความหมาย `CONFIRMED` (โจทย์ §2):
- `ท-ป-น` = ชั่วโมงทฤษฎี–ปฏิบัติ–หน่วยกิต เช่น `1-4-3`; **หน่วยกิตไม่ใช้จัดตาราง**
- 1 รายการสอน = ทฤษฎี (ท คาบ, ห้องบรรยาย) **และ/หรือ** ปฏิบัติ (ป คาบติดกัน, ห้องตามช่อง `ห้องที่ใช้เรียนปฏิบัติ`) → จัด 1 หรือ 2 ครั้ง; ถ้า ป = 0 ช่อง `ห้องที่ใช้เรียนปฏิบัติ` ว่าง
- `ห้องที่ใช้เรียนปฏิบัติ` ในไฟล์ตัวอย่างเป็น **ประเภทห้อง** (`ห้องคอมพิวเตอร์`, `ห้องปฏิบัติการไฟฟ้า`) ไม่ใช่รหัสห้อง
- หลายกลุ่มในช่องเดียว (`IT-H11,IT-H12`) = เรียนรวม: ทุกกลุ่มต้องว่างพร้อมกัน และห้องต้องจุผลรวมนักเรียน
- ขนาดชุดข้อมูล: ทดลอง 4 กลุ่ม (29 รายการสอน), หลัก 12 กลุ่ม (83 รายการสอน), ชุดใหญ่ที่กรรมการใช้ ≈ 600 รายการ

โมเดลฝั่ง API (ชื่อฟิลด์ camelCase เป็น `PROPOSED`, ความหมายมาจากคอลัมน์ข้างบน):

```jsonc
Teacher         { "teacherId": "TIT05", "name": "…", "department": "…", "maxPeriodsPerDay": 4 }
Unavailability  { "teacherId": "TIT01", "day": "อังคาร", "fromPeriod": 8, "toPeriod": 8 }
Room            { "roomId": "COM-01", "name": "ห้องคอมพิวเตอร์ COM-01", "type": "ห้องคอมพิวเตอร์", "capacity": 40, "building": "อาคาร 1" }
Group           { "groupId": "IT-H11", "name": "ปวส.1/1 เทคโนโลยีสารสนเทศ", "department": "…", "size": 32 }
Subject         { "subjectId": "30001-2011", "name": "…", "theory": 1, "practice": 4, "credits": 3, "department": "…", "practiceRoomType": "ห้องคอมพิวเตอร์" }
Assignment      { "assignmentId": "S0007", "subjectId": "30001-2011", "groupIds": ["IT-H11"], "teacherId": "TIT05" }
RawRequest      { "requestId": "R04", "requester": "…", "text": "…" }
```

### 1.2 ผลการจัดตาราง

**แถวผลลัพธ์ (Placement)** — `CONFIRMED` เพราะตรงกับไฟล์ส่งออกตามภาคผนวก (โจทย์ §5, ไฟล์ `4_`):
```json
{ "assignmentId": "S0007", "type": "ปฏิบัติ", "day": "ศุกร์", "startPeriod": 1, "periodCount": 4, "roomId": "COM-01" }
```
`type` ∈ `ทฤษฎี` | `ปฏิบัติ` · 1 แถว = 1 ครั้งที่จัดลงตาราง

**กฎห้ามผิด 10 ข้อ** `CONFIRMED` (โจทย์ §3 — ผิดข้อเดียวตารางใช้ไม่ได้) → รหัสข้อขัดแย้ง (`violation.rule` เลข 1–10 `CONFIRMED`; ชื่อ `code` เป็น `PROPOSED`):

| rule | code | ความหมาย |
|---|---|---|
| 1 | `TEACHER_CLASH` | ครูสอนซ้อนเวลา |
| 2 | `ROOM_CLASH` | ห้องถูกใช้ซ้อนเวลา |
| 3 | `GROUP_CLASH` | กลุ่มเรียนซ้อนเวลา |
| 4 | `ASSIGNMENT_NOT_PLACED` / `ASSIGNMENT_DUPLICATED` | รายการสอนไม่ครบ/ซ้ำ |
| 5 | `CROSSES_LUNCH` | คาบติดกันข้ามพักเที่ยง |
| 6 | `WRONG_ROOM_TYPE` | ประเภทห้องไม่ตรง (ทฤษฎี=ห้องบรรยาย, ปฏิบัติ=ตามวิชา) |
| 7 | `ROOM_CAPACITY_EXCEEDED` | ห้องไม่จุ |
| 8 | `WEDNESDAY_ACTIVITY` | จัดวันพุธคาบ 7–8 |
| 9 | `TEACHER_UNAVAILABLE` | จัดในช่วงที่ครูไม่สะดวก |
| 10 | `TEACHER_DAILY_LIMIT` | ครูสอนเกินต่อวัน |

หน้า 3 ต้องแสดง `CONFIRMED`: จัดครบ X จาก Y · ครูชน/ห้องชน/กลุ่มชนกี่จุด · ผิดกฎข้ออื่นกี่จุด · คะแนนโทษรวม · เวลาที่ใช้ (วินาที) · คำอธิบายสั้น ๆ ว่าจัดวิชาไหนก่อนเพราะอะไร

**คะแนนโทษ** `CONFIRMED` (โจทย์ §3 — ยิ่งน้อยยิ่งดี): ก) คาบว่างแทรกของกลุ่มเรียน ×2 · ข) คาบว่างแทรกของครู ×1 · ค) กลุ่มเรียนเกิน 6 คาบ/วัน ×3 ต่อคาบที่เกิน · ง) ทฤษฎีกับปฏิบัติของวิชาเดียวกันอยู่คนละวัน ×2 ต่อวิชา · จ) คำขอพิเศษแบบ "ถ้าทำได้" ทีมกำหนดน้ำหนักเอง (`PROPOSED`)

---

## 1.1 ส่วนเพิ่ม v0.2 — จากการอ่านโจทย์ฉบับนักเรียนและไฟล์ Excel จริง (`proposition data/`)

ทุกข้อเป็นการ **เพิ่มฟิลด์ (non-breaking)** สถานะ `PROPOSED` รอเพื่อน (Backend) ยืนยัน; ข้อที่มาจากโจทย์ตรง ๆ ติดป้าย `CONFIRMED (spec)`

| # | เรื่อง | การเพิ่ม | ที่มา |
|---|---|---|---|
| A1 | ช่องเวลา | `day` เป็นรหัสอังกฤษ `MON..FRI`; `period` 1–8; เช้า 1–4, บ่าย 5–8; **WED 7–8 = กิจกรรม ห้ามจัด** (config ฝั่ง UI แปลงเป็นชื่อไทย) | CONFIRMED (spec) §3 |
| A2 | Course | `courses[]`: `{code, name, theory, practice, credit, dept, practiceRoomType}` (จาก ท-ป-น และ "ห้องที่ใช้เรียนปฏิบัติ") | CONFIRMED (spec) §2 |
| A3 | Assignment (แทนตัวอย่างใน §1) | `{id, courseCode, groupIds: [], teacherId}`; หลายกลุ่ม = เรียนรวม; ได้จาก `GET /imports/{id}?include=assignments` | CONFIRMED (spec) §2 |
| A4 | Teacher | เพิ่ม `dept`, `maxPerDay`, `unavailable: [{day, fromPeriod, toPeriod}]` | CONFIRMED (spec) |
| A5 | Room / Group | Room `{id, name, type, capacity, building}`; Group `{id, name, dept, size}` | CONFIRMED (spec) |
| A6 | Import issue | เพิ่ม `fix` (ข้อความ "แก้อย่างไร") และ `severity`; ต้องรายงาน **ทุกจุดในครั้งเดียว** | CONFIRMED (spec) หน้า 1 |
| A7 | SpecialRequest | เพิ่ม `category`: `must` (ต้องทำตาม) \| `best_effort` (ทำถ้าทำได้) \| `no_action` (ไม่ต้องทำเพิ่ม) + `understanding` (สรุปที่ระบบเข้าใจ เช่น "ครู TIT02 / ไม่สอนคาบ 1") + `sender`; `status`: `proposed`\|`confirmed`\|`edited`\|`manual` | CONFIRMED (spec) หน้า 2 |
| A8 | ScheduledItem | เพิ่ม `kind`: `theory`\|`practice` และ `periodCount` (คาบติดกัน); 1 รายการสอนมี 1–2 รายการ | CONFIRMED (spec) ภาคผนวก |
| A9 | Result.stats | เพิ่ม `teacherConflicts`, `roomConflicts`, `groupConflicts`, `otherViolations`, `penalty`, `elapsedSeconds`, `scheduledOf`/`total` | CONFIRMED (spec) หน้า 3 |
| A10 | Result | เพิ่ม `explanation` (ระบบจัดวิชาไหนก่อนเพราะอะไร), `infeasibleReasons[]` เมื่อจัดไม่ได้, `requestResults[{requestId, outcome: met\|partial\|not_met, reason}]` | CONFIRMED (spec) หน้า 3, 6 |
| A11 | Evaluation | `metrics` เพิ่ม `penalty`, `conflicts` แยกครู/ห้อง/กลุ่ม; เพิ่ม `description`: `{method, whereAiUsed, settings}` ต่อวิธี; ต้องได้ผลเดิมเมื่อ seed เดิม | CONFIRMED (spec) หน้า 5 |
| A14 | รายการคำขอพิเศษในไฟล์ | `GET /imports/{id}` และ response ของ POST เพิ่ม `requests: [{id, sender, text}]` (แผ่นงานคำขอพิเศษ) เพื่อให้หน้า 2 แสดงทุกข้อ แล้วเรียก interpret ทีละข้อ | CONFIRMED (spec) หน้า 2 |
| A12 | Template/ตัวอย่าง | ไฟล์แม่แบบเปล่าและตัวอย่าง 3 ขนาดเป็นไฟล์สแตติกฝั่ง Frontend (`/samples/*.xlsx`) ไม่ต้องมี endpoint | PROPOSED |
| A13 | ยืนยันก่อนใช้ข้อมูล | Frontend ถือสถานะ "ยืนยันแล้ว" เอง ไม่มี endpoint เพิ่ม | PROPOSED |

ตัวเลขสรุปหน้า 6 (ห้องถูกใช้กี่ %, คาบต่อครู, คาบว่างต่อกลุ่ม) **คำนวณฝั่ง Frontend** จาก `result.items` + import (ฟังก์ชันล้วน มี test) ไม่ต้องมี endpoint เพิ่ม

---

## 1.2 v0.3 — จัดให้ตรง SPEC ของ Backend (repo `anonmianwe/test-for-AI-skills-competition`, `docs/SPEC.md` §6) — `PROPOSED`

ผู้ใช้ตัดสินแล้ว (2026-10-31): **Frontend ปรับตาม SPEC ของ Backend** และ **ไม่มีล็อกอิน** (ตัด `/api/auth/*` ออกจากหน้าทั้ง 6) SPEC กำหนดชื่อ endpoint และหลักการ "เก็บข้อมูลที่ยืนยัน/คำขอ/ผลล่าสุดฝั่งเซิร์ฟเวอร์" แต่ **ไม่ได้กำหนดรูปแบบ response** ตารางนี้คือรูปแบบที่ Frontend เสนอ (รอ Backend ยืนยัน) endpoint เดิมใน §2 (`/api/v1/imports`, `/schedules`, `/requests/interpret`, `/evaluations`) **ถูกแทนที่** (breaking สำหรับ Backend ที่ยังไม่เริ่มสร้าง จึงไม่กระทบโค้ดจริง)

| endpoint (ตาม SPEC §6) | request | response สำเร็จ | error |
|---|---|---|---|
| `POST /api/datasets` | `multipart` ฟิลด์ `file` (.xlsx ≤ 10 MB) | `201` Dataset `{id, status: valid\|invalid, confirmed: false, summary, issues[], periods, teachers[], rooms[], groups[], courses[], assignments[]}` (โครงสร้าง §1/§1.1; **ข้อมูลผิด = 201 + `status: invalid`**) | 413 `FILE_TOO_LARGE`, 415 `UNSUPPORTED_FILE_TYPE`, 400 `FILE_UNREADABLE` |
| `GET /api/datasets/active` | — | Dataset ที่ `confirmed: true` | 404 `NO_ACTIVE_DATASET` |
| `POST /api/datasets/{id}/confirm` | — | Dataset (`confirmed: true`) | 404 `DATASET_NOT_FOUND`, 409 `IMPORT_NOT_VALID` |
| `GET /api/requests` | — | `{requests: Request[], unconfirmed: n}` | — |
| `POST /api/requests` | `{text}` (ให้ระบบอ่าน) หรือ `{constraint: {kind, params, category}}` (ฟอร์ม ใช้ได้แม้ AI ไม่พร้อม) | `201` Request | 422 `VALIDATION_FAILED` |
| `PATCH /api/requests/{id}` | `{version, category?, confirmed?}` | Request (version เพิ่ม) | 409 `REQUEST_CHANGED` (R5) |
| `POST /api/requests/confirm-all` | — | `{requests, unconfirmed: 0}` | — |
| `POST /api/runs` | `{seed, method?: "team"}` (คำขอที่ยืนยันแล้วอ่านจากฝั่งเซิร์ฟเวอร์ ไม่ส่งมา) | `202` Job | 409 `RUN_IN_PROGRESS`, 409 `NO_ACTIVE_DATASET` |
| `GET /api/jobs/{id}` | — | Job `{id, kind: schedule\|compare, status: queued\|running\|done\|failed\|cancelled, result: {runId}\|null, error: {code, message}\|null}` | 404 |
| `GET /api/jobs/{id}/events` (SSE) | `Last-Event-ID` | `id: n` + `data: {"stage": "ASSIGNING_SLOTS", "progress": 0.4 \| null}`; จบด้วย `event: end` `data: {"status": ...}` — **ต้องปิดสตรีมเมื่อ `cancelled` ด้วย** | 404 |
| `POST /api/jobs/{id}/cancel` | — | Job (idempotent) | 404 |
| `GET /api/runs/latest` | — | Run `{id, seed, method, outcome: complete\|partial\|infeasible, items[], conflicts[], unscheduled[], stats{}, explanation, infeasibleReasons[], requestResults[]}` (ฟิลด์ตาม A8–A10) | 404 `NO_RUN` |
| `POST /api/comparisons` | `{seed}` | `202` Job (kind `compare`) | 409 `RUN_IN_PROGRESS`, 409 `NO_ACTIVE_DATASET` |
| `GET /api/comparisons/latest` | — | Evaluation (A11) | 404 |
| `GET /api/runs/latest/export.xlsx`, `export.pdf` | — | ไฟล์ (รูปแบบภาคผนวก) | 404 `NO_RUN` |

**Request** (คำขอพิเศษ): `{id, text, sender, source: rule\|ai\|manual, kind, category: must\|best_effort\|no_action, params, understanding, confirmed, version, needsPerson, confidence?}` — `needsPerson: true` = ระบบอ่านไม่ได้ ต้องให้คนกรอกผ่านฟอร์ม

**ส่วนของ SPEC ที่ Frontend ไม่ใช้ (คำนวณฝั่ง Frontend จาก `Run.items` + Dataset แทน):** `GET /api/runs/latest/grid`, `GET /api/search`, `GET /api/runs/latest/summary` — Backend ข้ามได้ถ้าไม่มีเวลา; ถ้าทำ ตัวเลขต้องตรงกับที่ Frontend คำนวณ (ตัวคำนวณมี test)

> ⚠️ **ทิศทาง API (ผู้ใช้ฝั่งแพนตัดสิน 2026-10-31 = ทาง A, รอฝั่งเพื่อนอนุมัติ):** Backend สร้าง `/api/v1/*` ตาม schema เดิมของเว็บ (API-CONTRACT §2 เดิม: `imports`, `requests/interpret`, `schedules`, `evaluations`) — เสนอเป็น DEC-002 (Proposed) บนสาขา `comms` แทน DEC-001 ข้อ 2; **โค้ด `apps/web` ปัจจุบันยังเรียก route แบบ §1.2 (v0.3) จึงต้องย้ายกลับเป็น `/api/v1` ก่อนเชื่อม Backend — ยังไม่ได้ทำ** และตาราง/§1.2 นี้เป็นสถานะปัจจุบันของโค้ด ไม่ใช่ทิศทางสุดท้าย
> ข้อสังเกตจาก friend-ai (ยังไม่ได้ตรวจกับโค้ดของเขา): สถานะ job ในตารางนี้ไม่มี `infeasible`/`completed_partial` (Frontend แปลงจาก `Run.outcome` เอง) และ SSE ต้องปิดสตรีมเมื่อ `cancelled` ด้วย

**ข้อควรระวังฝั่ง Backend:** เมื่อใช้ SSE ข้ามโดเมน `EventSource` ใส่ header เองไม่ได้ (ไม่มี cookie/credentials) · Frontend ใช้ `GET /api/jobs/{id}` poll เป็นทางสำรองเสมอ

## 2. Endpoints

> ชุด endpoint และชื่อทั้งหมดเป็น `PROPOSED` (เพื่อนต้องยืนยัน) แต่ **ความสามารถที่ต้องรองรับ** `CONFIRMED` ตามโจทย์ หน้า 1–6

### 2.1 `POST /api/v1/imports` — อัปโหลดและตรวจไฟล์ (หน้า 1)

**หน้าที่:** รับ Excel, ตรวจ **ทุกจุดในครั้งเดียว** (โจทย์: "บอกแผ่นงานไหน แถวไหน ผิดอะไร แก้อย่างไร ครบทุกจุดในครั้งเดียว" `CONFIRMED`)

**Request:** `multipart/form-data` ฟิลด์ `file` (`.xlsx`)

**Response `201` (ข้อมูลถูก):**
```json
{
  "importId": "imp_01HEXAMPLE1",
  "status": "valid",
  "createdAt": "2026-11-01T01:30:00Z",
  "summary": { "teachers": 8, "rooms": 5, "groups": 4, "assignments": 29 },
  "issues": []
}
```
(สรุปรูปแบบ "ครู 8 คน, ห้อง 5 ห้อง, กลุ่มเรียน 4 กลุ่ม, รายการสอน 29 รายการ" `CONFIRMED`; ตัวเลขข้างบนอิงชุดทดลอง ต้องตรวจซ้ำตอนทำจริง `UNVERIFIED`)

**Response `201` (ข้อมูลผิด):**
```json
{
  "importId": "imp_01HEXAMPLE2",
  "status": "invalid",
  "createdAt": "2026-11-01T01:31:00Z",
  "summary": { "teachers": 8, "rooms": 5, "groups": 4, "assignments": 29 },
  "issues": [
    { "severity": "error", "code": "DUPLICATE_ID", "sheet": "ครู", "row": 7, "column": "รหัสครู", "message": "รหัสครู TIT03 ซ้ำกับแถว 4", "hint": "เปลี่ยนรหัสให้ไม่ซ้ำ" },
    { "severity": "error", "code": "ROOM_TOO_SMALL", "sheet": "รายการสอน", "row": 12, "column": "กลุ่มที่เรียน", "message": "กลุ่มเรียนรวม 3 กลุ่ม รวม 95 คน ไม่มีห้องประเภทที่ต้องใช้จุพอ (สูงสุด 90)", "hint": "แยกกลุ่มหรือเพิ่มห้องที่จุได้" }
  ]
}
```
- ตัวอย่างข้อผิดที่โจทย์ระบุว่ากรรมการจะทดสอบ: **รหัสครูซ้ำ**, **กลุ่มที่ไม่มีห้องไหนนั่งพอ** `CONFIRMED`; รหัส `issues[].code` อื่นเป็น `PROPOSED` เช่น `MISSING_SHEET`, `MISSING_COLUMN`, `MISSING_VALUE`, `UNKNOWN_REFERENCE`, `INVALID_VALUE`
- `issues[]` ต้องมี `hint` (แก้อย่างไร) `CONFIRMED` ตามโจทย์
- การ "ปุ่มยืนยันก่อนใช้ข้อมูล" (`CONFIRMED`): เป็นสถานะฝั่ง UI; เรียก `POST /schedules` ได้เมื่อ import `valid` เท่านั้น (`PROPOSED`)
- ไฟล์แม่แบบเปล่าและไฟล์ตัวอย่าง 3 ขนาด (เล็ก/กลาง/ใหญ่ที่ทีมทำเอง) `CONFIRMED` ว่าต้องมี → เสิร์ฟเป็น static file (`PROPOSED`) ไม่ต้องมี endpoint

**Error:** `413 FILE_TOO_LARGE` · `415 UNSUPPORTED_FILE_TYPE` · `400 FILE_UNREADABLE`

### 2.2 `GET /api/v1/imports/{importId}` — อ่านข้อมูลที่นำเข้า (หน้า 2, 3, 4, 6)

**หน้าที่:** คืนข้อมูลหลักเพื่อให้ UI ประกอบมุมมองตาราง (กลุ่ม/ครู/ห้อง), ค้นหา และแสดงชื่อ

**Response `200`:**
```json
{
  "importId": "imp_01HEXAMPLE1",
  "status": "valid",
  "summary": { "teachers": 8, "rooms": 5, "groups": 4, "assignments": 29 },
  "issues": [],
  "calendar": { "days": ["จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์"], "periodsPerDay": 8, "lunchAfterPeriod": 4, "blocked": [{ "day": "พุธ", "fromPeriod": 7, "toPeriod": 8, "reason": "กิจกรรม" }] },
  "teachers": [], "unavailability": [], "rooms": [], "groups": [], "subjects": [], "assignments": []
}
```
(รายการ array ใช้โมเดลใน §1.1; ชุดใหญ่ ~600 รายการ ให้ `?include=assignments&page=&pageSize=` — `PROPOSED`)

**Error:** `404 IMPORT_NOT_FOUND`

### 2.3 `POST /api/v1/requests/interpret` — ตีความคำขอพิเศษ (หน้า 2)

**หน้าที่:** แปลงข้อความไทยเป็นเงื่อนไข **ยังไม่ใช้งานจนกว่าผู้ใช้ยืนยัน** (`CONFIRMED`: ผู้ใช้กดแก้/ยืนยันก่อนจัดตาราง และเพิ่มคำขอใหม่เองได้)

**Request** (ตีความทุกคำขอในไฟล์ หรือพิมพ์ใหม่ 1 ข้อ):
```json
{ "importId": "imp_01HEXAMPLE1", "requestIds": ["R04"] }
```
```json
{ "importId": "imp_01HEXAMPLE1", "text": "ครูจิราพร ถ้าเลี่ยงได้ขอไม่สอนคาบแรก" }
```

**Response `200`:**
```json
{
  "items": [
    {
      "requestId": "R05",
      "text": "ครูประภาพร พลอยงาม บ้านอยู่ต่างอำเภอ … ถ้าเลี่ยงได้ขอไม่สอนคาบแรก (08.00 น.)",
      "category": "best_effort",
      "understood": "ครู TIT01 / ไม่สอนคาบ 1 / ทำถ้าทำได้",
      "constraint": { "kind": "teacher_avoid_periods", "teacherId": "TIT01", "days": null, "periods": [1] },
      "confidence": "high",
      "source": "llm"
    }
  ]
}
```
- `category` `CONFIRMED` มี 3 แบบ: `must` (ต้องทำตาม) · `best_effort` (ทำถ้าทำได้) · `none` (ไม่ต้องทำอะไรเพิ่ม — เช่น เป็นจริงอยู่แล้ว หรืออ้างถึงครูที่ไม่มีในข้อมูล)
- `understood` เป็นข้อความอ่านง่ายแบบตัวอย่างโจทย์ `CONFIRMED`
- `constraint.kind` `PROPOSED` — ชนิดที่พบในไฟล์ตัวอย่าง (`UNVERIFIED` ว่าครบสำหรับชุดที่ไม่เคยเห็น): ครูไม่สอนช่วงเวลา (เช่น บ่ายวันพุธ) · ห้องปิดทั้งวัน · ชอบจัดคาบปฏิบัติช่วงเช้า · ครูไม่สอนคาบแรก · กลุ่มเลิกไม่เกินเวลาในวันหนึ่ง · ครูสอนเฉพาะบางวัน · งดจัดคาบช่วงพักเที่ยง (ซึ่งเป็นจริงอยู่แล้ว → `none`)
- `source`: `llm` | `rule` | `manual` · **ต้องใช้งานได้แม้ AI ไม่พร้อม** (`CONFIRMED`: ถ้า AI ใช้ไม่ได้ต้องเพิ่มเงื่อนไขเองผ่านฟอร์มได้) → ถ้า LLM ล้มเหลว API คืน `source: "rule"`/รายการที่ตีความไม่ได้พร้อมฟอร์มให้กรอกเอง ไม่คืน error ทั้งก้อน
- ผู้ใช้เพิ่ม/แก้ผ่านฟอร์มโดยส่ง `constraint` เองไปกับ `POST /schedules` (ไม่ต้องแก้โค้ด `CONFIRMED`)
- LLM (เช่น Qwen/DeepSeek ตามที่โจทย์เสนอ) เรียกจาก **Backend เท่านั้น** ห้ามใส่ key ฝั่ง browser

**Error:** `404 IMPORT_NOT_FOUND` · `422 INTERPRET_FAILED` (เฉพาะกรณีไม่มีทางตีความและไม่มี fallback)

### 2.4 `POST /api/v1/schedules` — เริ่มจัดตาราง (async) (หน้า 3)

**Request:**
```json
{
  "importId": "imp_01HEXAMPLE1",
  "seed": 42,
  "method": "team",
  "requests": [
    { "requestId": "R05", "category": "best_effort", "constraint": { "kind": "teacher_avoid_periods", "teacherId": "TIT01", "days": null, "periods": [1] } }
  ]
}
```
- `method`: `baseline` | `team` (PROPOSED) · `seed` ไม่ส่ง = ระบบสุ่มและตอบ seed ที่ใช้กลับ

**Response `202`:**
```json
{ "jobId": "job_01HEXAMPLE1", "status": "queued", "seed": 42, "method": "team", "createdAt": "2026-11-01T01:35:00Z" }
```
**Error:** `404 IMPORT_NOT_FOUND` · `409 IMPORT_NOT_VALID` · `422 VALIDATION_FAILED`

### 2.5 `GET /api/v1/schedules/{jobId}` — สถานะและผลลัพธ์ (หน้า 3, 4, 6)

**ระหว่างรัน (`200`):**
```json
{
  "jobId": "job_01HEXAMPLE1", "status": "running", "stage": "ASSIGNING_SLOTS",
  "progress": 0.42, "seed": 42, "method": "team",
  "createdAt": "2026-11-01T01:35:00Z", "updatedAt": "2026-11-01T01:35:07Z"
}
```
- `progress`: ตัวเลข 0–1 **หรือ `null`** ถ้าวัดจริงไม่ได้ (UI แสดงแค่ `stage`; ห้ามประมาณมั่ว) — โจทย์ต้องมีแถบความคืบหน้า `CONFIRMED`; ความละเอียดที่ทำได้ `UNVERIFIED`
- `stage` `PROPOSED`: `QUEUED`, `VALIDATING`, `ASSIGNING_SLOTS`, `IMPROVING`, `FINALIZING`

**สถานะสุดท้าย `completed` / `completed_partial` (`200`):**
```json
{
  "jobId": "job_01HEXAMPLE1", "status": "completed", "seed": 42, "method": "team",
  "createdAt": "2026-11-01T01:35:00Z", "finishedAt": "2026-11-01T01:35:12Z",
  "result": {
    "placements": [
      { "assignmentId": "S0007", "type": "ทฤษฎี",  "day": "จันทร์", "startPeriod": 1, "periodCount": 1, "roomId": "LR-02" },
      { "assignmentId": "S0007", "type": "ปฏิบัติ", "day": "ศุกร์",  "startPeriod": 1, "periodCount": 4, "roomId": "COM-01" }
    ],
    "check": {
      "scheduled": 29, "total": 29,
      "clashes": { "teacher": 0, "room": 0, "group": 0 },
      "otherViolations": 0,
      "violations": [],
      "penalty": { "total": 18, "groupGaps": 8, "teacherGaps": 4, "overSixPeriods": 0, "splitDays": 6, "requests": 0 },
      "elapsedSeconds": 11.8
    },
    "unscheduled": [],
    "explanation": "จัดวิชาที่มีข้อจำกัดมากที่สุดก่อน (ปฏิบัติติดกันหลายคาบ, กลุ่มเรียนรวม) แล้วจึงจัดวิชาที่ยืดหยุ่นกว่า",
    "summary": {
      "roomUtilization": [{ "roomId": "COM-01", "percent": 62.5 }],
      "teacherLoad": [{ "teacherId": "TIT05", "periodsPerWeek": 12 }],
      "groupGaps": [{ "groupId": "IT-H11", "gapPeriods": 2 }],
      "requestOutcomes": [{ "requestId": "R05", "outcome": "met", "reason": null }]
    }
  }
}
```
- ชื่อฟิลด์ `check` ครอบคลุมรายการที่โจทย์บังคับให้แสดง `CONFIRMED` (ดู §1.2) โครงสร้าง JSON เป็น `PROPOSED`
- `requestOutcomes[].outcome` `CONFIRMED` มี 3 ค่า: `met` (ทำได้ครบ) · `partial` (ได้บางส่วน) · `not_met` (ทำไม่ได้) พร้อม `reason` · ค่าตัวเลข summary ที่ต้องมี: % การใช้ห้อง, จำนวนคาบของครูแต่ละคน, คาบว่างของกลุ่มเรียน `CONFIRMED`
- มุมมองตาราง กลุ่ม/ครู/ห้อง (หน้า 4) UI ประกอบเองจาก `placements` + `GET /imports/{id}` (`PROPOSED`) · ช่องที่ 2 วิชาซ้อนกันต้องแสดงทั้งคู่ `CONFIRMED`
- `completed_partial`: `unscheduled[]` = `{ "assignmentId", "reasonCode", "message" }` · `reasonCode` `PROPOSED`: `NO_FREE_SLOT`, `NO_SUITABLE_ROOM`, `CONSTRAINT_UNSATISFIABLE`, `TIMEOUT`
- `infeasible`: `reasons[]` = `{ "code", "message", "assignmentIds" }` (บอกว่าข้อมูลชุดนี้จัดไม่ได้เพราะอะไร `CONFIRMED` ว่าต้องมีเหตุผล)
- `failed`: ไม่มี `result` มี `error` · `cancelled`: `result` เป็น `null` หรือผลบางส่วน + `cancelledAt`

**Error:** `404 SCHEDULE_NOT_FOUND`

### 2.6 `POST /api/v1/schedules/{jobId}/cancel` — ยกเลิก (หน้า 3)

ยกเลิกงานที่ยังไม่สิ้นสุด **idempotent** (`CONFIRMED` ว่าต้องมีปุ่มยกเลิก และจัดใหม่ได้หลังยกเลิก)

**Response `200`:** `{ "jobId": "job_01HEXAMPLE1", "status": "cancelled", "cancelledAt": "2026-11-01T01:35:10Z" }`
- งานกำลัง `running` อาจตอบสถานะ `running` ชั่วขณะ → UI poll ต่อจนเป็น `cancelled`
- งานสิ้นสุดแล้ว: ตอบ `200` พร้อมสถานะจริง ไม่ใช่ error

**Error:** `404 SCHEDULE_NOT_FOUND`

### 2.7 `POST /api/v1/evaluations` — เปรียบเทียบ (หน้า 5)

**หน้าที่:** รัน **วิธีพื้นฐาน** (เช่น วางวิชาลงช่องแรกที่ว่าง) กับ **วิธี AI ของทีม** บนข้อมูลชุดเดียวกัน (`CONFIRMED`) — กดซ้ำด้วย seed เดิมต้องได้ผลเดิม

**Request:** `{ "importId": "imp_01HEXAMPLE1", "seed": 42, "requests": [] }`

**Response `200`:**
```json
{
  "evaluationId": "eval_01HEXAMPLE1", "importId": "imp_01HEXAMPLE1", "seed": 42,
  "isSimulated": false,
  "methods": [
    { "method": "baseline", "description": "วางวิชาลงช่องแรกที่ว่าง", "metrics": { "clashes": 14, "penalty": 96, "elapsedSeconds": 0.4 } },
    { "method": "team", "description": "…อธิบายวิธีของทีม ใช้ AI ตรงไหน ตั้งค่าอะไร…", "metrics": { "clashes": 0, "penalty": 18, "elapsedSeconds": 11.8 } }
  ]
}
```
- เปรียบเทียบอย่างน้อย 3 เรื่อง: **จุดที่ชน, คะแนนโทษ, เวลาที่ใช้** `CONFIRMED` (ตัวเลขข้างบนเป็นตัวอย่างสมมติ ไม่ใช่ผลจริง) · metric เพิ่มได้ `PROPOSED`
- `description` ต้องอธิบายวิธีของทีม `CONFIRMED`
- `isSimulated: true` (mock) → UI ต้องแสดงป้าย "ข้อมูลจำลอง"; API จริงต้องส่ง `false`; ผล "วิธีของทีมดีกว่าจริงเป็นตัวเลข" เป็นเงื่อนไขผ่านของกรรมการ

**Error:** `404 IMPORT_NOT_FOUND` · `409 IMPORT_NOT_VALID` · `500 EVALUATION_FAILED`
(ถ้ารันนานเกิน timeout → เปลี่ยนเป็น async แบบ schedules และลง Changelog เป็น breaking)

### 2.8 `GET /api/v1/schedules/{jobId}/export?format=pdf|xlsx` — ดาวน์โหลด (หน้า 6)

**Response `200`:** ไฟล์
- `format=pdf`: ตารางสอนสำหรับพิมพ์ (`CONFIRMED` ว่าต้องมี) — เลย์เอาต์ `PROPOSED`
- `format=xlsx`: **ต้องตรงรูปแบบทุกตัวอักษร** `CONFIRMED` (โจทย์ §5 ภาคผนวก — กรรมการตรวจซ้ำด้วยโปรแกรม):
  - แผ่นงานชื่อ `ตารางสอน`
  - แถวแรกหัวคอลัมน์ 6 ช่อง: `รหัสรายการสอน` · `ประเภท` · `วัน` · `คาบเริ่ม` · `จำนวนคาบ` · `รหัสห้อง`
  - 1 แถว = 1 ครั้งที่จัดลงตาราง (1 รายการสอนมี 1–2 แถว); `ประเภท` = `ทฤษฎี`/`ปฏิบัติ`; `วัน` เป็นชื่อไทย; ตัวเลขเป็นเลขจำนวนเต็ม
- Header: `Content-Disposition: attachment; filename="…"` (`PROPOSED`)
- ทำได้เฉพาะ job `completed`/`completed_partial`; error ตอบเป็น JSON envelope

**Error:** `409 SCHEDULE_NOT_READY` · `404 SCHEDULE_NOT_FOUND` · `400 EXPORT_FORMAT_UNSUPPORTED`

---

## 3. กติกา Mock ↔ API จริง

- Mock คืน shape เดียวกับตัวอย่างในเอกสารนี้ทุกฟิลด์ และผ่าน schema กลาง
- Phase ถัดไป: ย้ายตัวอย่างเป็น fixtures กลางที่ใช้ร่วมกัน mock กับ contract test ของ backend
- Mock fixtures ควรสร้างจากข้อมูลจริงในไฟล์ชุดทดลอง (4 กลุ่ม) เพื่อให้รูปแบบเหมือนของจริง

## Changelog

| วันที่ | เวอร์ชัน | การเปลี่ยนแปลง | Breaking? | ผู้แก้ |
|---|---|---|---|---|
| 2026-10-31 | v0.1 | ร่างแรก 8 endpoint (ฟิลด์เป็นข้อเสนอทั้งหมด) | — | Claude |
| 2026-10-31 | v0.3 | เพิ่ม §1.2: จัด endpoint ให้ตรง `docs/SPEC.md` §6 ของ Backend (datasets/requests/runs/jobs/comparisons, SSE), ไม่มีล็อกอิน; แทนที่ endpoint ใน §2 | **ใช่** (แทนที่ §2; Backend ยังไม่เริ่มสร้าง) | Claude ตามคำสั่งผู้ใช้ (**รอเพื่อนยืนยัน**) |
| 2026-10-31 | v0.2 | เพิ่มส่วน §1.1 (A1–A13) ตามโจทย์ฉบับนักเรียนและไฟล์ Excel จริง; non-breaking | ไม่ | Claude (แพนขอให้ทำ; **รอเพื่อนยืนยัน**) |
| 2026-10-31 | v0.1.1 | แยกป้ายสถานะ CONFIRMED/PROPOSED/UNVERIFIED | ไม่ | Claude |
| 2026-10-31 | v0.2 | ปรับตามโจทย์จริง: ชื่อแผ่นงาน/คอลัมน์ Excel, วัน/คาบ, 10 กฎห้ามผิด, คะแนนโทษ, คำขอพิเศษ 3 ประเภท, รูปแบบส่งออก xlsx, เพิ่มสถานะ `infeasible`, `requestOutcomes`, `check`, `calendar`; ตัด `reasonCode`/metric ที่เดา; เปลี่ยนฟิลด์ id เป็นรหัสจากไฟล์ (`teacherId`ฯลฯ) และ `day` เป็นชื่อไทย; `Placement` ใช้ `type/startPeriod/periodCount` | **ใช่** (ยังไม่มีโค้ดใช้) | Claude |
| 2026-10-31 | v0.2.1 | เพิ่มหมายเหตุ "ต้องกระทบยอดกับ Backend จริง" (ชื่อ endpoint/SSE) ยังไม่แก้ endpoint | ไม่ | Claude |
| 2026-10-31 | v0.2.2 | บันทึก endpoint ของ template (9 จาก 18), ต้องยึด SPEC §6 ของ Backend, ปัญหา auth, SSE | ไม่ | Claude |
| 2026-10-31 | v0.2.3 | ผู้ใช้เลือก deploy ทางเลือก B (Vercel + VPS); ความคืบหน้า = SSE หลัก + polling สำรอง (ยังไม่ปรับ endpoint จนกว่าได้ openapi.json) | ไม่ | Claude |
| 2026-10-31 | v0.3.1 | บันทึกว่าผู้ใช้ฝั่งแพนเลือกทาง A (`/api/v1/*`) รอฝั่งเพื่อนอนุมัติ (DEC-002 Proposed บนสาขา `comms`); §1.2 คือสถานะโค้ดปัจจุบัน ยังไม่ได้ย้ายกลับ | **ใช่ ถ้าอนุมัติ** (ต้องย้าย Frontend กลับเป็น `/api/v1`) | Claude ตามคำสั่งผู้ใช้ |
| 2026-10-31 | v0.2.4 | ผลอ่าน repo เพื่อน: เส้นทางจริงต่างจากเอกสารนี้ ดู BACKEND-REPO-REVIEW.md §4 (ยังไม่เขียน §2 ใหม่ รอตัดสิน C2/C3) | ไม่ | Claude |
