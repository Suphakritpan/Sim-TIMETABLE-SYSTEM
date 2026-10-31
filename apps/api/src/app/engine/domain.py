"""Facts the competition brief fixes: sheet layout, week grid and Thai names. Used across the engine.

Values that change between colleges (teachers, rooms, room types, sizes) always come from the uploaded file.
"""

DAY_CODES = {"จันทร์": "MON", "อังคาร": "TUE", "พุธ": "WED", "พฤหัสบดี": "THU", "ศุกร์": "FRI"}
DAY_NAMES = {code: name for name, code in DAY_CODES.items()}
DAYS = list(DAY_NAMES)
MORNING = [1, 2, 3, 4]
AFTERNOON = [5, 6, 7, 8]
PERIODS = MORNING + AFTERNOON
BLOCKED = [{"day": "WED", "fromPeriod": 7, "toPeriod": 8}]  # activity time
LONGEST_BLOCK = max(len(MORNING), len(AFTERNOON))
LECTURE_ROOM_TYPE = "ห้องบรรยาย"
THEORY, PRACTICE = "theory", "practice"
KIND_NAMES = {THEORY: "ทฤษฎี", PRACTICE: "ปฏิบัติ"}

SHEETS = {
    "ครู": ["รหัสครู", "ชื่อครู", "แผนก", "สอนได้สูงสุดต่อวัน (คาบ)"],
    "เวลาไม่สะดวก": ["รหัสครู", "วัน", "ตั้งแต่คาบ", "ถึงคาบ"],
    "ห้อง": ["รหัสห้อง", "ชื่อห้อง", "ประเภทห้อง", "ความจุ (คน)", "อาคาร"],
    "กลุ่มเรียน": ["รหัสกลุ่ม", "ชื่อกลุ่ม", "แผนก", "จำนวนนักเรียน (คน)"],
    "รายวิชา": ["รหัสวิชา", "ชื่อวิชา", "ท-ป-น", "แผนก", "ห้องที่ใช้เรียนปฏิบัติ"],
    "รายการสอน": ["รหัสรายการสอน", "รหัสวิชา", "กลุ่มที่เรียน (หลายกลุ่มคั่นด้วย ,)", "รหัสครูผู้สอน"],
    "คำขอพิเศษ": ["ลำดับ", "ผู้ส่งคำขอ", "ข้อความคำขอ"],
}
# These sheets may have no rows; every other sheet must have at least one.
MAY_BE_EMPTY = {"เวลาไม่สะดวก", "คำขอพิเศษ"}


def usable_slots() -> list[tuple[str, int]]:
    """Every (day, period) a class may use: the whole grid minus the activity time."""
    blocked = {(b["day"], p) for b in BLOCKED for p in range(b["fromPeriod"], b["toPeriod"] + 1)}
    return [(d, p) for d in DAYS for p in PERIODS if (d, p) not in blocked]


def block_periods(start: int, length: int) -> list[int] | None:
    """The periods of a block, or None if it would cross lunch or run past the day (rule 5)."""
    periods = list(range(start, start + length))
    return periods if set(periods) <= set(MORNING) or set(periods) <= set(AFTERNOON) else None


def periods_info() -> dict:
    """The `periods` field of an import: the page draws its grid from this."""
    return {"days": DAYS, "perDay": len(PERIODS), "morning": MORNING, "afternoon": AFTERNOON, "blocked": BLOCKED}
