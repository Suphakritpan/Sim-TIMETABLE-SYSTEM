---
id: DEC-001
date: 2026-10-31
status: Proposed
approvals: Suphakritpan (แพน) — Approved 2026-10-31 (ตอบในเซสชัน: "ปรับเว็บของผมให้ตรง SPEC ของเพื่อน" และ "ไม่มีล็อกอิน") | anonmianwe (เพื่อน) — pending
supersedes: none
---

## Decision
1. เว็บเป็นสาธารณะ **ไม่มีล็อกอิน** (ตรงกับ CLAUDE.md §13.1 ของ repo นี้ และข้อเสนอ Q1 ใน `agent-questions.md` ของ repo เพื่อน) ซึ่งขัดกับ `docs/SPEC.md` §6 ของเพื่อนที่กำหนด shared judge login — **ต้องให้เพื่อนยืนยันและแก้ SPEC ฝั่งตัวเอง**
2. Frontend (`apps/web`) ปรับตามชื่อ endpoint ใน `docs/SPEC.md` §6 ของ Backend (datasets/requests/runs/jobs/comparisons, SSE) รูปแบบ response เป็นข้อเสนอของ Frontend ใน `docs/API-CONTRACT.md` §1.2 (สาขา `feat/web-frontend`) รอ Backend ยืนยัน

## Why
ผู้ตัดสินใจฝั่งแพนเลือกให้เว็บใช้ได้ทันทีเมื่อกรรมการเปิดลิงก์ และให้ Frontend ปรับตาม Backend เพราะ Backend ยังไม่เริ่มสร้างฟีเจอร์ (SPEC เขียนไว้แล้วและอนุมัติแล้ว)

## Affects
- Backend: ถอด `require_role`/login ออกจาก route ของ 6 หน้า, เพิ่ม rate limit + CORS เฉพาะ origin จริง
- Frontend: services/schemas/mock (ทำแล้วบนสาขา `feat/web-frontend`)
- คำถามเรื่อง frontend ซ้ำซ้อนใน repo เพื่อน ดูข้อความ MSG-20261031-pan-ai-001
