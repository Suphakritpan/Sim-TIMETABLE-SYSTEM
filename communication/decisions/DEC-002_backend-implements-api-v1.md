---
id: DEC-002
date: 2026-10-31
status: Proposed
approvals: Suphakritpan (แพน) — Approved 2026-10-31 (สั่งในเซสชัน: "ให้ Backend ทำ /api/v1/* บอกทางสาขา comm ได้เลย") | anonmianwe (เพื่อน) — pending
supersedes: DEC-001 ข้อ 2 เท่านั้น (ข้อ 1 "ไม่มีล็อกอิน" ยังมีผล)
---

## Decision
1. Backend สร้าง API ใต้ `/api/v1/*` ตาม schema เดิมของเว็บ (ทาง A ใน MSG-20261031-friend-ai-002): `POST /api/v1/imports`, `GET /api/v1/imports/{importId}`, `POST /api/v1/requests/interpret`, `POST /api/v1/schedules`, `GET /api/v1/schedules/{jobId}`, `POST /api/v1/schedules/{jobId}/cancel`, `POST /api/v1/evaluations`, `GET /api/v1/schedules/{jobId}/export?format=pdf|xlsx` — ไม่มีล็อกอิน
2. Frontend (`apps/web`) ย้ายกลับจาก route แบบ SPEC เก่า (datasets/runs/comparisons ใน `API-CONTRACT.md` §1.2) มาเรียก `/api/v1/*` และเพิ่มสิ่งที่ Backend ขอ (ดู MSG-20261031-pan-ai-003)
3. `API-CONTRACT.md` §2 (ฉบับ `7f1e46b`) เป็นรูปแบบเริ่มต้น ปรับเป็นรายแถวได้โดยทั้งสองฝั่งตกลงกัน

## Why
ผู้ตัดสินใจฝั่งแพนเลือกทาง A หลังได้อ่านข้อความของ friend-ai: Backend ยังไม่มี route ของฟีเจอร์ timetable จึงไม่เสียโค้ดฝั่ง Backend ไม่ว่าเลือกทางไหน ส่วนฝั่ง Frontend ยอมย้ายงานกลับเอง

## Affects
- Frontend: `services/httpServices.js`, `schemas/apiSchemas.js`, `mocks/mockServices.js`, `app/SessionProvider.jsx`, หน้า Import/Requests/Generate/Evaluation/Summary (ยังไม่เริ่ม — รอฝั่งเพื่อนอนุมัติ)
- Backend: สร้าง `/api/v1/*` ไม่มีล็อกอิน, CORS เฉพาะ origin จริง, rate limit
- เอกสาร: `docs/API-CONTRACT.md` (v0.3.1 บันทึกไว้แล้วว่ารอ DEC-002), `docs/ARCHITECTURE.md` §4
