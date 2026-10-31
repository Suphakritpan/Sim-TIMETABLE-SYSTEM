# DEPLOYMENT — Vercel (Frontend) + VPS (Backend)

สถานะ: **ตัดสินแล้วโดยผู้ใช้: ทางเลือก B** · ผู้อ่าน: แพนและเพื่อน · ป้าย: `CONFIRMED` (ผู้ใช้/โจทย์) · `PROPOSED` (best practice ที่เสนอ ยังต้องทำ/ทดสอบจริง) · `UNVERIFIED` (ยังไม่ได้ตรวจ)
ผมไม่ได้เห็น template Backend ของเพื่อน รายการที่อิง template มาจากคำบอกเล่าของเพื่อน

## 1. สถาปัตยกรรม

```
กรรมการ (คอม/มือถือ)
   │ HTTPS
   ├──► Vercel: https://<project>.vercel.app   (apps/web — static build, Root Directory = apps/web)   CONFIRMED
   │        │  fetch / SSE (cross-origin, ไม่ใช้ cookie)
   │        ▼
   └──► VPS:  https://api.<domain>             (Caddy → FastAPI)                                         CONFIRMED + domain OPEN
                 ├─ api      (FastAPI)         ┐
                 ├─ worker   (โปรเซสแยก)        ├─ docker compose, restart: unless-stopped
                 ├─ db       (PostgreSQL)      │  volumes ถาวร: db + FILES_DIR
                 └─ caddy    (HTTPS, proxy)    ┘
```

หลักการเลือกแบบข้ามโดเมนให้ปลอดภัยที่สุด `PROPOSED`:
- **ไม่ใช้ cookie/ล็อกอิน** (ตัดสินแล้วว่าไม่มีล็อกอิน) → ปัญหา `SameSite` หายไป และเรียก API แบบ **ไม่ส่ง credentials** CORS ใช้ `Access-Control-Allow-Origin` เป็นโดเมนจริงตรงตัว (ไม่ใช้ `*` กับ credentials)
- **เรียก Backend ตรง ๆ (ไม่ผ่าน rewrite ของ Vercel)** เพราะ rewrite อาจตัด/บัฟเฟอร์ SSE และเพิ่มจุดล้ม
- **ความคืบหน้า: SSE เป็นหลัก + polling เป็นตัวสำรองอัตโนมัติ** ถ้า SSE ขาดหรือเชื่อมไม่ได้ Frontend สลับไป `GET` สถานะซ้ำทุก 1–2 วินาทีโดยไม่ให้ผู้ใช้เห็นความต่าง (ทนต่อ proxy/มือถือ/เครือข่ายโรงเรียนที่บัฟเฟอร์ SSE)

## 2. Frontend บน Vercel (แพน)

| รายการ | ค่า/ข้อปฏิบัติ | สถานะ |
|---|---|---|
| Root Directory | `apps/web` · Framework Preset: Vite · Build `npm run build` · Output `dist` | CONFIRMED |
| Node/lockfile | ใช้ `package-lock.json` เดิม ล็อกเวอร์ชัน (`.npmrc` มีอยู่แล้ว) | PROPOSED |
| Env (ตั้งใน Vercel ไม่ commit) | `VITE_DATA_MODE=api`, `VITE_API_BASE_URL=https://api.<domain>` ห้ามใส่ secret (ตัวแปร `VITE_*` ถูกฝังในโค้ดฝั่ง browser) | CONFIRMED |
| Production branch | `main` · ทุก PR ได้ Preview URL | PROPOSED |
| Routing | ใช้ `vercel.json` ให้ **เฉพาะเส้นทางจริงของแอป** rewrite ไป `index.html` (ไม่ใช่ catch-all) เพื่อให้เส้นทางที่ไม่มีจริงได้ **HTTP 404 จริง** (ตามกฎ SEO ข้อ 3) พร้อม `404.html` ที่ออกแบบแล้ว รายชื่อเส้นทางต้องตรงกับ `router.jsx` | PROPOSED / UNVERIFIED |
| Headers | `vercel.json` ตั้ง `Content-Security-Policy` (อนุญาต `connect-src` เฉพาะ `https://api.<domain>`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`; แคช asset ที่มี hash แบบ immutable | PROPOSED |
| Source map | ไม่เผยแพร่บน production (`build.sourcemap: false` หรือไม่ deploy ไฟล์ `.map`) | CONFIRMED (กฎ SEO ข้อ 18) |
| SEO | `robots.txt` ไม่บล็อก AI crawlers, `sitemap.xml`, `llms.txt`, OG image, `lang="th"` | CONFIRMED |
| ทดสอบก่อนส่ง | เปิดจาก Preview/Production ด้วยมือถือจริง + เครือข่ายอื่น (ไม่ใช่ Wi-Fi เครื่องที่พัฒนา) | PROPOSED |

## 3. Backend บน VPS (เพื่อน) — ข้อกำหนดแบบ best practice

### 3.1 โดเมนและ HTTPS
- ต้องมี (sub)domain ที่ A record ชี้ IP ของ VPS เช่น `api.<โดเมนของผู้ใช้>` `OPEN` (Q1 ของเพื่อน) — ผมตั้งชื่อเองไม่ได้
- ทางเลือกถ้าไม่ซื้อโดเมน (ยังไม่ได้ทดสอบ): hostname ฟรีที่แปลงจาก IP เช่น `<ip-ใช้ขีด>.sslip.io` หรือ DuckDNS ให้ Caddy ขอใบรับรองอัตโนมัติ
- HTTPS บังคับ (Vercel เป็น HTTPS เรียก `http://` ไม่ได้ — mixed content) · เปิด HSTS

### 3.2 CORS (template ยังไม่ได้ตั้งใน `main.py`)
- `allow_origins` มาจาก env `ALLOWED_ORIGINS` (คั่นด้วย `,`): โดเมน Vercel production จริง + (โหมดพัฒนาเท่านั้น) `http://localhost:5173`
- Preview ของ Vercel เป็นโดเมนสุ่ม: ถ้าต้องการทดสอบ preview ให้เพิ่มโดเมนนั้นเป็นรายกรณีหรือใช้ regex เฉพาะ project ของเรา; **ห้าม `*` บน production**
- `allow_methods`: GET, POST, OPTIONS (+ PATCH/DELETE เมื่อมีใช้) · `allow_headers`: เฉพาะที่ใช้ (`Content-Type`) · `max_age` ให้แคช preflight (เช่น 600)
- **`expose_headers=["Content-Disposition"]`** มิฉะนั้นหน้าเว็บอ่านชื่อไฟล์ดาวน์โหลด (Excel/PDF) ไม่ได้
- ไม่ใช้ `allow_credentials` (ไม่มี cookie)

### 3.3 SSE ผ่าน Caddy (เส้นทาง `/api/jobs/{id}/events` หรือของจริงตาม SPEC)
- Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`, `Connection: keep-alive`
- ส่ง **heartbeat** (comment line เช่น `: ping`) ทุก ~15 วินาที กัน proxy/มือถือตัดการเชื่อมต่อเงียบ
- รองรับ `Last-Event-ID` / เริ่มส่งสถานะปัจจุบันทันทีเมื่อเชื่อมต่อ (ไม่ทำให้ client พลาด event ระหว่างเชื่อมต่อใหม่); มี event สุดท้ายชัดเจน (สถานะ terminal) แล้วปิดสตรีม
- Caddy: `reverse_proxy` ปิด buffering (`flush_interval -1`) และตั้ง timeout อ่านให้ยาวกว่าอายุงาน
- ต้องมี `GET` สถานะแบบธรรมดา (เช่น `/api/jobs/{id}`) ที่ให้ข้อมูลเดียวกับ SSE เพื่อใช้เป็น fallback

### 3.4 ความปลอดภัยเมื่อไม่มีล็อกอิน (เว็บสาธารณะ — ต้องกันการถูกใช้ผิด)
- **ถอด/ปิดสิ่งที่ไม่ต้องใช้:** `dev-login`, `auth/*`, `me`, `users`, `documents`, `admin` (template F1 จะลบอยู่แล้ว) — ลดพื้นที่โจมตี
- จำกัดขนาดคำขออัปโหลด (Caddy `request_body max_size` + ตรวจในแอป) · ตรวจนามสกุลและเนื้อไฟล์เป็น `.xlsx` จริง · ป้องกัน zip bomb/ไฟล์ใหญ่ผิดปกติ · อ่านด้วย `openpyxl` โหมดปลอดภัย (ไม่รันมาโคร)
- **Rate limit ต่อ IP** (อัปโหลด, สร้าง job, เรียก LLM) และจำกัดจำนวน job ที่รันพร้อมกัน/คิวสูงสุด เพื่อไม่ให้ worker ล้นเมื่อคนหลายคนกด หรือมีคนยิงซ้ำ
- ขีดเวลา/หน่วยความจำต่อ job (timeout แล้วจบเป็นสถานะที่อธิบายได้ ไม่ค้าง)
- **ล้างข้อมูลเก่าอัตโนมัติ** (import/job/ไฟล์ที่เกินอายุที่ตกลง) — ข้อมูลที่อัปโหลดอาจมีข้อมูลส่วนบุคคล แม้ไม่เผยแพร่ก็ไม่ควรสะสม
- Log แบบมีโครงสร้าง + request id; **ห้าม log เนื้อหาไฟล์/ชื่อบุคคล/LLM key**; ตอบ error แบบ envelope ไม่เปิดเผย stack trace
- LLM: key เป็น env เท่านั้น, timeout สั้น, retry จำกัด, แคชผลตีความ, fallback เป็นกฎ/ฟอร์ม (ใช้ของฟรี → ต้องทนล่ม/โควตาหมด)
- Security headers ที่ Caddy: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, ปิด `Server` header

### 3.5 Docker / VPS
- ทุก service `restart: unless-stopped` + `healthcheck` (api: `/api/health`, db: `pg_isready`) · `depends_on` แบบรอ healthy
- รันคอนเทนเนอร์ด้วยผู้ใช้ non-root · pin เวอร์ชัน image (ไม่ใช้ `latest`) · `.dockerignore`
- Volume ถาวร: PostgreSQL และ `FILES_DIR` · มีสคริปต์สำรองฐานข้อมูล (`pg_dump`) อย่างน้อยหนึ่งครั้งก่อนวันตรวจ
- **Worker เริ่มใหม่:** job ค้าง `running` → ตั้ง `failed` (อยู่ในสเปกเพื่อน) และไม่ทำให้ API ล่ม
- Migration ย้อนกลับได้ (Alembic) · ตั้งค่าอ่านจาก env + validate ตอนเริ่ม (ขาด = ล้มทันที)
- Firewall: เปิดเฉพาะ 80/443 และ SSH (ใช้ SSH key ปิดรหัสผ่าน) · ไม่เปิดพอร์ต DB ออกสู่สาธารณะ
- ฟอนต์ Sarabun อยู่ใน image (WeasyPrint) และทดสอบตัดคำไทยของ PDF ตั้งแต่ต้น
- ตรวจ `docker compose up` จากเครื่องว่าง + `apps/api/README.md` (ใช้เป็นวิธีรันในเครื่องตามโจทย์)

## 4. เช็คลิสต์ก่อนส่ง (16.30 น.)

- [ ] `https://api.<domain>/api/health` ตอบ 200 จากอินเทอร์เน็ต
- [ ] Preflight จาก origin Vercel ผ่าน และ header `Access-Control-Allow-Origin` ตรงตัว (คำสั่งตรวจอยู่ใน `docs/REQUEST-TO-BACKEND.md` §C)
- [ ] SSE ใช้งานจากหน้า Vercel จริง และเมื่อสลับเป็น fallback polling ก็แสดงความคืบหน้าถูกต้อง
- [ ] อัปโหลดไฟล์ชุดใหม่, จัดตารางชุดใหญ่, ยกเลิก, seed ซ้ำ, ดาวน์โหลด Excel (ชื่อไฟล์ถูกต้อง) และ PDF จาก **มือถือ**
- [ ] รีสตาร์ท VPS/compose แล้วระบบกลับมาเองและข้อมูลยังอยู่
- [ ] ไม่มี secret ใน git · `.env` ไม่ถูก commit · repo สาธารณะ
- [ ] ติด tag `submission`; คู่มือ 1 หน้า + วิธีรันในเครื่อง + ภาพ/วิดีโอสำรอง
