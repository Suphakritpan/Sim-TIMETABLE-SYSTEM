# Sim-TIMETABLE-SYSTEM

เว็บจัดตารางสอนอัตโนมัติสำหรับงานแข่งขัน: นำเข้า Excel → ตรวจข้อมูล → เพิ่มคำขอพิเศษ → จัดตาราง → ดูตารางรายสัปดาห์ → เปรียบเทียบวิธี → ดาวน์โหลดผล
เว็บเป็นสาธารณะ ไม่มีระบบล็อกอิน

## สถานะ

| ส่วน | สถานะ |
|---|---|
| Frontend (`apps/web`) | ครบ 6 หน้า ทำงานได้กับข้อมูลจำลอง (mock) |
| Backend / อัลกอริทึม (Python) | **ไม่อยู่ใน repo นี้** (เพื่อนทำใน repo แยก) — ดู [docs/BACKEND-REPO-REVIEW.md](docs/BACKEND-REPO-REVIEW.md) |
| เชื่อม API จริง | adapter HTTP เขียนไว้ตาม [contract v0.3](docs/API-CONTRACT.md) แต่ยังรอ Backend ยืนยันรูปแบบ response |

หน้าที่มีผลเปรียบเทียบ AI ในโหมด mock เป็น **ข้อมูลจำลอง** และระบุไว้ในหน้าจอ

## 6 หน้า

1. นำเข้าข้อมูล (`ImportPage`) — อัปโหลด `.xlsx`, ตรวจข้อมูล, ดาวน์โหลดแม่แบบ/ไฟล์ตัวอย่าง
2. คำขอพิเศษ (`RequestsPage`) — พิมพ์ข้อความหรือกรอกผ่านฟอร์ม แล้วยืนยัน
3. จัดตาราง (`GeneratePage`) — ใส่ seed, ติดตามสถานะงาน, ยกเลิกได้
4. ดูตาราง (`TimetablePage`) — ตารางรายสัปดาห์
5. ผลการใช้ AI (`EvaluationPage`) — เปรียบเทียบวิธีพื้นฐานกับวิธีของทีม
6. สรุปและส่งออก (`SummaryPage`) — ดาวน์โหลดไฟล์ผลลัพธ์

## รันในเครื่อง

ต้องมี Node.js (ทดสอบกับ npm)

```bash
cd apps/web
npm install
npm run dev        # http://localhost:5173 ใช้ข้อมูลจำลอง (.env.development)
```

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | เซิร์ฟเวอร์พัฒนา |
| `npm run build` | build สำหรับ production (`dist/`) |
| `npm run preview` | ดู build ในเครื่อง |
| `npm run lint` | oxlint |
| `npm test` | vitest |

### ตัวแปรสภาพแวดล้อม

ดูตัวอย่างใน `apps/web/.env.example` (คัดลอกเป็น `.env.local`) ห้ามใส่ secret เพราะตัวแปร `VITE_*` ถูกฝังในโค้ด browser

| ตัวแปร | ความหมาย |
|---|---|
| `VITE_DATA_MODE` | `mock` = ข้อมูลจำลองในเครื่อง, `api` = เรียก Backend จริง |
| `VITE_API_BASE_URL` | URL ของ Backend (ใช้เมื่อ `api`) |
| `VITE_MOCK_SCENARIO` | `success` · `import-errors` · `schedule-partial` · `schedule-infeasible` · `schedule-failed` · `api-down` |
| `VITE_POLL_INTERVAL_MS`, `VITE_REQUEST_TIMEOUT_MS`, `VITE_MAX_UPLOAD_MB` | ค่าติดตามงาน / timeout / ขนาดไฟล์สูงสุด |
| `VITE_SITE_URL` | โดเมนจริงของเว็บ (ใช้สร้าง sitemap.xml / robots.txt / llms.txt ตอน build) |

### ใช้กับ Backend จริง

ตั้ง `VITE_DATA_MODE=api` และ `VITE_API_BASE_URL` ชี้ไปที่ Backend — หน้าเว็บเรียกผ่าน `services/` เท่านั้น จึงไม่ต้องแก้โค้ดหน้า

## ไฟล์ตัวอย่าง

`apps/web/public/samples/` มีแม่แบบเปล่า ตัวอย่างรูปแบบไฟล์ส่งออก และชุดข้อมูลสมมติ 3 ขนาด (เล็ก 32 รายการสอน / กลาง 126 / ใหญ่ 600) สร้างใหม่ได้ด้วย

```bash
pip install openpyxl
python scripts/generate_sample_data.py   # seed คงที่ ได้ไฟล์เดิมทุกครั้ง
```

ข้อมูลทั้งหมดเป็นข้อมูลสมมติ โฟลเดอร์ `proposition data/` (ไฟล์โจทย์) ไม่ถูก commit

## Deploy

Frontend บน Vercel (Root Directory = `apps/web`) และ Backend บน VPS ด้วย Docker — รายละเอียดและ checklist ใน [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## เอกสาร

| ไฟล์ | เนื้อหา |
|---|---|
| [CLAUDE.md](CLAUDE.md) | กฎของโปรเจกต์ (ความถูกต้อง ความปลอดภัย โครงสร้าง SEO) และช่องสื่อสารกับ AI ฝั่ง Backend (§14, สาขา `comms`) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | สถาปัตยกรรมและ stack |
| [docs/API-CONTRACT.md](docs/API-CONTRACT.md) | สัญญาข้อมูล Frontend–Backend |
| [docs/FOLDER-STRUCTURE.md](docs/FOLDER-STRUCTURE.md) | โครงสร้างโฟลเดอร์ |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | แผน deploy |
| [docs/HANDOFF-BACKEND.md](docs/HANDOFF-BACKEND.md) | ข้อมูลส่งต่อให้ฝั่ง Backend |
| [docs/BACKEND-REPO-REVIEW.md](docs/BACKEND-REPO-REVIEW.md) | ผลอ่าน repo Backend และข้อขัดแย้งที่ต้องตัดสิน |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | ดีไซน์ซิสเต็ม |
| [docs/user-guide/](docs/user-guide/) | คู่มือผู้ใช้ 1 หน้า |

## ผู้รับผิดชอบ

- **Frontend & Integration** (`apps/web`): แพน
- **Algorithm & Backend API**: เพื่อน
