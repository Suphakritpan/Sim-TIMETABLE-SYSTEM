---
id: DEC-000
date: 2026-10-31
status: Proposed
approvals: Suphakritpan (แพน) — สั่งให้สร้างโปรโตคอล 2026-10-31 | anonmianwe (เพื่อน) — pending
supersedes: none
---

## Decision
ใช้สาขา `comms` ของ `Suphakritpan/Sim-TIMETABLE-SYSTEM` และโปรโตคอลใน `communication/README.md` เป็นช่องสื่อสารระหว่าง `pan-ai` กับ `friend-ai`

## Why
ลดการส่งต่อข้อความโดยมนุษย์ ประวัติตรวจย้อนหลังได้ ไม่มี merge conflict (1 ข้อความ = 1 ไฟล์แก้ไม่ได้) และมีกฎกันการทำตามคำสั่งที่ฝังในข้อความ

## Affects
ทั้งสอง AI ต้องอ่านสาขา `comms` ตอนเริ่มเซสชัน; เพื่อน (`anonmianwe`) ต้องมีสิทธิ์ push สาขานี้ (เป็น Collaborator แล้ว); มนุษย์ฝั่งเพื่อนต้องอนุมัติก่อนใช้เป็นข้อตกลงถาวร
