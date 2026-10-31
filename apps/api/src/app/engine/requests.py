"""Special requests: read Thai text into a condition, apply it to the solver, and report whether it was met.

Each request becomes `kind` + `params`. Reading uses rules only, so it works with no language AI. A request that
the rules cannot read goes to the form on page 2. Teachers are matched by full name, because first names repeat.
"""

import hashlib
import re

from app.engine.domain import AFTERNOON, DAY_CODES, DAY_NAMES, DAYS, MORNING, PERIODS, PRACTICE, usable_slots
from app.engine.model import Limits
from app.engine.validate import blocks_of

MUST, BEST_EFFORT, NO_ACTION = "must", "best_effort", "no_action"
CATEGORY_NAMES = {MUST: "ต้องทำตาม", BEST_EFFORT: "ทำถ้าทำได้", NO_ACTION: "ไม่ต้องทำอะไรเพิ่ม"}
SOFT_WORDS = ("ถ้าเลี่ยงได้", "ถ้าเป็นไปได้", "ถ้าทำได้", "หากเป็นไปได้", "หากเลี่ยงได้", "ให้มากที่สุด", "ถ้าได้")
KINDS = (
    "teacher_unavailable",
    "group_unavailable",
    "room_closed",
    "teacher_avoid_periods",
    "teacher_only_days",
    "prefer_practice_morning",
    "none",
)
FIRST_AFTERNOON_HOUR = 13  # period 5 starts at 13:00


class CannotRead(Exception):
    """The rules could not read this text. `ambiguities` says why, for the form."""

    def __init__(self, ambiguities: list[dict]):
        self.ambiguities = ambiguities


def bare_name(name: str) -> str:
    return name.removeprefix("ครู").strip()


def find_teacher(text: str, data: dict) -> tuple[dict | None, list[dict]]:
    """(teacher, others with that first name). The full name wins; a first name counts only when it is unique."""
    for teacher in data["teachers"]:
        if teacher["id"] in text or bare_name(teacher["name"]) in text:
            return teacher, []
    same_first = [t for t in data["teachers"] if bare_name(t["name"]).split()[0] in text]
    if len(same_first) == 1:
        return same_first[0], []
    return None, same_first


def find_group(text: str, data: dict) -> dict | None:
    for group in data["groups"]:
        if group["id"] in text or group["name"] in text:
            return group
    return None


def find_room(text: str, data: dict) -> dict | None:
    for room in data["rooms"]:
        if room["id"] in text:
            return room
    return None


def find_dept(text: str, data: dict) -> str | None:
    names = {c.get("dept") for c in data["courses"]} | {g.get("dept") for g in data["groups"]}
    return next((n for n in sorted(names, key=lambda n: -len(n or "")) if n and n in text), None)


def find_days(text: str) -> list[str]:
    """Days written as "วัน" + name. A bare "จันทร์" is not a day: it can be part of a surname, such as จันทร์แก้ว."""
    return [code for name, code in DAY_CODES.items() if "วัน" + name in text]


def find_periods(text: str) -> list[int]:
    """The periods a text names, or [] for none named. 'เลิกไม่เกิน 15.00' means no periods from 15:00 on."""
    if match := re.search(r"(?:เลิก|ไม่เกิน|ก่อน)\D{0,20}(\d{1,2})[.:]\d{2}", text):
        first_free = int(match.group(1)) - FIRST_AFTERNOON_HOUR + AFTERNOON[0]
        return [p for p in PERIODS if p >= first_free]
    if "ทั้งวัน" in text:
        return PERIODS
    if "คาบแรก" in text:
        return [PERIODS[0]]
    if "คาบสุดท้าย" in text:
        return [PERIODS[-1]]
    if match := re.search(r"คาบ(?:ที่)?\s*(\d)\s*[-–]\s*(\d)", text):
        return [p for p in PERIODS if int(match.group(1)) <= p <= int(match.group(2))]
    if match := re.search(r"คาบ(?:ที่)?\s*(\d)", text):
        return [int(match.group(1))]
    if "บ่าย" in text:
        return AFTERNOON
    if "เช้า" in text:
        return MORNING
    return []


def teacher_periods(data: dict, teacher_id: str) -> int:
    courses = {c["code"]: c for c in data["courses"]}
    items = [a for a in data["assignments"] if a["teacherId"] == teacher_id]
    return sum(courses[a["courseCode"]]["theory"] + courses[a["courseCode"]]["practice"] for a in items)


def only_days_fit(data: dict, teacher: dict, days: list[str]) -> bool:
    """A teacher's week fits these days at their daily limit. If not, the request can only be partly met (B19)."""
    return teacher_periods(data, teacher["id"]) <= teacher["maxPerDay"] * len(days)


def day_words(days: list[str]) -> str:
    return " ".join(DAY_NAMES[d] for d in days)


def period_words(periods: list[int]) -> str:
    return f"คาบ {periods[0]}" if len(periods) == 1 else f"คาบ {periods[0]}-{periods[-1]}"


def read_teacher_request(text: str, data: dict, teacher: dict, soft: str) -> tuple:
    days, periods = find_days(text), find_periods(text)
    if "เฉพาะ" in text and days:
        fits = only_days_fit(data, teacher, days)
        category = soft if fits else BEST_EFFORT
        words = f"ครู {teacher['id']} / สอนเฉพาะ {day_words(days)} / {CATEGORY_NAMES[category]}"
        return "teacher_only_days", category, {"teacherId": teacher["id"], "days": days}, words
    if days and periods:
        words = f"ครู {teacher['id']} / ไม่สอน{day_words(days)} {period_words(periods)} / {CATEGORY_NAMES[soft]}"
        return "teacher_unavailable", soft, {"teacherId": teacher["id"], "days": days, "periods": periods}, words
    if periods:
        words = f"ครู {teacher['id']} / ไม่สอน{period_words(periods)} / {CATEGORY_NAMES[soft]}"
        return "teacher_avoid_periods", soft, {"teacherId": teacher["id"], "periods": periods}, words
    raise CannotRead([{"field": "periods", "note": "ไม่พบช่วงเวลาในคำขอ"}])


def read_meaning(text: str, data: dict) -> tuple[str, str, dict, str]:
    """(kind, category, params, understanding). Raises CannotRead when no rule fits."""
    soft = BEST_EFFORT if any(w in text for w in SOFT_WORDS) else MUST
    if "พักกลางวัน" in text:
        return "none", NO_ACTION, {}, "ระบบไม่จัดคาบในพักกลางวันอยู่แล้ว / ไม่ต้องทำอะไรเพิ่ม"
    days, periods = find_days(text), find_periods(text)
    if (room := find_room(text, data)) and days:
        words = f"ห้อง {room['id']} / งดใช้{day_words(days)} {period_words(periods or PERIODS)} / {CATEGORY_NAMES[MUST]}"
        return "room_closed", MUST, {"roomId": room["id"], "days": days, "periods": periods or PERIODS}, words
    if (group := find_group(text, data)) and days and periods:
        words = f"กลุ่ม {group['id']} / งดเรียน{day_words(days)} {period_words(periods)} / {CATEGORY_NAMES[soft]}"
        return "group_unavailable", soft, {"groupId": group["id"], "days": days, "periods": periods}, words
    teacher, same_first = find_teacher(text, data)
    if teacher:
        return read_teacher_request(text, data, teacher, soft)
    if same_first:
        names = ", ".join(t["id"] for t in same_first)
        raise CannotRead([{"field": "teacherId", "note": f"ชื่อตรงกับครูหลายคน: {names}"}])
    if "ปฏิบัติ" in text and "เช้า" in text and (dept := find_dept(text, data)):
        words = f"แผนก{dept} / จัดปฏิบัติช่วงเช้า / {CATEGORY_NAMES[BEST_EFFORT]}"
        return "prefer_practice_morning", BEST_EFFORT, {"dept": dept}, words
    if "ครู" in text:
        return "none", NO_ACTION, {}, "ไม่พบครูคนนี้ในข้อมูล / ไม่ต้องทำอะไรเพิ่ม"
    raise CannotRead([{"field": "text", "note": "ระบบอ่านคำขอนี้ไม่ได้ กรุณากรอกผ่านฟอร์ม"}])


def interpret(text: str, data: dict) -> dict:
    """One request as the page reads it (`interpretSchema`). Raises CannotRead."""
    kind, category, params, understanding = read_meaning(text, data)
    raw = next((r for r in data["requests"] if r["text"] == text), None)
    request_id = raw["id"] if raw else "U" + hashlib.sha256(text.encode()).hexdigest()[:8]
    request = {
        "id": request_id,
        "text": text,
        "sender": raw["sender"] if raw else None,
        "kind": kind,
        "category": category,
        "params": params,
        "understanding": understanding,
        "status": "proposed",
    }
    return {"request": {k: v for k, v in request.items() if v is not None}, "confidence": "high", "ambiguities": []}


def days_of(params: dict) -> list[str]:
    """The form sends one `day`; the reader may send several `days`."""
    return params.get("days") or [params["day"]]


def params_problem(request: dict, data: dict) -> str | None:
    """Why a confirmed request cannot be used, or None. The API refuses it instead of ignoring it."""
    kind, params = request["kind"], request["params"]
    if kind not in KINDS:
        return f"unknown kind {kind}"
    known = {
        "teacherId": {t["id"] for t in data["teachers"]},
        "groupId": {g["id"] for g in data["groups"]},
        "roomId": {r["id"] for r in data["rooms"]},
    }
    for field, ids in known.items():
        if field in params and params[field] not in ids:
            return f"unknown {field} {params[field]}"
    needed = {
        "teacher_unavailable": ("teacherId", "periods"),
        "group_unavailable": ("groupId", "periods"),
        "room_closed": ("roomId", "periods"),
        "teacher_avoid_periods": ("teacherId", "periods"),
        "teacher_only_days": ("teacherId", "days"),
        "prefer_practice_morning": ("dept",),
        "none": (),
    }[kind]
    if any(not params.get(f) for f in needed):
        return f"{kind} needs {', '.join(needed)}"
    if kind in ("teacher_unavailable", "group_unavailable", "room_closed") and not (
        params.get("day") or params.get("days")
    ):
        return f"{kind} needs a day"
    if not set(params.get("periods") or []) <= set(PERIODS):
        return "periods must be 1 to 8"
    days = params.get("days") or ([params["day"]] if params.get("day") else [])
    return None if set(days) <= set(DAYS) else "days must be MON to FRI"


def wanted_free(request: dict) -> set[tuple[str, int]]:
    """The slots a request wants kept clear of its teacher, group or room."""
    kind, params = request["kind"], request["params"]
    if kind == "prefer_practice_morning":
        return {(d, p) for d, p in usable_slots() if p in AFTERNOON}
    if kind == "teacher_avoid_periods":
        return {(d, p) for d, p in usable_slots() if p in params["periods"]}
    if kind == "teacher_only_days":
        return {(d, p) for d, p in usable_slots() if d not in params["days"]}
    return {(d, p) for d in days_of(params) for p in params["periods"]}


def covered_blocks(request: dict, data: dict) -> list[tuple[str, str]]:
    """The (assignment id, kind) blocks a soft request applies to."""
    params = request["params"]
    courses = {c["code"]: c for c in data["courses"]}
    out = []
    for item in data["assignments"]:
        course = courses[item["courseCode"]]
        for kind, _length, _room in blocks_of(course):
            if request["kind"] == "prefer_practice_morning":
                if kind == PRACTICE and course.get("dept") == params["dept"]:
                    out.append((item["id"], kind))
            elif item["teacherId"] == params.get("teacherId") or params.get("groupId") in item["groupIds"]:
                out.append((item["id"], kind))
    return out


def effective_category(request: dict, data: dict) -> str:
    """A must-do `teacher_only_days` that cannot fit is treated as "if possible" (B19)."""
    if request["kind"] == "teacher_only_days" and request["category"] == MUST:
        teacher = next(t for t in data["teachers"] if t["id"] == request["params"]["teacherId"])
        if not only_days_fit(data, teacher, request["params"]["days"]):
            return BEST_EFFORT
    return request["category"]


def compile_limits(requests: list[dict], data: dict) -> Limits:
    """Confirmed requests as solver limits. Must-do requests are hard; "if possible" ones cost penalty."""
    limits = Limits()
    for request in requests:
        category, kind, params = effective_category(request, data), request["kind"], request["params"]
        if category == NO_ACTION or kind == "none":
            continue
        slots = wanted_free(request)
        if kind == "room_closed":
            limits.room.setdefault(params["roomId"], set()).update(slots)
        elif kind == "prefer_practice_morning":
            for block in covered_blocks(request, data):
                limits.avoid.setdefault(block, set()).update(slots)
        elif category == MUST and "teacherId" in params:
            limits.teacher.setdefault(params["teacherId"], set()).update(slots)
        elif category == MUST:
            limits.group.setdefault(params["groupId"], set()).update(slots)
        else:
            for block in covered_blocks(request, data):
                limits.avoid.setdefault(block, set()).update(slots)
    return limits


def soft_misses(items: list[dict], limits: Limits) -> int:
    """Rule จ: periods placed inside slots that an "if possible" request wanted free."""
    missed = 0
    for item in items:
        avoid = limits.avoid.get((item["assignmentId"], item["kind"]), set())
        missed += sum((item["day"], p) in avoid for p in range(item["period"], item["period"] + item["periodCount"]))
    return missed


def request_items(request: dict, items: list[dict], data: dict) -> list[dict]:
    """The placed blocks this request is about."""
    params = request["params"]
    if request["kind"] == "room_closed":
        return [i for i in items if i["roomId"] == params["roomId"]]
    blocks = set(covered_blocks(request, data))
    return [i for i in items if (i["assignmentId"], i["kind"]) in blocks]


def outcome(request: dict, items: list[dict], data: dict) -> dict:
    """Page 6's result for one request: met, partial or not_met, always with a reason."""
    result = {"requestId": request["id"], "outcome": "met", "reason": "ไม่ต้องจัดเพิ่ม"}
    if request["category"] == NO_ACTION or request["kind"] == "none":
        return result
    slots = wanted_free(request)
    total = hit = 0
    for item in request_items(request, items, data):
        periods = range(item["period"], item["period"] + item["periodCount"])
        total += len(periods)
        hit += sum((item["day"], p) in slots for p in periods)
    if hit == 0:
        return {**result, "reason": "จัดได้ตามคำขอทั้งหมด"}
    if hit == total:
        return {**result, "outcome": "not_met", "reason": f"ทุก {total} คาบยังอยู่ในช่วงที่ขอเลี่ยง"}
    return {**result, "outcome": "partial", "reason": f"เลี่ยงได้ {total - hit} จาก {total} คาบ เพราะเวลาที่เหลือไม่พอ"}
