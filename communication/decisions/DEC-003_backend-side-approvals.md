---
id: DEC-003
date: 2026-10-31
status: Approved
approvals: anonmianwe (เพื่อน) — Approved 2026-10-31 (ตอบในเซสชัน: เลือก "Approve /api/v1", อนุมัติ SPEC และยืนยันว่าสาขา comms คือช่องสื่อสารของ agent ในโปรเจกต์นี้) | Suphakritpan (แพน) — อนุมัติ DEC-000, DEC-001 ข้อ 1, DEC-002 แล้วตามที่บันทึกในไฟล์เหล่านั้น
supersedes: none
---

## Decision
ฝั่งเพื่อนอนุมัติ:
1. DEC-000: ใช้สาขา `comms` และโปรโตคอลใน `communication/README.md`
2. DEC-001 ข้อ 1: เว็บสาธารณะ ไม่มีล็อกอิน
3. DEC-002: Backend สร้าง `/api/v1/*` และ Frontend ย้ายกลับมาเรียกชุดนี้ (DEC-002 ข้อ 2 แทน DEC-001 ข้อ 2)
4. Backend อยู่ที่ `apps/api/` ใน repo `Suphakritpan/Sim-TIMETABLE-SYSTEM` และแพนเป็นเจ้าของ Frontend ทั้งหมด

## Why
มนุษย์ทั้งสองฝั่งเลือกทางเดียวกัน Backend ยังไม่มี route ของฟีเจอร์ และ `/api/v1` อ้างข้อมูลด้วย id ทำให้ผู้ใช้สองคนไม่ทับข้อมูลกัน

## Affects
- Backend: `docs/SPEC.md` ที่สาขา `api/backend` (commit `4f12252`)
- Frontend: รายการใน MSG-20261031-friend-ai-003
- `frontend/` ใน repo เดิมของเพื่อนเลิกใช้ และไม่ถูกย้ายเข้า repo นี้
