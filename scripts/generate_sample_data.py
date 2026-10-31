# -*- coding: utf-8 -*-
"""สร้างไฟล์ Excel ตัวอย่าง 3 ขนาด (เล็ก/กลาง/ใหญ่) รูปแบบเดียวกับไฟล์โจทย์ 7 แผ่นงาน แล้วตรวจว่าจัดตารางได้จริง

ใช้: python scripts/generate_sample_data.py [โฟลเดอร์ปลายทาง]   (ค่าเริ่มต้น apps/web/public/samples)
ข้อมูลทั้งหมดเป็นข้อมูลสมมติ (ชื่อสุ่มจากรายการ) ไม่มีข้อมูลบุคคลจริง; seed คงที่ทำให้ได้ไฟล์เดิมทุกครั้ง
ตัวตรวจความเป็นไปได้ใช้เฉพาะกฎห้ามผิดข้อ 1-3, 5-10 ของโจทย์ (ไม่ใช่ตัวจัดตารางของระบบ) เพื่อยืนยันว่าชุดข้อมูลมีคำตอบ
"""
import random
import sys
from pathlib import Path

import openpyxl

DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์']
PERIODS_PER_DAY = 8
FIRST = ['สมชาย', 'สมหญิง', 'ประภาพร', 'ศิริพร', 'นภัสสร', 'วรรณา', 'อรุณี', 'ธนากร', 'กิตติ', 'จิราพร', 'ณัฐพล', 'อำไพ', 'ปรีชา', 'สุรชัย', 'มาลี', 'พิมพ์ชนก', 'วิชัย', 'เกียรติศักดิ์', 'ณัฐวุฒิ', 'รัตนา', 'สุภาพร', 'ชัยวัฒน์', 'ปวีณา', 'อนุชา', 'กัญญา', 'สมพงษ์', 'ศักดิ์ชัย', 'เบญจมาศ', 'ธีรพงษ์', 'ลลิตา']
LAST = ['ใจดี', 'มูลเมือง', 'แก้วประเสริฐ', 'คำแสน', 'พลอยงาม', 'สุขสวัสดิ์', 'ปัญญาดี', 'จันทร์แก้ว', 'ภูมิใจ', 'ศรีสุข', 'สายสุวรรณ', 'รักษา', 'บุญมี', 'วงศ์ใหญ่', 'ทองดี', 'เพ็ชรรัตน์', 'อินทร์แก้ว', 'ชัยมงคล', 'พันธุ์ทอง', 'สิริวัฒน์']
DEPTS = [
    dict(name='เทคโนโลยีสารสนเทศ', gid='IT', tid='TIT', practice='ห้องคอมพิวเตอร์'),
    dict(name='ไฟฟ้ากำลัง', gid='ELEC', tid='TEL', practice='ห้องปฏิบัติการไฟฟ้า'),
    dict(name='การบัญชี', gid='ACC', tid='TAC', practice='ห้องคอมพิวเตอร์'),
    dict(name='ช่างกลโรงงาน', gid='MECH', tid='TME', practice='ห้องปฏิบัติการช่างกล'),
    dict(name='อิเล็กทรอนิกส์', gid='ELT', tid='TET', practice='ห้องปฏิบัติการอิเล็กทรอนิกส์'),
]
GENERAL = 'สามัญสัมพันธ์'
# ภาระต่อกลุ่มราว 25 คาบ จากที่จัดได้ 36 คาบ/สัปดาห์ (ราว 70%) เพื่อให้มีคำตอบและเหลือทางเลือกให้ตัวจัดตาราง
SPECIFIC_TPN = [(2, 2, 3), (1, 3, 2), (0, 4, 2), (1, 2, 2), (3, 0, 3)]
GENERAL_TPN = [(2, 0, 2), (2, 0, 2), (3, 0, 3)]
SIZES = {  # ชื่อ: (จำนวนแผนก, ปี, กลุ่มต่อปี)
    'small': (2, 2, 1),
    'medium': (3, 2, 3),
    'large': (5, 2, 9),
}
ROOM_FILL = 0.55  # เผื่อที่ว่างให้ตัวจัดตารางมีทางเลือก
TEACHER_CAP = 16  # คาบสอน/สัปดาห์ต่อครู


def span_ok(day, start, n):
    end = start + n - 1
    return (start <= 4) == (end <= 4) and end <= PERIODS_PER_DAY and not (day == 2 and end >= 7)


def build(size, seed=2026):
    rnd = random.Random(f'{seed}-{size}')
    n_dept, years, secs = SIZES[size]
    depts = DEPTS[:n_dept]
    names = rnd.sample([f'ครู{f} {l}' for f in FIRST for l in LAST], 400)
    groups, courses, assigns, gen_courses = [], {}, [], []
    code_no = 1100
    for tpn in GENERAL_TPN:
        code_no += 1
        code = f'30000-{code_no}'
        courses[code] = dict(code=code, name=f'วิชาสามัญ {code_no - 1100}', tpn=tpn, dept=GENERAL, room=None)
        gen_courses.append(code)
    for d in depts:
        d['courses'] = []
        for i, tpn in enumerate(SPECIFIC_TPN):
            code = f'3{depts.index(d)}001-2{i + 1:03d}'
            courses[code] = dict(code=code, name=f'วิชาชีพ {d["name"]} {i + 1}', tpn=tpn, dept=d['name'], room=d['practice'] if tpn[1] else None)
            d['courses'].append(code)
        for y in range(1, years + 1):
            for s in range(1, secs + 1):
                groups.append(dict(id=f'{d["gid"]}-H{y}{s}', name=f'ปวส.{y}/{s} {d["name"]}', dept=d['name'], size=rnd.randint(20, 40), d=d, y=y, s=s))
    n = 0
    for d in depts:
        for g in [g for g in groups if g['d'] is d]:
            for code in d['courses']:
                n += 1
                assigns.append(dict(id=f'S{n:04d}', course=code, groups=[g['id']], dept=d['name']))
    for d in depts:
        for y in range(1, years + 1):
            cohort = [g for g in groups if g['d'] is d and g['y'] == y]
            chunks = [cohort[i:i + 2] for i in range(0, len(cohort), 2)]
            for chunk in chunks:
                for code in gen_courses:
                    n += 1
                    assigns.append(dict(id=f'S{n:04d}', course=code, groups=[g['id'] for g in chunk], dept=GENERAL))
    gsize = {g['id']: g['size'] for g in groups}

    # ครู: เลือกคนที่ภาระน้อยที่สุดในแผนกนั้น แล้วเพิ่มคนใหม่เมื่อเต็ม
    pools = {d['name']: [] for d in depts}
    pools[GENERAL] = []
    prefix = {d['name']: d['tid'] for d in depts}
    prefix[GENERAL] = 'TGEN'
    teachers = {}
    for a in assigns:
        t, p, _ = courses[a['course']]['tpn']
        load = t + p
        pool = pools[a['dept']]
        pick = min(pool, key=lambda x: teachers[x]['load']) if pool else None
        if pick is None or teachers[pick]['load'] + load > TEACHER_CAP:
            tid = f'{prefix[a["dept"]]}{len(pool) + 1:02d}'
            pool.append(tid)
            teachers[tid] = dict(id=tid, name=names[len(teachers)], dept=a['dept'], max=rnd.randint(5, 8), load=0, off=[])
            pick = tid
        teachers[pick]['load'] += load
        a['teacher'] = pick
    for tid, t in teachers.items():
        for _ in range(rnd.choice([0, 1, 1, 2])):
            day = rnd.choice(DAYS)
            start = rnd.randint(1, 7)
            t['off'].append((tid, day, start, min(8, start + rnd.randint(0, 2))))

    # ห้อง: นับคาบที่ต้องใช้ แล้วสร้างให้พอ (+ ห้องใหญ่รองรับเรียนรวม)
    theory = sum(courses[a['course']]['tpn'][0] for a in assigns)
    slots = (len(DAYS) * PERIODS_PER_DAY - 2) * ROOM_FILL
    rooms = []
    n_lr = max(3, int(theory / slots) + 1)
    for i in range(n_lr):
        rooms.append((f'LR-{i + 1:02d}', f'ห้องบรรยาย LR-{i + 1:02d}', 'ห้องบรรยาย', 45, f'อาคาร {1 + i % 3}'))
    big = sum(courses[x['course']]['tpn'][0] for x in assigns if sum(gsize[g] for g in x['groups']) > 45)  # เรียนรวมเกิน 45 คนต้องใช้ห้องใหญ่
    for i in range(max(1, int(big / slots) + 1)):
        rooms.append((f'AUD-{i + 1:02d}', f'ห้องบรรยายรวม AUD-{i + 1:02d}', 'ห้องบรรยาย', 90, 'อาคาร 3'))
    for ptype in sorted({courses[a['course']]['room'] for a in assigns if courses[a['course']]['room']}):
        need = sum(courses[a['course']]['tpn'][1] for a in assigns if courses[a['course']]['room'] == ptype)
        short = {'ห้องคอมพิวเตอร์': 'COM', 'ห้องปฏิบัติการไฟฟ้า': 'EL', 'ห้องปฏิบัติการช่างกล': 'ME', 'ห้องปฏิบัติการอิเล็กทรอนิกส์': 'ET'}[ptype]
        for i in range(max(2, int(need / slots) + 1)):
            rooms.append((f'{short}-{i + 1:02d}', f'{ptype} {short}-{i + 1:02d}', ptype, 40, f'อาคาร {1 + i % 3}'))

    # คำขอพิเศษ: รูปแบบเดียวกับไฟล์โจทย์ ใช้ชื่อและรหัสจากข้อมูลที่สร้าง
    reqs = []
    tl = list(teachers.values())
    d0 = depts[0]
    reqs += [('ฝ่ายวิชาการ', f'{tl[0]["name"]} ต้องไปนิเทศนักศึกษาฝึกงานทุกบ่ายวันพุธ ขอไม่มีคาบสอนช่วงบ่ายวันนั้น')]
    if len(tl) > 1:
        reqs += [('ฝ่ายวิชาการ', f'{tl[1]["name"]} ติดภารกิจศึกษาต่อทุกบ่ายวันพุธ ขอไม่มีคาบสอนช่วงบ่ายวันนั้น')]
    reqs += [(f'หัวหน้าแผนกวิชา{d0["name"]}', f'แผนกวิชา{d0["name"]}ขอให้จัดคาบปฏิบัติไว้ช่วงเช้าให้มากที่สุดเท่าที่ทำได้ เพราะช่วงบ่ายห้องปฏิบัติการร้อนมาก')]
    reqs += [(tl[2 % len(tl)]['name'], f'{tl[2 % len(tl)]["name"]} บ้านอยู่ต่างอำเภอ เดินทางไกล ถ้าเลี่ยงได้ขอไม่สอนคาบแรก (08.00 น.)')]
    g0 = groups[0]
    reqs += [('ครูที่ปรึกษา', f'กลุ่ม {g0["name"]} ({g0["id"]}) เป็นนักกีฬาของวิทยาลัย ต้องซ้อมกีฬาทุกวันพฤหัสบดี ขอให้เลิกเรียนไม่เกิน 15.00 น.')]
    reqs += [(tl[3 % len(tl)]['name'], f'{tl[3 % len(tl)]["name"]} ขอสอนเฉพาะวันจันทร์และวันอังคาร เพื่อนำวันที่เหลือไปทำผลงานวิชาการ')]
    if size != 'small':
        reqs += [('งานอาคารสถานที่', f'ห้อง {rooms[1][0]} ปิดปรับปรุงระบบไฟฟ้าทั้งวันอังคาร งดใช้ห้องทั้งวัน')]
    return dict(groups=groups, courses=courses, assigns=assigns, teachers=teachers, rooms=rooms, reqs=reqs, gsize=gsize)


def feasible(data, tries=40):
    """ตรวจว่ามีคำตอบ: วางทุกบล็อกลงตารางโดยไม่ผิดกฎห้ามผิดด้านเวลา/ห้อง/ครู/กลุ่ม (ข้ามคำขอพิเศษ)"""
    blocks = []
    for a in data['assigns']:
        t, p, _ = data['courses'][a['course']]['tpn']
        stu = sum(data['gsize'][g] for g in a['groups'])
        if t: blocks.append((a, t, stu, 'ห้องบรรยาย'))
        if p: blocks.append((a, p, stu, data['courses'][a['course']]['room']))
    off = {}
    for t in data['teachers'].values():
        for _, day, f, to in t['off']:
            off.setdefault(t['id'], []).append((DAYS.index(day), f, to))
    for seed in range(tries):
        rnd = random.Random(seed)
        order = sorted(blocks, key=lambda b: (-b[1], -len(b[0]['groups']), rnd.random()))
        busy = set()
        per_day = {}
        ok = True
        for a, n, stu, rtype in order:
            cands = [(d, s) for d in range(5) for s in range(1, 9) if span_ok(d, s, n)]
            rnd.shuffle(cands)
            placed = False
            for d, s in cands:
                ps = range(s, s + n)
                if any(d == od and not (s + n - 1 < f or s > to) for od, f, to in off.get(a['teacher'], [])): continue
                if per_day.get((a['teacher'], d), 0) + n > data['teachers'][a['teacher']]['max']: continue
                if any(('t', a['teacher'], d, p) in busy or any(('g', g, d, p) in busy for g in a['groups']) for p in ps): continue
                room = next((r for r in data['rooms'] if r[2] == rtype and r[3] >= stu and not any(('r', r[0], d, p) in busy for p in ps)), None)
                if not room: continue
                for p in ps:
                    busy.add(('t', a['teacher'], d, p)); busy.add(('r', room[0], d, p))
                    for g in a['groups']: busy.add(('g', g, d, p))
                per_day[(a['teacher'], d)] = per_day.get((a['teacher'], d), 0) + n
                placed = True
                break
            if not placed:
                ok = False
                break
        if ok:
            return True, seed
    return False, None


def write(data, path):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    def sheet(name, header, rows):
        ws = wb.create_sheet(name)
        ws.append(header)
        for r in rows: ws.append(list(r))
    sheet('ครู', ['รหัสครู', 'ชื่อครู', 'แผนก', 'สอนได้สูงสุดต่อวัน (คาบ)'], [(t['id'], t['name'], t['dept'], t['max']) for t in data['teachers'].values()])
    sheet('เวลาไม่สะดวก', ['รหัสครู', 'วัน', 'ตั้งแต่คาบ', 'ถึงคาบ'], [o for t in data['teachers'].values() for o in t['off']])
    sheet('ห้อง', ['รหัสห้อง', 'ชื่อห้อง', 'ประเภทห้อง', 'ความจุ (คน)', 'อาคาร'], data['rooms'])
    sheet('กลุ่มเรียน', ['รหัสกลุ่ม', 'ชื่อกลุ่ม', 'แผนก', 'จำนวนนักเรียน (คน)'], [(g['id'], g['name'], g['dept'], g['size']) for g in data['groups']])
    sheet('รายวิชา', ['รหัสวิชา', 'ชื่อวิชา', 'ท-ป-น', 'แผนก', 'ห้องที่ใช้เรียนปฏิบัติ'], [(c['code'], c['name'], '-'.join(map(str, c['tpn'])), c['dept'], c['room']) for c in data['courses'].values()])
    sheet('รายการสอน', ['รหัสรายการสอน', 'รหัสวิชา', 'กลุ่มที่เรียน (หลายกลุ่มคั่นด้วย ,)', 'รหัสครูผู้สอน'], [(a['id'], a['course'], ','.join(a['groups']), a['teacher']) for a in data['assigns']])
    sheet('คำขอพิเศษ', ['ลำดับ', 'ผู้ส่งคำขอ', 'ข้อความคำขอ'], [(f'R{i + 1:02d}', s, t) for i, (s, t) in enumerate(data['reqs'])])
    wb.save(path)


if __name__ == '__main__':
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'apps/web/public/samples')
    out.mkdir(parents=True, exist_ok=True)
    failed = False
    for size in SIZES:
        data = build(size)
        ok, seed = feasible(data)
        write(data, out / f'sample-{size}-team.xlsx')
        print(f'{size}: ครู {len(data["teachers"])} ห้อง {len(data["rooms"])} กลุ่ม {len(data["groups"])} วิชา {len(data["courses"])} รายการสอน {len(data["assigns"])} คำขอ {len(data["reqs"])} -> จัดได้: {ok} (seed ตัวตรวจ {seed})')
        failed = failed or not ok
    sys.exit(1 if failed else 0)
