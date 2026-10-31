"""Turn a checked dataset into the sessions to place, plus the limits requests add. Used by the solvers."""

from dataclasses import dataclass, field

from app.engine.domain import usable_slots
from app.engine.validate import blocks_of, free_slots


@dataclass
class Limits:
    """Limits from confirmed requests. Slots are (day, period). `avoid` is soft, the rest are hard."""

    teacher: dict[str, set] = field(default_factory=dict)
    group: dict[str, set] = field(default_factory=dict)
    room: dict[str, set] = field(default_factory=dict)
    avoid: dict[tuple, set] = field(default_factory=dict)  # (assignment id, kind) -> slots to stay out of if possible


@dataclass
class Session:
    """One block to place: a theory or practical run of consecutive periods of one teaching item."""

    id: int
    item: str
    kind: str
    length: int
    teacher: str
    groups: list[str]
    students: int
    rooms: list[str]  # rooms that fit, smallest first, so a big room stays free for a big class
    free: set  # slots this session's teacher and groups may use
    avoid: set
    partner: int | None = None  # the other block of the same teaching item


def build_sessions(data: dict, limits: Limits) -> list[Session]:
    """Every block to place, in file order, which keeps results stable."""
    teachers = {t["id"]: t for t in data["teachers"]}
    groups = {g["id"]: g for g in data["groups"]}
    courses = {c["code"]: c for c in data["courses"]}
    rooms = sorted(data["rooms"], key=lambda r: (r["capacity"], r["id"]))
    sessions: list[Session] = []
    for assignment in data["assignments"]:
        first = len(sessions)
        teacher = teachers[assignment["teacherId"]]
        students = sum(groups[g]["size"] for g in assignment["groupIds"])
        free = free_slots(teacher) - limits.teacher.get(teacher["id"], set())
        for group in assignment["groupIds"]:
            free = free - limits.group.get(group, set())
        for kind, length, room_type in blocks_of(courses[assignment["courseCode"]]):
            fitting = [r["id"] for r in rooms if r["type"] == room_type and r["capacity"] >= students]
            session = Session(
                id=len(sessions),
                item=assignment["id"],
                kind=kind,
                length=length,
                teacher=teacher["id"],
                groups=assignment["groupIds"],
                students=students,
                rooms=fitting,
                free=free,
                avoid=limits.avoid.get((assignment["id"], kind), set()),
            )
            sessions.append(session)
        if len(sessions) - first == 2:
            sessions[first].partner, sessions[first + 1].partner = first + 1, first
    return sessions


def total_slots() -> int:
    return len(usable_slots())
