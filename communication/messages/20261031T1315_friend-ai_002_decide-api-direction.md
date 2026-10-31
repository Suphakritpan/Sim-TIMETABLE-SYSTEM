---
id: MSG-20261031-friend-ai-002
thread: MSG-20261031-friend-ai-002
from: friend-ai
to: humans
date: 2026-10-31T13:15:00+07:00
subject: ขอตัดสิน — API ยึดฝั่งไหน (/api/v1 ตามเว็บ หรือ route ตาม SPEC เก่า)
kind: decision-request
status: Open
in_reply_to: none
related_files: communication/decisions/DEC-001_no-login-and-frontend-follows-backend-spec.md ; Suphakritpan/Sim-TIMETABLE-SYSTEM@feat/web-frontend:apps/web/src/services/httpServices.js ; anonmianwe/test-for-AI-skills-competition@main:docs/SPEC.md#6
---

## Context
เรื่องนี้เป็น breaking contract จึงต้องให้มนุษย์ทั้งสองตัดสินตาม README §7 รายละเอียดอยู่ใน MSG-20261031-friend-ai-001

## Facts
- DEC-001 (สถานะ Proposed) ให้ Frontend ปรับตาม `docs/SPEC.md` §6 ฉบับที่ `main` ของ Backend แต่ฉบับนั้นต้องล็อกอิน ซึ่งขัดกับข้อตกลงว่าไม่มีล็อกอิน
- ฝั่ง Backend มีร่าง SPEC ใหม่ที่ยังไม่อนุมัติและยังไม่ push ให้ Backend ทำตาม `/api/v1` ของเว็บแทน
- Backend ยังไม่มี route ของฟีเจอร์ timetable ทั้งสองทางจึงไม่เสียโค้ด Backend
- เว็บที่ push แล้ว (`7f1e46b`) เรียก `/api/v1/*` อยู่ งานที่ยังไม่ push ของ pan-ai อาจเปลี่ยนไปแล้ว ตรวจไม่ได้

## Proposals
- **ทาง A (friend-ai แนะนำ ถ้า pan-ai ยังย้ายไม่มาก):** Backend สร้าง `/api/v1/*` ตาม `apiSchemas.js`; Frontend เพิ่มเฉพาะ `infeasible`, evaluation แบบ async, และ SSE พร้อม polling สำรอง ทำให้ route เหล่านี้ไม่มีล็อกอิน
- **ทาง B:** ยึดชื่อ route จาก SPEC เก่า (datasets/runs/comparisons) โดยตัดล็อกอินออก และ Frontend ย้าย services/schemas/mock ตาม เหมาะถ้า pan-ai ย้ายไปเกือบครบแล้ว

## Assumptions
- ข้อแนะนำขึ้นกับคำตอบ Q7 ใน MSG-20261031-friend-ai-001 ถ้า pan-ai ย้ายครบแล้ว ทาง B อาจถูกกว่า

## Question / Response
- Q1: เลือกทาง A หรือ B
- Q2: เมื่อเลือกแล้ว บันทึกเป็น `decisions/DEC-002` แทน DEC-001 ข้อ 2 ตกลงไหม
- Q3: ยืนยันว่าแพนเป็นเจ้าของ Frontend และ `frontend/` ใน repo ของเพื่อนเลิกใช้ ตกลงไหม

## Impact if unanswered
Backend ยังเริ่มสร้าง route ไม่ได้ และ Frontend ไม่รู้ว่าจะเชื่อมกับอะไร ทุกชั่วโมงที่รอกินเวลาก่อนส่ง 16.30 น. โดยตรง
