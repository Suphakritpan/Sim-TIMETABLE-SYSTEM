# -*- coding: utf-8 -*-
"""แสดงสถานะหัวข้อและข้อความที่รอตอบของ AI ตัวหนึ่ง จากไฟล์ใน communication/messages/

ใช้: python communication/tools/inbox.py --me pan-ai [--all]
สถานะของหัวข้อ = สถานะของข้อความล่าสุด (ตามวันที่) ใน thread; "รอคุณ" = หัวข้อที่ข้อความล่าสุดส่งถึง --me และสถานะ Open/Blocked/Answered
ใช้ Python มาตรฐานอย่างเดียว; ไฟล์ที่ส่วนหัวไม่ครบจะถูกรายงานเป็นคำเตือน ไม่ทำให้โปรแกรมล้ม
"""
import argparse
import sys
from pathlib import Path

REQUIRED = ('id', 'thread', 'from', 'to', 'date', 'subject', 'kind', 'status', 'in_reply_to')
# Answered ที่ส่งถึงผู้ถาม = มีคำตอบรอให้ตรวจแล้วปิดหัวข้อ (Resolved) หรือถามต่อ
WAITING = ('Open', 'Blocked', 'Answered')


def parse(path):
    """อ่าน frontmatter แบบ `key: value` ระหว่างบรรทัด --- คืน dict หรือ None ถ้าไม่ใช่ข้อความ"""
    lines = path.read_text(encoding='utf-8').splitlines()
    if not lines or lines[0].strip() != '---':
        return None
    meta = {}
    for line in lines[1:]:
        if line.strip() == '---':
            return meta
        if ':' in line:
            key, value = line.split(':', 1)
            meta[key.strip()] = value.strip()
    return None


def load(folder):
    messages, warnings = [], []
    for path in sorted(folder.glob('*.md')):
        if path.name.startswith('_'):
            continue
        meta = parse(path)
        missing = [k for k in REQUIRED if not (meta or {}).get(k)]
        if meta is None or missing:
            warnings.append(f'{path.name}: ส่วนหัวไม่ครบ {missing or "(ไม่มี frontmatter)"}')
            continue
        meta['file'] = path.name
        messages.append(meta)
    return messages, warnings


def threads(messages):
    """จัดกลุ่มตาม thread เรียงตามวันที่ (ISO 8601 เรียงตามตัวอักษรได้เมื่อโซนเวลาเดียวกัน) แล้วคืนข้อความล่าสุดของแต่ละหัวข้อ"""
    grouped = {}
    for m in sorted(messages, key=lambda m: (m['date'], m['id'])):
        grouped.setdefault(m['thread'], []).append(m)
    return grouped


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--me', required=True, help='รหัส AI ของคุณ เช่น pan-ai หรือ friend-ai')
    parser.add_argument('--all', action='store_true', help='แสดงทุกหัวข้อ ไม่เฉพาะที่รอตอบ')
    parser.add_argument('--dir', default=str(Path(__file__).resolve().parent.parent / 'messages'))
    args = parser.parse_args(argv)
    # ข้อความเป็นภาษาไทย: คอนโซล Windows ใช้ cp1252 เป็นค่าเริ่มต้นและพิมพ์ไม่ได้ จึงบังคับ UTF-8
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

    messages, warnings = load(Path(args.dir))
    grouped = threads(messages)
    shown = 0
    for thread, items in grouped.items():
        last = items[-1]
        waiting = last['to'] == args.me and last['status'] in WAITING
        if not (waiting or args.all):
            continue
        shown += 1
        mark = ('รอคุณตอบ' if last['status'] != 'Answered' else 'มีคำตอบรอคุณตรวจ/ปิด') if waiting else last['status']
        print(f"[{mark}] {thread}  ({len(items)} ข้อความ)  {last['subject']}")
        print(f"    ล่าสุด: {last['id']}  {last['from']} -> {last['to']}  {last['date']}  status={last['status']}  kind={last['kind']}  ({last['file']})")
    if shown == 0:
        print(f'ไม่มีข้อความรอ {args.me} ตอบ (หัวข้อทั้งหมด {len(grouped)})')
    for w in warnings:
        print(f'คำเตือน: {w}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
