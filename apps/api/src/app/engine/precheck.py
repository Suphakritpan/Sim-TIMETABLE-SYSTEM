"""Find data that cannot be scheduled before the solver runs, and say why in plain Thai (B15).

The import checks catch problems in one teacher or group. These look across the file: room hours, teaching
items with no legal place, and the blocks of one group or teacher that cannot share their days.
"""

from collections import defaultdict

from app.engine.domain import usable_slots
from app.engine.model import Limits, Session
from app.engine.validate import fits_somewhere


def check_rooms(data: dict, sessions: list[Session], limits: Limits) -> list[str]:
    """Each room type: the hours needed against the hours its rooms have. Closed rooms give fewer hours."""
    slots = len(usable_slots())
    have: dict = defaultdict(int)
    for room in data["rooms"]:
        have[room["type"]] += slots - len(limits.room.get(room["id"], set()))
    types = {r["id"]: r["type"] for r in data["rooms"]}
    need: dict = defaultdict(int)
    for session in sessions:
        if session.rooms:
            need[types[session.rooms[0]]] += session.length
    return [f"{t} ต้องใช้ {need[t]} คาบ แต่ทุกห้องรวมกันมี {have[t]} คาบ" for t in need if need[t] > have[t]]


def check_places(sessions: list[Session]) -> list[str]:
    """Each block needs a room that fits and a legal run of free periods."""
    reasons = []
    for s in sessions:
        if not s.rooms:
            reasons.append(f"{s.item}: ไม่มีห้องที่เหมาะกับ {s.students} คน")
        elif not fits_somewhere(s.length, s.free):
            reasons.append(f"{s.item}: ครู {s.teacher} และกลุ่มไม่มีเวลาว่างพร้อมกัน {s.length} คาบติดกัน")
    return reasons


def check_group_hours(sessions: list[Session]) -> list[str]:
    """Each group's hours against the slots its blocks may use, after requests remove some."""
    hours: dict = defaultdict(int)
    allowed: dict = defaultdict(set)
    for s in sessions:
        for group in s.groups:
            hours[group] += s.length
            allowed[group] |= s.free
    return [
        f"กลุ่ม {g} ต้องเรียน {hours[g]} คาบ แต่มีเวลาที่ใช้ได้ {len(allowed[g])} คาบ"
        for g in hours
        if hours[g] > len(allowed[g])
    ]


def precheck(data: dict, sessions: list[Session], limits: Limits) -> list[str]:
    """Reasons this data cannot be scheduled. Empty does not prove a timetable exists, only that none is ruled out."""
    return check_places(sessions) + check_rooms(data, sessions, limits) + check_group_hours(sessions)
