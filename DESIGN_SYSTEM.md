# DESIGN_SYSTEM — Sim-TIMETABLE-SYSTEM

สถานะ: **ร่าง v0.1 — รอผู้ใช้อนุมัติ** (ห้ามสร้างหน้า UI จนกว่าจะอนุมัติ)
เอกสารนี้คือแหล่งความจริงเดียวของหน้าตาเว็บ โทเค็นใน [apps/web/src/styles/tokens.css](apps/web/src/styles/tokens.css) ต้องตรงกับเอกสารนี้ทุกค่า
ข้อกำหนดด้านโค้ด/ทีม/API อยู่ที่ [CLAUDE.md](CLAUDE.md) และ [docs/](docs/) (เอกสารนี้ไม่ซ้ำ)

---

## 1. Design Direction

**ที่มา:** ผู้ใช้ให้ภาพอ้างอิง 5 ภาพ (แดชบอร์ดการเรียนภาษา, ทริปท่องเที่ยว, วางแผนเก็บเงินซื้อบ้าน, แดชบอร์ดโทนม่วงอ่อน, หน้าบ้านโทนส้ม) และกำหนดว่า "พื้นหลังและธีมสีขาวสบายตา ตัดด้วยเส้นสีฟ้า ระดับ enterprise ไม่ให้ดูเป็นเว็บ AI ทั่วไป" ให้ลอกลักษณะจากภาพ

**สิ่งที่หยิบจากภาพ:** แถบเมนูซ้ายแบบไอคอน+ป้ายชื่อ, แผงขวาสรุป (ปฏิทิน, วงแหวนความคืบหน้า), การ์ดมุมมนใหญ่พื้นขาวบนพื้นอ่อน, ตัวเลขสถิติขนาดใหญ่พร้อมชิปไอคอนสีอ่อน, หัวเรื่องใหญ่แบบ editorial, การ์ดเด่นรูปทรงโค้ง (arch) ที่มีลวดลาย
**สิ่งที่ไม่เอา:** สีเขียวเสจ/ส้ม/ม่วงเป็นสีหลัก (ขัดกับโจทย์ขาว+ฟ้า), มาสคอต/ภาพถ่าย/ภาพประกอบสต็อก, gradient ฟุ้ง

| # | หลักการ | เหตุผล |
|---|---|---|
| P1 | **ขาวสะอาด แบ่งส่วนด้วยเส้นฟ้า** พื้นหน้าเป็นขาว/ขาวอมฟ้า การ์ดมีเส้นขอบฟ้าอ่อน 1px และเงาบางมาก | ตรงโจทย์ผู้ใช้; เส้นคือโครงสร้าง เงาเป็นแค่ความนุ่ม |
| P2 | **ฟ้าเป็นสีเดียวที่มีน้ำหนัก** ฟ้าเข้ม = การกระทำ, ฟ้าอ่อน = พื้นเลือก/เส้น; เขียว/เหลือง/แดงใช้เฉพาะสถานะ | สีสื่อความหมาย ไม่ตกแต่ง |
| P3 | **Editorial + ข้อมูลเป็นพระเอก** หัวเรื่องและตัวเลขสำคัญใช้ serif ไทยขนาดใหญ่ ตัวอ่านใช้ sans | ให้ดูมีเอกลักษณ์ ไม่ใช่เทมเพลตแดชบอร์ด |
| P4 | **ลวดลายจากข้อมูลจริง** การ์ดเด่นใช้ SVG ลายตารางคาบ/เส้นเวลา วาดเอง ไม่ใช้ภาพสต็อก | เกี่ยวกับโดเมน ไม่มีปัญหาลิขสิทธิ์ |
| P5 | **Motion มีความหมาย** ตอนโหลดหน้า: เนื้อหาไล่ขึ้นทีละส่วน; ระหว่างจัดตาราง: แสดงขั้นตอนจริง (stage) และแถบ/วงแหวนที่ขยับตามค่าจริง **ห้ามแอนิเมชันที่ทำให้ดูเหมือนมีความคืบหน้าทั้งที่ไม่มี** (CLAUDE.md §12.4) | ซื่อตรงต่อสถานะจริง |
| P6 | **Accessibility ก่อน** WCAG 2.2 AA, คีย์บอร์ดครบ, `prefers-reduced-motion` ปิดแอนิเมชันทั้งหมด | CLAUDE.md §7 |
| P7 | **มือถือใช้ได้จริง** เมนูซ้ายเปลี่ยนเป็นแถบล่างต่ำกว่า 768px; ตารางเลื่อนแนวนอนในกรอบของมันเอง | กรรมการเปิดจากมือถือ |

ระดับความหนาแน่น: dashboard (ระยะ 8–32px เป็นหลัก) · Motion: ระดับเบา แต่มีจังหวะตอนโหลด/ประมวลผล

---

## 2. Tokens

โครงสร้าง 3 ชั้น: primitive → semantic → component โค้ดต้องอ้าง **semantic หรือ component token เท่านั้น** ห้ามอ้าง primitive ตรง ๆ ใน component และห้ามใช้ค่าตายตัว/arbitrary value (`[#123456]`, `p-[13px]`)

### 2.1 สี — Primitive

| ชื่อ | ค่า |
|---|---|
| `white` | `#FFFFFF` |
| `sky-25` | `#F8FAFC` |
| `sky-50` | `#F1F5FD` |
| `sky-75` | `#EAF1FE` |
| `sky-100` | `#E4ECFC` |
| `sky-300` | `#6B8FCB` |
| `blue-600` | `#2563EB` |
| `blue-700` | `#1D4ED8` |
| `blue-800` | `#1E40AF` |
| `ink-900` | `#0F172A` |
| `ink-600` | `#475569` |
| `green-700` / `green-600` / `green-100` | `#047857` / `#059669` / `#D1FAE5` |
| `amber-700` / `amber-100` | `#B45309` / `#FEF3C7` |
| `red-700` / `red-600` / `red-100` | `#B91C1C` / `#DC2626` / `#FEE2E2` |
| `cyan-700` / `cyan-100` | `#0369A1` / `#E0F2FE` |
| `indigo-700` / `indigo-100` | `#4338CA` / `#E0E7FF` |

### 2.2 สี — Semantic (ตรวจ contrast แล้วด้วยสคริปต์ ณ วันที่เขียน)

| Token | ค่า | ใช้กับ | Contrast ที่ต้องผ่าน |
|---|---|---|---|
| `bg-page` | `white` | พื้นหน้า | — |
| `bg-subtle` | `sky-25` | พื้นแถบเมนู/พื้นช่องกรอก | — |
| `bg-tint` | `sky-75` | แผงขวา, แถวที่เลือก, พื้นการ์ดเด่น | ink-900 บนนี้ 15.74 |
| `bg-hover` | `sky-50` | hover แถว/รายการ | — |
| `line-subtle` | `sky-100` | เส้นแบ่งส่วน/ขอบการ์ด (**ตกแต่งเท่านั้น 1.19:1**) | ยกเว้น WCAG 1.4.11 เพราะไม่ใช่ตัวบ่งชี้ control |
| `line-control` | `sky-300` | ขอบ input/ปุ่มรอง/ช่องตารางที่โต้ตอบ | **3.27 บน white, 3.13 บน sky-25 ✔ (≥3)** — ห้ามวาง control บน `bg-tint` (2.89 ✘) |
| `text-primary` | `ink-900` | ข้อความหลัก | บน white ≥ 15 |
| `text-secondary` | `ink-600` | ข้อความรอง | 7.58 บน white, 6.68 บน bg-tint ✔ |
| `text-on-action` | `white` | ข้อความบนปุ่มฟ้า | 5.17 บน blue-600, 6.7 บน blue-700 ✔ |
| `action` | `blue-600` | ปุ่มหลัก, ลิงก์, focus ring | 5.17 บน white ✔ |
| `action-hover` | `blue-700` | hover | |
| `action-press` | `blue-800` | active | |
| `action-soft-bg` / `action-soft-text` | `sky-100` / `blue-700` | ปุ่มรอง, ชิป, nav ที่เลือก | 5.65 ✔ |
| `success-text` / `success-fill` / `success-bg` | `green-700` / `green-600` / `green-100` | ผ่าน/ครบ | text: 5.48 บน white, 4.84 บน success-bg ✔ · fill ใช้กับไอคอน/แถบเท่านั้น (3.77 บน white **ห้ามเป็นข้อความ**) |
| `warning-text` / `warning-bg` | `amber-700` / `amber-100` | เตือน | 5.02 บน white, 4.51 บน warning-bg ✔ |
| `danger-text` / `danger-fill` / `danger-bg` | `red-700` / `red-600` / `red-100` | ข้อขัดแย้ง/ผิดพลาด | 5.3 บน danger-bg, 4.83 (red-600) บน white ✔ |
| `info-text` / `info-bg` | `cyan-700` / `cyan-100` | ข้อมูลทั่วไป, ชิปไอคอน | 5.17 ✔ |
| `accent-text` / `accent-bg` | `indigo-700` / `indigo-100` | ชิปไอคอนสีรอง (เฉพาะตกแต่งไอคอน/หมวดข้อมูล) | 6.41 ✔ |

กฎ: สีเขียว/เหลือง/แดง/indigo ห้ามเป็นสีตกแต่งพื้นหน้า ใช้เฉพาะสถานะและชิปไอคอน **ห้ามใช้สีเป็นตัวบอกความหมายอย่างเดียว** ต้องมีไอคอนหรือข้อความคู่ (สีตาบอดสี)

### 2.3 ตัวอักษร

| Token | ค่า |
|---|---|
| `font-display` | `"Noto Serif Thai", serif` (หัวเรื่อง H1/H2 และตัวเลขสถิติใหญ่) |
| `font-sans` | `"Noto Sans Thai", system-ui, sans-serif` (ทุกอย่างที่เหลือ) |
| น้ำหนัก | 400 / 500 / 600 (ใช้ 600 เฉพาะ display และปุ่ม) |
| ตัวเลข | `font-variant-numeric: tabular-nums` ทุกตัวเลขในตาราง/สถิติ |

| Token | ขนาด / line-height | ใช้กับ |
|---|---|---|
| `text-xs` | 12px / 1.5 | ป้ายกำกับเล็ก, ไม่ใช้กับเนื้อหาหลัก |
| `text-sm` | 14px / 1.6 | ตาราง, ข้อความรอง |
| `text-base` | 16px / 1.7 | เนื้อหา (ภาษาไทยต้อง line-height สูงเพื่อไม่ชนวรรณยุกต์) |
| `text-lg` | 18px / 1.6 | หัวการ์ด |
| `text-xl` | 22px / 1.4 | H3 |
| `text-2xl` | 28px / 1.3 | H2 |
| `text-3xl` | 36px / 1.25 | H1 หน้า |
| `text-4xl` | 48px / 1.2 | ตัวเลขสถิติเด่น |

Eyebrow (ป้ายอังกฤษเหนือหัวเรื่อง เช่น `IMPORT DATA`): `text-xs`, น้ำหนัก 500, `letter-spacing: 0.12em`, ตัวพิมพ์ใหญ่, สี `action-soft-text` — **ใช้กับข้อความละติน/ตัวเลขเท่านั้น** (ห้ามใช้ letter-spacing กับอักษรไทย)

### 2.4 ระยะ (4px base) — ใช้เฉพาะค่าเหล่านี้

`1=4` `2=8` `3=12` `4=16` `5=20` `6=24` `8=32` `10=40` `12=48` `16=64` (หน่วย px, ใน Tailwind คือคลาส `p-1`…`p-16` ตามเลขเดียวกัน; ห้ามค่านอกตารางนี้)

### 2.5 รูปทรง

| Token | ค่า | ใช้กับ |
|---|---|---|
| `radius-sm` | 8px | ช่องกรอก, ชิป, ช่องตาราง |
| `radius-md` | 12px | ปุ่ม, แถวเมนู |
| `radius-lg` | 20px | การ์ด |
| `radius-xl` | 28px | การ์ดเด่น/แผงใหญ่ |
| `radius-arch` | `200px 200px 20px 20px` | กรอบลวดลายเด่น (ขอบบนโค้งเต็ม) |
| `radius-full` | 9999px | pill, avatar |
| `border-width` | 1px (ปกติ), 2px (focus/สถานะเลือก) | |

### 2.6 เงา / ความสูง

| Token | ค่า | ใช้กับ |
|---|---|---|
| `shadow-card` | `0 1px 2px rgb(15 23 42 / 0.04), 0 12px 24px -16px rgb(37 99 235 / 0.18)` | การ์ดทั่วไป (คู่กับเส้น `line-subtle`) |
| `shadow-raised` | `0 2px 4px rgb(15 23 42 / 0.05), 0 16px 32px -16px rgb(37 99 235 / 0.28)` | การ์ดตอน hover (เฉพาะที่กดได้) |
| `shadow-overlay` | `0 24px 48px -12px rgb(15 23 42 / 0.25)` | dialog, popover, toast |
| focus ring | `0 0 0 2px white, 0 0 0 4px action` | ทุก element ที่โฟกัสได้ ห้ามลบ |

### 2.7 z-index / Breakpoint / Motion

| z-index | 0 base · 10 sticky header · 20 nav · 40 overlay · 50 dialog · 60 toast |
|---|---|

| Breakpoint | `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 |
|---|---|

| Motion token | ค่า |
|---|---|
| `duration-fast` / `base` / `slow` | 120ms / 200ms / 360ms |
| `duration-stagger` | 60ms ต่อรายการ (สูงสุด 8 รายการ แล้วหยุดไล่) |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease-emphasized` | `cubic-bezier(0.16, 1, 0.3, 1)` (ขาเข้า) |

กฎ motion: animate เฉพาะ `transform` และ `opacity` (แถบ/วงแหวนความคืบหน้าใช้ `scaleX` / `stroke-dashoffset`); ขาออกเร็วกว่าขาเข้า; ภายใต้ `prefers-reduced-motion: reduce` ปิดทุกการเคลื่อนไหวและแสดงสถานะสุดท้ายทันที
**แอนิเมชันที่อนุญาต (ครบทั้งหมด — ปรับ v0.2):**
1. *Page enter* — หัวเรื่อง + การ์ดแต่ละใบ fade + เลื่อนขึ้น 12px แบบไล่ทีละ `duration-stagger`
2. *Count-up* — ตัวเลขสถิติไล่จาก 0 ถึง**ค่าจริง**ภายใน `duration-slow` (เฉพาะตอนโหลดครั้งแรก)
3. *Stage list* — ขั้นตอนระหว่างจัดตาราง: ขั้นปัจจุบันมีจุดเต้นเบา, ขั้นที่เสร็จมีเครื่องหมายถูก
4. *Progress* — ค่า `progress` เป็นตัวเลข → แถบ/วงแหวนขยับตามค่านั้น; ค่าเป็น `null` → แถบ indeterminate (คลื่นสะท้อน) พร้อมข้อความ stage ห้ามแสดงเปอร์เซ็นต์
5. *Hover/Press* — ปุ่ม/การ์ดที่กดได้ ยกขึ้น 2px + `shadow-raised` (`duration-fast`)
6. *Dialog/Toast* — fade + scale 0.98→1 (`duration-base`)
7. *Motion background* — เส้นกริด `sky-100` เลื่อนช้า (40s) + วงฟ้าอ่อนเบลอ 2 วงลอยช้า (18s) อยู่หลังเนื้อหาทั้งหมด `aria-hidden` ไม่รับเมาส์ ความเข้มต่ำจนไม่รบกวนการอ่าน (เนื้อหาอยู่บนการ์ดพื้นขาวหรือพื้นเรียบเสมอ)
8. *Motion graphic* — ลายตารางคาบในการ์ดเด่น: ช่องทยอยเติม, ช่องขัดแย้งกะพริบแล้วหาย, เส้นสแกนกวาด วนซ้ำ เป็นภาพประกอบเชิงแนวคิดเท่านั้น **ไม่ใช่ผลจริงและห้ามวางที่ใดที่ผู้ใช้อาจเข้าใจว่าเป็นความคืบหน้า**

---

## 3. Components

ทุก component ต้อง: ใช้ token เท่านั้น, ขนาดสัมผัส ≥ 44×44px บนมือถือ, โฟกัสด้วยคีย์บอร์ดได้, มีป้าย/`aria` ที่จำเป็น, ใช้ภาษาไทยจากไฟล์ข้อความ (ไม่ฝังในโค้ด) สถานะ: default / hover / focus / active / disabled / loading — "n/a" ระบุเหตุผล
ที่ตั้งโค้ด: `components/common/` (ปุ่ม ฯลฯ), `layout/`, `import/`, `requests/`, `schedule/` ตาม CLAUDE.md §12.3

### Button
- Variant: `primary` (พื้น `action`, ตัวอักษร `text-on-action`) · `secondary` (พื้น `bg-page`, ขอบ `line-control`, ตัวอักษร `action-soft-text`) · `ghost` (ไม่มีขอบ, hover `bg-hover`) · `danger` (พื้น `danger-fill`… ใช้กับ "ยกเลิกงาน" ต้องมี dialog ยืนยัน)
- ขนาด: `md` สูง 44px padding-x 5, `sm` สูง 36px (เฉพาะเดสก์ท็อปในตาราง), ตัวอักษร `text-sm` 600, `radius-md`, ไอคอน 20px ห่างข้อความ 2
- สถานะ: hover `action-hover` + ยกขึ้น 2px · active `action-press` ไม่ยก · focus ring · disabled พื้น `bg-hover` ตัวอักษร `text-secondary` ไม่มีเงา `aria-disabled` · loading แสดงไอคอนหมุน + ข้อความ "กำลัง…" ปุ่มกดซ้ำไม่ได้ (`aria-busy`)
- Do: ปุ่มหลักต่อหนึ่งส่วนหน้าจอ 1 ปุ่ม · Don't: ปุ่มที่มีแต่ไอคอนโดยไม่มี `aria-label`

### Link
- สี `action`, ขีดเส้นใต้ตอน hover/focus, ลิงก์ในย่อหน้าขีดเส้นใต้ตลอด; ลิงก์ภายนอกมีไอคอน + `rel="noopener"`; disabled: n/a (ใช้ข้อความธรรมดา)

### AppShell (Layout component)
- **เมนูเดียว = Topbar ลอย** (ไม่มี sidebar/drawer/mega menu เพื่อไม่ให้ซ้ำ): ห่างขอบจอ 16px สูง 64px `radius-xl` ขอบ `line-subtle` `shadow-raised` พื้น `bg-page` โปร่ง 90% + blur; ค้างอยู่บนสุด (`fixed`)
- รายการ: 6 ขั้นตอน ไอคอน 20px + "N. ชื่อไทย" (≥ 1024px) หรือไอคอนอย่างเดียว + `sr-only`/`title` (< 1024px); สูง ≥ 44px; ที่เลือก: พื้น `action` ตัวอักษร `text-on-action` `shadow-card` `aria-current="page"`; hover `bg-hover`
- โลโก้ซ้าย (ซ่อน < 640px), ป้ายโหมด "ข้อมูลจำลอง" ขวา (แสดง ≥ 1280px) ตาม CLAUDE.md §12.4
- **แผงขวา** (≥ xl): ลอยห่างขอบ 16px กว้าง 288px พื้น `bg-tint` ใช้แสดงสถานะงานปัจจุบัน; < xl ไม่แสดง (ข้อมูลเดียวกันต้องอยู่ในเนื้อหาหน้า)
- Skip link "ข้ามไปยังเนื้อหา" เป็นสิ่งแรกที่โฟกัสได้

### Card
- พื้น `bg-page`, ขอบ `line-subtle` 1px, `radius-lg`, `shadow-card`, padding 6 (มือถือ 4); หัวการ์ด `text-lg` 600
- `Card.feature`: พื้น `bg-tint`, `radius-xl`, มีลวดลาย SVG (ดู Pattern) ใช้ได้ 1 ใบต่อหน้า
- สถานะ: ถ้ากดได้ → hover ยก+`shadow-raised`, focus ring, active ไม่ยก; ถ้าไม่ได้ → ไม่มี hover; loading = Skeleton ขนาดเท่ากัน (กัน layout shift)

### SectionHeading
- Eyebrow (ถ้ามี) + H2/H3 `font-display` 600; ปุ่มกระทำรองชิดขวา; หนึ่งหน้ามี H1 เดียว ลำดับไม่ข้ามระดับ

### StatTile
- ชิปไอคอน 48px `radius-full` (สี `info`/`accent`/`success`/`warning`) + ป้าย `text-sm` `text-secondary` + ตัวเลข `font-display` `text-4xl` tabular + บรรทัดรอง `text-sm` (เช่น "จัดได้ 611 จาก 612")
- Count-up ตอนโหลดครั้งแรก; การเปลี่ยนค่าทีหลังเปลี่ยนทันที ไม่ไล่; มี `aria-label` อ่านค่าเต็ม

### Badge / StatusPill
- pill `radius-full` `text-xs` 500 padding 2×3 + ไอคอน 16px **ต้องมีไอคอนหรือข้อความ ไม่ใช้สีอย่างเดียว**
- ชนิด: `success` `warning` `danger` `info` `neutral` และ `simulated` ("ข้อมูลจำลอง") สถานะงาน: `queued` `running` `completed` `completed_partial` `failed` `cancelled` ตาม [API-CONTRACT §0.4](docs/API-CONTRACT.md)
- n/a: hover/active (ไม่โต้ตอบ)

### Input / Textarea / Select
- สูง 44px (textarea min 120px), พื้น `bg-page` หรือ `bg-subtle`, ขอบ `line-control` 1px, `radius-sm`, `text-base`; **ป้ายกำกับมองเห็นตลอด** เหนือช่อง (ห้าม placeholder แทนป้าย), ข้อความช่วยใต้ช่อง `text-sm` `text-secondary`
- สถานะ: hover ขอบ `action` · focus ขอบ 2px `action` + ring · error ขอบ `danger-fill` + ข้อความ+ไอคอนใต้ช่อง (`aria-describedby`, `aria-invalid`) · disabled พื้น `bg-hover` · loading n/a (ใช้ปุ่มส่ง)

### FileDropzone (หน้า 1)
- กรอบประเส้นขีด 2px `line-control` `radius-xl` พื้น `bg-subtle`, ไอคอนอัปโหลด, ข้อความไทย "ลากไฟล์ .xlsx มาวาง หรือเลือกไฟล์" + ขีดจำกัดขนาด/ชนิดจาก config; เป็นปุ่มที่กด/Enter/Space เปิดตัวเลือกไฟล์ได้ (input ซ่อนด้วย `sr-only` ไม่ใช่ `display:none`)
- สถานะ: hover/drag-over พื้น `bg-tint` ขอบ `action` · focus ring · disabled (ระหว่างอัปโหลด) · loading แถบความคืบหน้าอัปโหลดตามจริง หรือ indeterminate · error แสดงข้อความของ `error.code` ที่แปลเป็นไทย + `requestId`
- ตรวจชนิด/ขนาดฝั่ง client ก่อนส่ง (UX เท่านั้น; ความถูกต้องจริงอยู่ฝั่ง backend)

### DataTable (ใช้แสดง issues หน้า 1, ข้อขัดแย้ง หน้า 3, ข้อมูลสรุป)
- หัวตาราง `bg-subtle` `text-xs` 600, แถว `text-sm` สูง 48px เส้นแบ่งแถว `line-subtle`, แถว hover `bg-hover`, ตัวเลข tabular ชิดขวา
- `<table>` จริง + `scope` + `caption`; เลื่อนแนวนอนในกรอบ `overflow-x-auto` (มี `tabindex=0` + `aria-label`) บนมือถือ; หน้าละ ≤ 50 แถวพร้อม pagination (CLAUDE.md §7)
- ระดับ `severity` แสดงด้วย StatusPill (ไอคอน+ข้อความ); สถานะ: empty ("ไม่พบปัญหา" + ไอคอนสำเร็จ) · loading (Skeleton แถว) · error (กล่องข้อผิดพลาดพร้อมปุ่มลองใหม่)

### Stepper / StageList (หน้า 3)
- รายการแนวตั้งของ `stage` (QUEUED → VALIDATING → ASSIGNING_SLOTS → RESOLVING_CONFLICTS → FINALIZING): ขั้นเสร็จ=เครื่องหมายถูก `success-fill`, ขั้นปัจจุบัน=จุดเต้น `action`, ขั้นรอ=วงกลมโปร่ง; อ่านค่าด้วย `aria-live="polite"`; ชื่อขั้นแปลไทยจาก config (ไม่แสดงรหัสดิบ)

### Progress (Bar + Ring)
- Bar: สูง 8px `radius-full` ราง `sky-100` แถบ `action` ขยับด้วย `scaleX`; Ring: ขนาด 160px เส้น 12px (`stroke-dashoffset`) ตัวเลขกลางเป็น `font-display`
- ค่า `null` → indeterminate (ไม่มีตัวเลข); `role="progressbar"` + `aria-valuenow` เฉพาะเมื่อมีค่า; reduced-motion = ไม่เคลื่อนไหว

### Tabs / Segmented
- ใช้สลับมุมมอง (ครู/ห้อง/กลุ่ม หน้า 4): pill ใน `bg-subtle` ที่เลือก=พื้นขาว+ขอบ `line-subtle`+ตัวอักษร `action-soft-text`; ลูกศรซ้าย/ขวาเลื่อนระหว่างแท็บ (`role="tablist"`); hover `bg-hover`; disabled ลดความเข้ม+`aria-disabled`

### TimetableGrid + ClassCell (หน้า 4) — component หลัก
- ตาราง วัน × คาบ (จำนวนวัน/คาบ**มาจากข้อมูลนำเข้า** ห้ามฝัง); หัวคอลัมน์วัน, หัวแถวคาบ sticky; ช่องสูงขั้นต่ำ 72px `radius-sm`
- ClassCell: ชื่อวิชา `text-sm` 600 + ครู/ห้อง `text-xs`; สีพื้นอ่อนแยกวิชาจากชุด `info`/`accent`/`success`/`warning` เวียนตามรหัสวิชา (ตัวอักษรผ่าน AA) — ช่องมีข้อขัดแย้งขอบ `danger-fill` 2px + ไอคอน ไม่ใช้สีอย่างเดียว
- สถานะ: ว่าง (เส้นประ `line-subtle`) · hover/focus แสดงรายละเอียด (popover) · เลือกด้วยคีย์บอร์ดได้ทีละช่อง (roving tabindex) · loading Skeleton กริดเท่าขนาดจริง
- มือถือ: เลื่อนแนวนอนในกรอบ พร้อมหัวแถว sticky; หรือสลับเป็นมุมมองรายวัน (Tabs เลือกวัน)

### MiniCalendar / ตัวสรุปรอบ (แผงขวา)
- กริด 7 คอลัมน์ ตัวอักษร `text-sm` tabular วันที่เลือก pill `action` ตัวอักษรขาว; ใช้แสดงวันในสัปดาห์การเรียน (ไม่ใช่ปฏิทินวันที่จริง) — **เพิ่มเฉพาะเมื่อมีข้อมูลให้แสดง** ถ้าไม่ใช้ให้ตัดออกจากหน้า (ไม่ใส่ตกแต่งเปล่า)

### Chart (หน้า 5, ใช้ Recharts)
- กราฟแท่งเปรียบเทียบ `baseline` vs `team`: สีสองชุด = `blue-600` และ `sky-300` (+ ลวดลาย/ป้ายตัวเลขบนแท่ง ไม่พึ่งสีอย่างเดียว); มี legend, tooltip, ตารางข้อมูลเทียบเท่าใต้กราฟ (`<table>` ซ่อนด้วย `sr-only` หรือแสดง); เส้นกริด `line-subtle`; ป้าย "ข้อมูลจำลอง" ชัดเจนเมื่อ `isSimulated`
- แอนิเมชันกราฟ: แท่งโตจากฐาน `duration-slow` ครั้งเดียว; reduced-motion = ไม่โต

### Dialog / ConfirmDialog (ป๊อปอัป)
- ใช้ `<dialog>` ดั้งเดิม (`showModal`) ได้กับดักโฟกัส/Esc/คืนโฟกัสจากเบราว์เซอร์; คลิกฉากหลังปิดได้; โฟกัสแรกอยู่ปุ่มปลอดภัย ("กลับ"); shortcut: ไม่มีแอนิเมชันขาออก
- กลางจอ กว้างสูงสุด 480px `radius-xl` `shadow-overlay` พื้น `bg-page` + backdrop `ink-900` 40%; กับดักโฟกัส, ปิดด้วย Esc, คืนโฟกัสให้ตัวเรียก, ปุ่มหลักชิดขวา; **ยกเลิกงาน/ทิ้งข้อมูลต้องผ่านตัวนี้**
- สถานะ: loading ปุ่มยืนยันเป็น loading · ข้ามได้ n/a

### Card.deep (จุดเด่น)
- พื้น `action-press` ตัวอักษร `text-on-action` (contrast 8.7:1) ใช้ **ได้ 1 ใบต่อหน้า** เป็นจุดสนใจหลัก; ปุ่มในนั้นใช้ variant `inverse` (พื้นขาว); ลวดลาย/กราฟิกวางบนพื้นขาวในการ์ด
### StatTile emphasis
- พื้น `action` ตัวอักษรขาว (5.17:1) ไอคอนในวงขาว ใช้ได้ 1 ใบต่อแถว เพื่อเน้นตัวเลขที่สำคัญที่สุด
### Alert / Toast / ErrorState / EmptyState / Skeleton
- Alert (ในหน้า): แถบ `*-bg` ขอบซ้าย 4px สีสถานะ ไอคอน+หัวข้อ+คำอธิบาย; ข้อผิดพลาดแสดงข้อความไทยจาก `error.code` + `requestId` (ห้ามแสดง `message` ดิบ)
- Toast: มุมล่างขวา (มือถือ: ล่างเต็มกว้าง) `aria-live`, หายเองหลัง 6s ยกเว้นข้อผิดพลาด; ไม่ใช่ที่เดียวที่แจ้งข้อผิดพลาดสำคัญ
- EmptyState: ไอคอนเส้น 48px + หัวข้อ + คำอธิบาย + ปุ่มนำทางไปขั้นต่อไป
- ErrorState: เหมือน EmptyState + ปุ่มลองใหม่ + `requestId`
- Skeleton: พื้น `sky-50` คลื่นสะท้อน opacity เบา; reduced-motion = นิ่ง
- ทุกหน้าต้องมีครบ 4 สถานะ: loading / error / empty / success (CLAUDE.md §11.3)

### Pattern: ลวดลายการ์ดเด่น (SVG วาดเอง)
- กริดคาบ (เส้น `sky-300` ที่ opacity ต่ำ) ซ้อนช่องสี่เหลี่ยมมนไม่กี่ช่องเป็น `action-soft-bg`/`info-bg` ภายใต้กรอบ `radius-arch`; `aria-hidden="true"` `alt=""` ตกแต่งล้วน; ไม่ใส่ข้อมูลจริงในลวดลาย
- ลวดลายนี้ไม่ใช่ component ใหม่ที่ซ้ำ — เป็นพื้นหลังของ `Card.feature`

---

## 4. Layout

**Grid & container**
- เนื้อหา `max-width` 1200px กึ่งกลางเมื่อไม่มีแผงขวา; ระยะขอบข้าง 16px (< md), 24px (md), 32px (≥ lg)
- กริด 12 คอลัมน์ ช่องว่าง 16px (< md) / 24px (≥ md)
- โครงหน้า: Topbar ลอยด้านบนทุกขนาด เนื้อหาเว้นด้านบน 112px; (≥ xl): `[Content flex] [RightPanel 320]`; (< xl): `[Content]` คอลัมน์เดียว

**Breakpoint behavior**

| ช่วง | พฤติกรรม |
|---|---|
| < 640 (มือถือ) | คอลัมน์เดียว, การ์ดซ้อนกัน, ตารางเลื่อนแนวนอน, ปุ่มหลักเต็มความกว้าง |
| 640–767 | StatTile 2 คอลัมน์ |
| 768–1023 | Sidebar เต็ม, StatTile 2–4 คอลัมน์ |
| 1024–1279 | เนื้อหาหลัก 8 + 4 คอลัมน์ได้ในหน้าที่มีการ์ดข้าง |
| ≥ 1280 | แผงขวาปรากฏ |

**จัดตำแหน่ง/จังหวะแนวตั้ง**
- หัวหน้า (Eyebrow + H1 + คำอธิบาย) ห่างเนื้อหา 32px; ระหว่างส่วนหลัก 32px; ระหว่างการ์ดในส่วนเดียวกัน 24px; ภายในการ์ด 16–24px; หัวส่วน → เนื้อหา 16px
- ชิดซ้ายทั้งหมด (ข้อความไทย) ตัวเลขในตารางชิดขวา; ไม่จัดกึ่งกลางย่อหน้ายาว
- ทุกหน้ามีโครง: Eyebrow+H1 → แถวสรุป (StatTile) ถ้ามี → เนื้อหาหลัก → การกระทำถัดไป ("ไปขั้นที่ N")
- หน้า 404 และหน้า error 500 มีดีไซน์ตามระบบนี้ (CLAUDE.md §9 ข้อ 3)

---

## 5. Rules (บังคับ)

1. Design System ที่อนุมัติแล้วสำคัญกว่ารสนิยม ความสะดวก และความเร็ว
2. ห้ามสี ระยะ ฟอนต์ เงา z-index motion นอก token; ห้าม arbitrary value ใน Tailwind (`[#…]`, `p-[13px]`) และห้าม hex/rgb ในไฟล์นอก `tokens.css` (ตรวจด้วย `check_tokens.py` ทุกครั้ง)
3. component ใช้ซ้ำก่อนสร้างใหม่ — ค้นโค้ดก่อน; component ใหม่ต้องเพิ่มใน §3 พร้อมเหตุผลก่อน
4. ห้าม dependency ใหม่โดยไม่ผ่านเช็ก 5 ข้อ + license + `npm audit` และต้องแจ้งผู้ใช้
5. ห้ามแก้ token/มาตรฐาน component เอง — เสนอเป็นข้อเสนอพร้อมหลักฐาน/ผลกระทบ รออนุมัติ แล้วอัปเดตเอกสาร, `tokens.css`, Changelog พร้อมกัน
6. Accessibility เป็นส่วนหนึ่งของ "เสร็จ": semantic HTML, focus เห็นชัด, คีย์บอร์ดครบ, contrast ตามตาราง, `prefers-reduced-motion`
7. ห้ามใช้สีอย่างเดียวบอกความหมาย; ห้าม emoji เป็นไอคอน (ใช้ Lucide ชุดเดียวเส้นหนา 1.75 ขนาด 16/20/24)
8. Motion ต้องซื่อตรงต่อข้อมูลจริง: ห้ามเปอร์เซ็นต์/แถบปลอม, ห้าม count-up ไปยังค่าที่ไม่ใช่ค่าจริง; ข้อมูลจำลองต้องมีป้าย
9. ข้อความทุกอย่างที่ผู้ใช้เห็นอยู่ในไฟล์ข้อความ (i18n/constants) ไม่ฝังใน JSX (CLAUDE.md §10.4)
10. ไม่มีภาพสต็อก/มาสคอต; ลวดลายเป็น SVG ที่เราวางเอง; gradient ใช้ได้เฉพาะเส้นกริดของ motion background (เส้น 1px) ไม่ใช้เป็นพื้นสี
11a. สีเข้ม (`action`/`action-press`) เป็นพื้นได้เฉพาะ 3 จุดเด่น: เมนูที่เลือก, `Card.deep` 1 ใบ/หน้า, `StatTile emphasis` 1 ใบ/แถว
11. ปฏิบัติตามข้อบังคับ CLAUDE.md ที่เกี่ยวกับ UI: ไม่เกิน 150 บรรทัดต่อ component, page ประกอบ component เท่านั้น, 4 สถานะทุกหน้า
12. ข้อจำกัดทางเทคนิคที่ทำให้ทำตามกฎไม่ได้ → หยุดและแจ้งผู้ใช้ก่อน ห้ามเลี่ยงเงียบ ๆ

**เครื่องมือและ stack ที่ใช้ (ตรวจจากโปรเจกต์แล้ว)**: React 19 + Vite 8 (`.jsx`), Tailwind CSS 4 (tokens ผ่าน `@theme`), React Router 8, Lucide React, Recharts, Zod (ตรวจ response), Motion (แอนิเมชัน), Vitest + Testing Library, oxlint (มากับ template) — รายละเอียดและเหตุผลดูใน Changelog

---

## 6. Changelog

| วันที่ | เวอร์ชัน | การเปลี่ยนแปลง | เหตุผล | อนุมัติโดย |
|---|---|---|---|---|
| 2026-10-31 | v0.1 (ร่าง) | สร้างเอกสารครั้งแรก ทั้ง 6 ส่วน | ผู้ใช้อนุมัติทิศทาง (ขาว+เส้นฟ้า, ลอกสไตล์จากภาพ, มี motion ตอนโหลด/ประมวลผล) | **รอผู้ใช้ตรวจอนุมัติเอกสารนี้** |
| 2026-10-31 | v0.1 | มุมโค้งใหญ่ขึ้น (20–28px) และใช้เงานุ่มบาง จากที่เสนอไว้เดิม (6–8px / ไม่มีเงา) | ผู้ใช้ขอให้ลอกสไตล์จากภาพอ้างอิงที่มุมมนและเงานุ่ม | รอตรวจ |
| 2026-10-31 | v0.1 | เลือก Noto Serif Thai เป็น `font-display` เพิ่ม | ให้ดู editorial ตามภาพบ้าน ไม่ให้ดูเป็นแดชบอร์ดทั่วไป | **เสนอ — ผู้ใช้ยังไม่เห็น** |
| 2026-10-31 | v0.3 | เพิ่ม Topbar ลอย + Mega menu + Drawer มือถือ และทำ Sidebar/แผงขวาลอยห่างขอบจอพร้อมเงา; ยกเลิก bottom bar | ผู้ใช้ขอเมนูสมัยใหม่ที่ไม่ติดขอบจอ | **ผู้ใช้สั่ง — ยังไม่ได้ตรวจเอกสาร** |
| 2026-10-31 | v0.4 | เหลือเมนูเดียว: Topbar ลอย; ลบ Sidebar, Mega menu, Drawer ออก | ผู้ใช้สั่งให้เลือกแบบเดียว ไม่ซ้ำกัน | **ผู้ใช้สั่ง — ยังไม่ได้ตรวจเอกสาร** |
| 2026-10-31 | v0.2 | เพิ่ม motion background, motion graphic, Dialog/Toast จริง, `Card.deep`, `StatTile emphasis`; เมนูที่เลือกเป็นพื้น `action` เต็ม; ผ่อนกฎ gradient เฉพาะเส้นกริดพื้นหลัง | ผู้ใช้ขอเพิ่ม motion graphic/background/ป๊อปอัป และการใช้สีตัดเพื่อสร้างจุดเด่น | **ผู้ใช้สั่งเพิ่ม — ยังไม่ได้ตรวจเอกสาร** |
| 2026-10-31 | v0.1 | ไม่ติดตั้ง ExcelJS / jsPDF / Radix / ESLint ที่เสนอไว้เดิม | Backend (Python) อ่าน Excel และสร้าง PDF/Excel ตาม API-CONTRACT; oxlint มากับ template; Radix ยังไม่มี component ที่ต้องใช้ (เพิ่มได้เมื่อทำ Dialog/Tabs ตามขั้นตอนเช็ก 5 ข้อ) | — |
| 2026-10-31 | v0.1 | ใช้ JSX ไม่ใช่ TypeScript | ตาม CLAUDE.md §12.1 | — |
