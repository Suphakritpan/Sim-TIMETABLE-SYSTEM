---
id: MSG-20261031-friend-ai-009
thread: MSG-20261031-friend-ai-009
from: friend-ai
to: humans
date: 2026-10-31T15:49:00+07:00
subject: ด่วนก่อน 16:30 — เว็บยังเรียก Backend จริงไม่ได้ และมี 3 เรื่องที่มนุษย์ต้องตัดสิน
kind: decision-request
status: Open
in_reply_to: none
related_files: https://github.com/Suphakritpan/Sim-TIMETABLE-SYSTEM/pull/3 ; communication/messages/20261031T1352_pan-ai_005_council-schedule-and-gates.md
---

## Context
ข้อความนี้แก้ข้อผิดพลาดของฉัน: ใน MSG-20261031-friend-ai-005 ฉันเขียนว่าส่งเรื่อง D5 และ D7 ให้มนุษย์แล้ว แต่ไม่เคยสร้าง `decision-request` จึงไม่ขึ้นใน inbox ของ `humans` ฉันตรวจการสื่อสารแล้วพบช่องนี้ จึงส่งตอนนี้

## Facts
1. Backend ผ่าน test 117 รายการ และเปิด PR #3 แล้ว ยังไม่ merge และยังไม่ขึ้น VPS
2. บน GitHub ไม่มี commit จากฝั่งแพนหลัง 13:53 และ `main` กับ `feat/web-frontend` ยังไม่มีการเรียก `/api/v1`
3. pan-ai ยังไม่ตอบ MSG-20261031-friend-ai-005, -007, -008
4. MSG-20261031-pan-ai-002 ระบุว่า push ทั้ง GitHub และ GitLab ฉันเห็นเฉพาะ GitHub ซึ่งเป็นช่อง `comms` ตามโปรโตคอล

## Proposals
- D7: merge PR #3 เมื่อแพนตรวจแล้ว และ merge งานย้ายกลับ `/api/v1` เข้า `main` ให้ Vercel deploy
- D5: วันนี้ใช้ `*.vercel.app` และบันทึกข้อยกเว้น เพราะเลยเส้นตาย 15:00 ที่เสนอไว้แล้ว
- F11: ข้าม LLM ใช้กฎและฟอร์ม

## Assumptions
- ฉันเดาว่างานย้ายกลับยังอยู่ในเครื่องแพน ตรวจไม่ได้จากฝั่งนี้

## Question / Response
- **Q1 (แพน):** push งาน `/api/v1` ขึ้น GitHub ได้เมื่อไร
- **Q2 (แพน):** origin จริงของเว็บคืออะไร
- **Q3 (ทั้งคู่):** อนุมัติ D7, D5, F11 ตามข้อเสนอไหม

## Impact if unanswered
ถ้าไม่มีงานย้ายกลับ เว็บที่ส่งกรรมการจะแสดงข้อมูลจำลอง หรือเรียก route ที่ Backend ไม่มี หน้า 3-6 จะไม่มีผลจริง
