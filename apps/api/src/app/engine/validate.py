"""Page 1's checks: turn the 7 sheets into clean data and list every problem at once (never stop at the first).

Input is the sheets from `excel_reader`; the output matches `importSchema` in apps/web. Rows are addressed by
their real Excel row number, so a person can find them. Columns are found by header, so their order may change.
"""

import re

from app.engine.domain import (
    DAY_CODES,
    LECTURE_ROOM_TYPE,
    LONGEST_BLOCK,
    MAY_BE_EMPTY,
    PERIODS,
    PRACTICE,
    SHEETS,
    THEORY,
    block_periods,
    usable_slots,
)

TPN_FORMAT = re.compile(r"^(\d+)-(\d+)-(\d+)$")
TEACHERS, UNAVAILABLE, ROOMS, GROUPS, COURSES, ASSIGNMENTS, REQUESTS = SHEETS


class Issues(list):
    """All problems found so far, in the shape the page shows."""

    def add(self, code: str, sheet: str, row: int, column: str | None, message: str, fix: str) -> None:
        issue = {"severity": "error", "code": code, "sheet": sheet, "row": row, "message": message, "fix": fix}
        self.append(issue | ({"column": column} if column else {}))


def without_blanks(record: dict) -> dict:
    """Drop empty optional fields: the page's schema accepts a missing field, but refuses null."""
    return {k: v for k, v in record.items() if v is not None or k == "practiceRoomType"}


def to_int(value) -> int | None:
    """A whole number from a cell, which may hold a number or digits as text."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return int(value) if isinstance(value, str) and re.fullmatch(r"-?\d+", value) else None


def table(sheets: dict, sheet: str, issues: Issues) -> list[dict]:
    """One sheet as rows keyed by column name, reporting a missing sheet or columns."""
    if sheet not in sheets:
        issues.add("MISSING_SHEET", sheet, 0, None, f"ไม่พบแผ่นงาน {sheet}", f"เพิ่มแผ่นงานชื่อ {sheet} ตามไฟล์แม่แบบ")
        return []
    header, rows = sheets[sheet]
    missing = [c for c in SHEETS[sheet] if c not in header]
    for column in missing:
        issues.add("MISSING_COLUMN", sheet, 1, column, f"ไม่พบคอลัมน์ {column}", f"เพิ่มคอลัมน์ {column} ที่แถวแรก")
    if missing:
        return []
    out = [{"_row": number, **dict(zip(header, values, strict=False))} for number, values in rows]
    if not out and sheet not in MAY_BE_EMPTY:
        issues.add("EMPTY_SHEET", sheet, 0, None, f"แผ่นงาน {sheet} ไม่มีข้อมูล", "กรอกข้อมูลอย่างน้อย 1 แถว")
    return out


def required(row: dict, sheet: str, column: str, issues: Issues) -> bool:
    """False, with an issue, when the cell is blank."""
    if row.get(column) is None:
        issues.add("MISSING_VALUE", sheet, row["_row"], column, f"ช่อง {column} ว่าง", f"กรอกค่าในช่อง {column}")
        return False
    return True


def unique(rows: list[dict], sheet: str, id_column: str, issues: Issues) -> list[dict]:
    """Report duplicate or blank IDs; returns the rows that have an ID, first use of each."""
    first_row: dict = {}
    kept = []
    for row in rows:
        if not required(row, sheet, id_column, issues):
            continue
        key = row[id_column]
        if key in first_row:
            message = f"{id_column} {key} ซ้ำกับแถว {first_row[key]}"
            issues.add("DUPLICATE_ID", sheet, row["_row"], id_column, message, "เปลี่ยนรหัสให้ไม่ซ้ำ หรือลบแถวที่ซ้ำ")
        else:
            first_row[key] = row["_row"]
            kept.append(row)
    return kept


def positive(row: dict, sheet: str, column: str, issues: Issues) -> int | None:
    """A whole number above 0 from the cell, or None with an issue."""
    if not required(row, sheet, column, issues):
        return None
    number = to_int(row[column])
    if number is None or number <= 0:
        message = f"{column} ต้องเป็นจำนวนเต็มมากกว่า 0 (พบ {row[column]})"
        issues.add("INVALID_VALUE", sheet, row["_row"], column, message, "ใส่จำนวนเต็มที่มากกว่า 0")
        return None
    return number


def period(row: dict, column: str, issues: Issues) -> int | None:
    """A period number from `เวลาไม่สะดวก`, or None with an issue."""
    if not required(row, UNAVAILABLE, column, issues):
        return None
    number = to_int(row[column])
    if number not in PERIODS:
        message = f"{column} ต้องอยู่ระหว่าง {PERIODS[0]}-{PERIODS[-1]} (พบ {row[column]})"
        issues.add("INVALID_VALUE", UNAVAILABLE, row["_row"], column, message, f"ใส่เลขคาบ {PERIODS[0]}-{PERIODS[-1]}")
        return None
    return number


def read_teachers(sheets: dict, issues: Issues) -> dict:
    teachers = {}
    id_column, name, dept, limit = SHEETS[TEACHERS]
    for row in unique(table(sheets, TEACHERS, issues), TEACHERS, id_column, issues):
        required(row, TEACHERS, name, issues)
        most = positive(row, TEACHERS, limit, issues)
        teachers[row[id_column]] = {
            "id": row[id_column],
            "name": row[name] or "",
            "dept": row[dept],
            "maxPerDay": most,
            "unavailable": [],
            "_row": row["_row"],
        }
    return teachers


def read_unavailable(sheets: dict, teachers: dict, issues: Issues) -> None:
    """Attach each teacher's unavailable times; a bad row is reported and left out."""
    teacher_column, day_column, start, end = SHEETS[UNAVAILABLE]
    for row in table(sheets, UNAVAILABLE, issues):
        teacher = row[teacher_column]
        known = required(row, UNAVAILABLE, teacher_column, issues) and teacher in teachers
        if teacher is not None and not known:
            message = f"ไม่พบรหัสครู {teacher} ในแผ่นงาน {TEACHERS}"
            issues.add("UNKNOWN_REFERENCE", UNAVAILABLE, row["_row"], teacher_column, message, "แก้รหัสครูให้ตรงกับแผ่นงานครู")
        day = DAY_CODES.get(row[day_column])
        if required(row, UNAVAILABLE, day_column, issues) and day is None:
            message = f"วัน {row[day_column]} ไม่ถูกต้อง"
            issues.add("INVALID_VALUE", UNAVAILABLE, row["_row"], day_column, message, "ใช้ " + " ".join(DAY_CODES))
        first, last = period(row, start, issues), period(row, end, issues)
        if first and last and first > last:
            message = f"{start} ({first}) มากกว่า{end} ({last})"
            issues.add("INVALID_VALUE", UNAVAILABLE, row["_row"], start, message, f"ใส่{start}ให้ไม่เกิน{end}")
        elif known and day and first and last:
            teachers[teacher]["unavailable"].append({"day": day, "fromPeriod": first, "toPeriod": last})


def read_rooms(sheets: dict, issues: Issues) -> dict:
    rooms = {}
    id_column, name, kind, capacity, building = SHEETS[ROOMS]
    for row in unique(table(sheets, ROOMS, issues), ROOMS, id_column, issues):
        required(row, ROOMS, kind, issues)
        size = positive(row, ROOMS, capacity, issues)
        rooms[row[id_column]] = {
            "id": row[id_column],
            "name": row[name] or row[id_column],
            "type": row[kind] or "",
            "capacity": size or 0,
            "building": row[building],
        }
    return rooms


def read_groups(sheets: dict, issues: Issues) -> dict:
    groups = {}
    id_column, name, dept, size_column = SHEETS[GROUPS]
    for row in unique(table(sheets, GROUPS, issues), GROUPS, id_column, issues):
        required(row, GROUPS, name, issues)
        size = positive(row, GROUPS, size_column, issues)
        groups[row[id_column]] = {
            "id": row[id_column],
            "name": row[name] or "",
            "dept": row[dept],
            "size": size or 0,
            "_row": row["_row"],
        }
    return groups


def read_tpn(row: dict, issues: Issues) -> tuple[int, int, int] | None:
    """(theory, practice, credit) from `ท-ป-น`, or None with an issue."""
    column = SHEETS[COURSES][2]
    if not required(row, COURSES, column, issues):
        return None
    match = TPN_FORMAT.match(str(row[column]))
    if match is None:
        message = f"{column} ต้องอยู่ในรูป เลข-เลข-เลข เช่น 1-4-3 (พบ {row[column]})"
        issues.add("INVALID_VALUE", COURSES, row["_row"], column, message, "แก้เป็นรูปแบบ ท-ป-น เช่น 1-4-3")
        return None
    theory, practice, credit = (int(g) for g in match.groups())
    if theory + practice == 0:
        issues.add("INVALID_VALUE", COURSES, row["_row"], column, "วิชานี้ไม่มีคาบเรียนให้จัด", "ใส่คาบทฤษฎีหรือคาบปฏิบัติ")
        return None
    return theory, practice, credit


def read_courses(sheets: dict, rooms: dict, issues: Issues) -> dict:
    courses = {}
    id_column, name, tpn_column, dept, room_column = SHEETS[COURSES]
    types = {r["type"] for r in rooms.values()}
    for row in unique(table(sheets, COURSES, issues), COURSES, id_column, issues):
        required(row, COURSES, name, issues)
        tpn = read_tpn(row, issues)
        room_type = row[room_column]
        if tpn and tpn[1] > 0 and room_type is None:
            message = f"วิชา {row[id_column]} มีคาบปฏิบัติ แต่ไม่ได้ระบุห้อง"
            issues.add("MISSING_VALUE", COURSES, row["_row"], room_column, message, f"กรอกประเภทห้องในช่อง {room_column}")
        elif tpn and tpn[1] > 0 and rooms and room_type not in types:
            message = f"ไม่มีห้องประเภท {room_type} ในแผ่นงาน {ROOMS}"
            issues.add("UNKNOWN_REFERENCE", COURSES, row["_row"], room_column, message, "เพิ่มห้องประเภทนี้ หรือแก้ชื่อประเภท")
        if tpn and tpn[0] > 0 and rooms and LECTURE_ROOM_TYPE not in types:
            message = f"ไม่มีห้องประเภท {LECTURE_ROOM_TYPE} สำหรับคาบทฤษฎี"
            issues.add(
                "UNKNOWN_REFERENCE", COURSES, row["_row"], tpn_column, message, f"เพิ่ม{LECTURE_ROOM_TYPE}ในแผ่นงาน{ROOMS}"
            )
        theory, practice, credit = tpn or (0, 0, None)
        courses[row[id_column]] = {
            "code": row[id_column],
            "name": row[name] or "",
            "theory": theory,
            "practice": practice,
            "credit": credit,
            "dept": row[dept],
            "practiceRoomType": room_type if practice else None,
        }
    return courses


def read_assignments(sheets: dict, teachers: dict, groups: dict, courses: dict, issues: Issues) -> list[dict]:
    assignments = []
    id_column, course_column, group_column, teacher_column = SHEETS[ASSIGNMENTS]
    references = (
        (course_column, courses, COURSES),
        (teacher_column, teachers, TEACHERS),
    )
    for row in unique(table(sheets, ASSIGNMENTS, issues), ASSIGNMENTS, id_column, issues):
        for column, known, source in references:
            if required(row, ASSIGNMENTS, column, issues) and row[column] not in known and known:
                message = f"ไม่พบ {row[column]} ในแผ่นงาน {source}"
                issues.add(
                    "UNKNOWN_REFERENCE", ASSIGNMENTS, row["_row"], column, message, f"แก้รหัสให้ตรงกับแผ่นงาน{source}"
                )
        group_ids = []
        if required(row, ASSIGNMENTS, group_column, issues):
            group_ids = [g.strip() for g in str(row[group_column]).split(",") if g.strip()]
        for group in group_ids:
            if groups and group not in groups:
                message = f"ไม่พบกลุ่ม {group} ในแผ่นงาน {GROUPS}"
                issues.add(
                    "UNKNOWN_REFERENCE", ASSIGNMENTS, row["_row"], group_column, message, "แก้รหัสกลุ่มให้ตรงกับแผ่นงานกลุ่มเรียน"
                )
        assignments.append(
            {
                "_row": row["_row"],
                "id": row[id_column],
                "courseCode": row[course_column],
                "groupIds": group_ids,
                "teacherId": row[teacher_column],
            }
        )
    return assignments


def blocks_of(course: dict) -> list[tuple[str, int, str]]:
    """The blocks of one teaching item: (kind, periods, room type). A block of 0 periods does not exist."""
    out = []
    if course["theory"]:
        out.append((THEORY, course["theory"], LECTURE_ROOM_TYPE))
    if course["practice"]:
        out.append((PRACTICE, course["practice"], course["practiceRoomType"]))
    return out


def free_slots(teacher: dict) -> set[tuple[str, int]]:
    """The usable slots a teacher can teach in."""
    away = {(u["day"], p) for u in teacher["unavailable"] for p in range(u["fromPeriod"], u["toPeriod"] + 1)}
    return set(usable_slots()) - away


def fits_somewhere(length: int, free: set[tuple[str, int]]) -> bool:
    """True when a block of this length has at least one legal place inside the free slots."""
    days = {d for d, _ in free}
    for day in days:
        for start in PERIODS:
            periods = block_periods(start, length)
            if periods and all((day, p) in free for p in periods):
                return True
    return False


def check_blocks(assignments: list, courses: dict, teachers: dict, groups: dict, rooms: dict, issues: Issues) -> None:
    """Checks on each block of each teaching item: length, teacher's limit, a free stretch, a big enough room."""
    item_column = SHEETS[ASSIGNMENTS][0]
    group_column = SHEETS[ASSIGNMENTS][2]
    teacher_column = SHEETS[ASSIGNMENTS][3]
    for item in assignments:
        course, teacher = courses.get(item["courseCode"]), teachers.get(item["teacherId"])
        if course is None:
            continue
        row, item_id = item["_row"], item["id"]
        students = sum(groups[g]["size"] for g in item["groupIds"] if g in groups)
        for _kind, length, room_type in blocks_of(course):
            if length > LONGEST_BLOCK:
                message = f"{item_id}: คาบติดกัน {length} คาบ ยาวเกิน {LONGEST_BLOCK} คาบ จึงข้ามพักกลางวัน"
                issues.add(
                    "BLOCK_TOO_LONG",
                    ASSIGNMENTS,
                    row,
                    item_column,
                    message,
                    f"แก้ ท-ป-น ให้แต่ละส่วนไม่เกิน {LONGEST_BLOCK} คาบ",
                )
                continue
            if teacher and teacher["maxPerDay"] and length > teacher["maxPerDay"]:
                message = (
                    f"{item_id}: คาบติดกัน {length} คาบ เกินที่ครู {teacher['id']} สอนได้ต่อวัน ({teacher['maxPerDay']} คาบ)"
                )
                issues.add(
                    "BLOCK_OVER_TEACHER_LIMIT",
                    ASSIGNMENTS,
                    row,
                    teacher_column,
                    message,
                    "เพิ่มคาบสูงสุดต่อวันของครู หรือเปลี่ยนครู",
                )
            elif teacher and not fits_somewhere(length, free_slots(teacher)):
                message = f"{item_id}: ครู {teacher['id']} ไม่มีเวลาว่างติดกัน {length} คาบ"
                issues.add(
                    "NO_FREE_STRETCH", ASSIGNMENTS, row, teacher_column, message, "ลดเวลาไม่สะดวกของครู หรือเปลี่ยนครู"
                )
            sizes = [r["capacity"] for r in rooms.values() if r["type"] == room_type]
            if sizes and students > max(sizes):
                message = f"{item_id}: มีนักเรียน {students} คน แต่{room_type}จุได้สูงสุด {max(sizes)} คน"
                issues.add("ROOM_TOO_SMALL", ASSIGNMENTS, row, group_column, message, "แยกกลุ่มเรียน หรือเพิ่มห้องที่จุได้")


def check_loads(assignments: list, courses: dict, teachers: dict, groups: dict, issues: Issues) -> None:
    """Report a teacher or group with more periods than the week can hold."""
    teacher_load: dict = {}
    group_load: dict = {}
    for item in assignments:
        course = courses.get(item["courseCode"])
        if course is None:
            continue
        hours = course["theory"] + course["practice"]
        teacher_load[item["teacherId"]] = teacher_load.get(item["teacherId"], 0) + hours
        for group in item["groupIds"]:
            group_load[group] = group_load.get(group, 0) + hours
    for teacher in teachers.values():
        need, free = teacher_load.get(teacher["id"], 0), free_slots(teacher)
        days = {d for d, _ in free}
        most = teacher["maxPerDay"] or len(PERIODS)
        have = sum(min(most, sum(1 for d, _ in free if d == day)) for day in days)
        if need > have:
            message = f"ครู {teacher['id']} ต้องสอน {need} คาบ แต่สอนได้สูงสุด {have} คาบต่อสัปดาห์"
            issues.add(
                "TEACHER_OVERLOADED",
                TEACHERS,
                teacher["_row"],
                SHEETS[TEACHERS][0],
                message,
                "แบ่งรายการสอนให้ครูคนอื่น หรือเพิ่มคาบสูงสุดต่อวัน",
            )
    slots = len(usable_slots())
    for group in groups.values():
        need = group_load.get(group["id"], 0)
        if need > slots:
            message = f"กลุ่ม {group['id']} ต้องเรียน {need} คาบ แต่มีเวลาเรียน {slots} คาบต่อสัปดาห์"
            issues.add("GROUP_OVERLOADED", GROUPS, group["_row"], SHEETS[GROUPS][0], message, "ลดรายการสอนของกลุ่มนี้")


def read_requests(sheets: dict, issues: Issues) -> list[dict]:
    """Raw special requests. Reading their meaning is F5's work."""
    id_column, sender, text = SHEETS[REQUESTS]
    out = []
    for row in unique(table(sheets, REQUESTS, issues), REQUESTS, id_column, issues):
        if required(row, REQUESTS, text, issues):
            out.append(without_blanks({"id": str(row[id_column]), "sender": row[sender], "text": row[text]}))
    return out


def validate(sheets: dict) -> tuple[dict, list[dict]]:
    """Check a whole workbook. Returns (data, issues); the data holds whatever could be read."""
    issues = Issues()
    teachers = read_teachers(sheets, issues)
    read_unavailable(sheets, teachers, issues)
    rooms = read_rooms(sheets, issues)
    groups = read_groups(sheets, issues)
    courses = read_courses(sheets, rooms, issues)
    assignments = read_assignments(sheets, teachers, groups, courses, issues)
    requests = read_requests(sheets, issues)
    check_blocks(assignments, courses, teachers, groups, rooms, issues)
    check_loads(assignments, courses, teachers, groups, issues)
    for record in [*assignments, *teachers.values(), *groups.values()]:
        del record["_row"]
    data = {
        "teachers": [without_blanks(t) for t in teachers.values()],
        "rooms": [without_blanks(r) for r in rooms.values()],
        "groups": [without_blanks(g) for g in groups.values()],
        "courses": [without_blanks(c) for c in courses.values()],
        "assignments": assignments,
        "requests": requests,
    }
    return data, list(issues)
