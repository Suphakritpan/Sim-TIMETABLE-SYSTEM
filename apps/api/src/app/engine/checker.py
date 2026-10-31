"""The one rule checker: every number on pages 3, 5 and 6 comes from here (B12).

It reads only the data and the finished timetable, never the solver's state, so it can catch a solver bug.
Used by the solver job, the baseline, the comparison and the tests.
"""

from collections import defaultdict

from app.engine.domain import BLOCKED, LECTURE_ROOM_TYPE, PRACTICE, THEORY, block_periods

GROUP_GAP_PENALTY = 2  # ก
TEACHER_GAP_PENALTY = 1  # ข
GROUP_DAY_LIMIT = 6  # ค
GROUP_OVER_PENALTY = 3  # ค
SPLIT_PENALTY = 2  # ง: theory and practical of a teaching item on the same day
REQUEST_PENALTY = 1  # จ: our weight, per period that misses an "if possible" request (shown on the site)


def gaps(periods: set[int]) -> int:
    """Free periods between a day's first and last class. Lunch is not a period, so 4 and 5 are adjacent (B13)."""
    return max(periods) - min(periods) + 1 - len(periods) if periods else 0


def conflict(code: str, ids: list[str], day: str, period: int, message: str) -> dict:
    """One broken rule. Day and period are left out when it has none: the page's schema refuses blanks."""
    found = {"code": code, "assignmentIds": sorted(set(ids)), "message": message}
    return found | ({"day": day} if day else {}) | ({"period": period} if period else {})


class Timetable:
    """One timetable indexed by who is where, so each rule reads simply."""

    def __init__(self, data: dict, items: list[dict]):
        self.teachers = {t["id"]: t for t in data["teachers"]}
        self.rooms = {r["id"]: r for r in data["rooms"]}
        self.groups = {g["id"]: g for g in data["groups"]}
        self.courses = {c["code"]: c for c in data["courses"]}
        self.assignments = {a["id"]: a for a in data["assignments"]}
        self.items = items
        self.at_teacher, self.at_group, self.at_room = defaultdict(list), defaultdict(list), defaultdict(list)
        self.conflicts: list[dict] = []
        for item in items:
            assignment = self.assignments.get(item["assignmentId"])
            if assignment is None:
                continue
            periods = range(item["period"], item["period"] + item["periodCount"])
            for p in periods:
                self.at_teacher[(assignment["teacherId"], item["day"], p)].append(item["assignmentId"])
                self.at_room[(item["roomId"], item["day"], p)].append(item["assignmentId"])
                for group in assignment["groupIds"]:
                    self.at_group[(group, item["day"], p)].append(item["assignmentId"])

    def clashes(self, index: dict, code: str, label: str) -> int:
        """Rules 1 to 3. One extra session in a slot is one clash."""
        count = 0
        for (who, day, period), ids in index.items():
            if len(ids) > 1:
                count += len(ids) - 1
                self.conflicts.append(conflict(code, ids, day, period, f"{label} {who} ซ้อนกันที่ {day} คาบ {period}"))
        return count

    def check_placement_rules(self) -> int:
        """Rules 5 to 10. Returns the number of breaks."""
        before = len(self.conflicts)
        blocked = {(b["day"], p) for b in BLOCKED for p in range(b["fromPeriod"], b["toPeriod"] + 1)}
        for item in self.items:
            if item["assignmentId"] in self.assignments:
                for code, text in self.item_breaks(item, blocked):
                    self.conflicts.append(conflict(code, [item["assignmentId"]], item["day"], item["period"], text))
        self.check_teacher_days()
        return len(self.conflicts) - before

    def item_breaks(self, item: dict, blocked: set) -> list[tuple[str, str]]:
        """Rules 5 to 9 for one session, as (code, message)."""
        found = []
        assignment = self.assignments[item["assignmentId"]]
        day, start, length, item_id = item["day"], item["period"], item["periodCount"], item["assignmentId"]
        periods = range(start, start + length)
        if block_periods(start, length) is None:
            found.append(("CROSSES_LUNCH", f"{item_id} ข้ามพักกลางวันหรือเกินคาบสุดท้าย"))
        course = self.courses[assignment["courseCode"]]
        room = self.rooms.get(item["roomId"])
        wanted = LECTURE_ROOM_TYPE if item["kind"] == THEORY else course["practiceRoomType"]
        if room is None or room["type"] != wanted:
            found.append(("WRONG_ROOM_TYPE", f"{item_id} ต้องใช้{wanted}"))
        students = sum(self.groups[g]["size"] for g in assignment["groupIds"])
        if room is not None and room["capacity"] < students:
            found.append(("ROOM_CAPACITY_EXCEEDED", f"ห้อง {room['id']} จุ {room['capacity']} คน แต่มี {students} คน"))
        if any((day, p) in blocked for p in periods):
            found.append(("WEDNESDAY_ACTIVITY", f"{item_id} อยู่ในเวลากิจกรรม"))
        teacher = self.teachers[assignment["teacherId"]]
        away = {(u["day"], p) for u in teacher["unavailable"] for p in range(u["fromPeriod"], u["toPeriod"] + 1)}
        if any((day, p) in away for p in periods):
            found.append(("TEACHER_UNAVAILABLE", f"ครู {teacher['id']} ไม่สะดวกช่วงนี้"))
        return found

    def check_teacher_days(self) -> None:
        """Rule 10."""
        per_day = defaultdict(int)
        for teacher, day, _period in self.at_teacher:
            per_day[(teacher, day)] += 1
        for (teacher, day), count in per_day.items():
            if count > self.teachers[teacher]["maxPerDay"]:
                ids = [i for (t, d, _), found in self.at_teacher.items() if t == teacher and d == day for i in found]
                text = f"ครู {teacher} สอน {count} คาบใน {day} เกิน {self.teachers[teacher]['maxPerDay']} คาบ"
                self.conflicts.append(conflict("TEACHER_DAILY_LIMIT", ids, day, 0, text))

    def missing_and_repeated(self) -> tuple[list[str], int]:
        """Rule 4: blocks not placed, and the number of extra placements of a block."""
        placed = defaultdict(int)
        for item in self.items:
            placed[(item["assignmentId"], item["kind"])] += 1
        missing, repeated = [], 0
        for assignment in self.assignments.values():
            course = self.courses[assignment["courseCode"]]
            for kind, hours in ((THEORY, course["theory"]), (PRACTICE, course["practice"])):
                count = placed[(assignment["id"], kind)]
                if hours and count == 0:
                    missing.append(assignment["id"])
                elif count > 1:
                    repeated += count - 1
                    text = f"{assignment['id']} ถูกจัดซ้ำ"
                    self.conflicts.append(conflict("ASSIGNMENT_DUPLICATED", [assignment["id"]], "", 0, text))
        return sorted(set(missing)), repeated

    def penalty(self) -> dict:
        """The soft rules ก to ง. จ is added by the caller from the requests."""
        group_days, teacher_days = defaultdict(set), defaultdict(set)
        for group, day, period in self.at_group:
            group_days[(group, day)].add(period)
        for teacher, day, period in self.at_teacher:
            teacher_days[(teacher, day)].add(period)
        group_gaps = sum(gaps(p) for p in group_days.values())
        teacher_gaps = sum(gaps(p) for p in teacher_days.values())
        over = sum(max(0, len(p) - GROUP_DAY_LIMIT) for p in group_days.values())
        days = defaultdict(lambda: defaultdict(set))
        for item in self.items:
            days[item["assignmentId"]][item["kind"]].add(item["day"])
        same_day = sum(1 for k in days.values() if k[THEORY] & k[PRACTICE])
        return {
            "groupGaps": group_gaps,
            "teacherGaps": teacher_gaps,
            "overSixPeriods": over,
            "sameDayItems": same_day,
            "total": group_gaps * GROUP_GAP_PENALTY
            + teacher_gaps * TEACHER_GAP_PENALTY
            + over * GROUP_OVER_PENALTY
            + same_day * SPLIT_PENALTY,
        }


def check(data: dict, items: list[dict], seconds: float = 0.0, request_penalty: int = 0) -> dict:
    """Check a timetable. Returns `stats` for the page, the `conflicts` list, and the missing teaching items."""
    table = Timetable(data, items)
    teacher = table.clashes(table.at_teacher, "TEACHER_CLASH", "ครู")
    room = table.clashes(table.at_room, "ROOM_CLASH", "ห้อง")
    group = table.clashes(table.at_group, "GROUP_CLASH", "กลุ่ม")
    other = table.check_placement_rules()
    missing, repeated = table.missing_and_repeated()
    soft = table.penalty()
    total = len(data["assignments"])
    stats = {
        "totalAssignments": total,
        "scheduled": total - len(missing),
        "unscheduled": len(missing),
        "teacherConflicts": teacher,
        "roomConflicts": room,
        "groupConflicts": group,
        "otherViolations": other + repeated,
        "penalty": soft["total"] + request_penalty * REQUEST_PENALTY,
        "elapsedSeconds": round(seconds, 3),
    }
    return {"stats": stats, "conflicts": table.conflicts, "missing": missing, "penalty": soft}
