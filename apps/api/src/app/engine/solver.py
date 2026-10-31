"""The two scheduling methods. Both end in the same checker.

Baseline: file order, first place that fits.
Team method: hardest blocks first, then repair what is left by moving other blocks, then seeded local search.

Same data + same requests + same seed = same timetable (B14): one thread, one seeded generator, a fixed
number of steps, and stable orders. The clock never decides anything; it only reports seconds.
"""

import random
from collections import defaultdict
from collections.abc import Callable

from app.engine.checker import (
    GROUP_DAY_LIMIT,
    GROUP_GAP_PENALTY,
    GROUP_OVER_PENALTY,
    REQUEST_PENALTY,
    SPLIT_PENALTY,
    TEACHER_GAP_PENALTY,
    gaps,
)
from app.engine.domain import DAYS, PERIODS, block_periods
from app.engine.model import Limits, Session

REPAIR_STEPS_PER_SESSION = 60
SEARCH_STEPS_PER_SESSION = 300
MAX_SEARCH_STEPS = 120_000  # keeps a 600-item run near 20 s; a step count, not a clock, so the seed still decides
REPORT_EVERY = 500  # steps between progress reports and cancel checks


class Cancelled(Exception):
    """The visitor pressed cancel."""


class State:
    """A timetable being built: who is busy when, kept for fast clash tests."""

    def __init__(self, data: dict, sessions: list[Session], limits: Limits):
        self.sessions = sessions
        self.most = {t["id"]: t["maxPerDay"] for t in data["teachers"]}
        self.closed = limits.room
        self.placed: dict[int, tuple] = {}
        self.teacher: dict = {}
        self.group: dict = {}
        self.room: dict = {}
        self.teacher_day: dict = defaultdict(set)
        self.group_day: dict = defaultdict(set)
        self.places = {s.id: self.legal_places(s) for s in sessions}

    @staticmethod
    def legal_places(s: Session) -> list[tuple]:
        """Every (day, start) this block may ever use, whatever else is placed."""
        places = []
        for day in DAYS:
            for start in PERIODS:
                periods = block_periods(start, s.length)
                if periods and all((day, p) in s.free for p in periods):
                    places.append((day, start))
        return places

    def blockers(self, s: Session, day: str, start: int, room: str) -> set[int]:
        """The placed sessions in the way of this place. Includes what breaks the teacher's daily limit."""
        found: set[int] = set()
        for p in range(start, start + s.length):
            if (day, p) in self.closed.get(room, ()):
                return {-1}  # a closed room cannot be cleared
            if (who := self.teacher.get((s.teacher, day, p))) is not None:
                found.add(who)
            if (who := self.room.get((room, day, p))) is not None:
                found.add(who)
            for group in s.groups:
                if (who := self.group.get((group, day, p))) is not None:
                    found.add(who)
        return found | self.over_daily_limit(s, day, found)

    def over_daily_limit(self, s: Session, day: str, leaving: set[int]) -> set[int]:
        """The fewest of this teacher's sessions that day to move, so that this block fits the daily limit."""
        others = [o for o in self.day_sessions(s.teacher, day) if o not in leaving]
        load = sum(self.sessions[o].length for o in others) + s.length
        extra: set[int] = set()
        for other in others:
            if load <= self.most[s.teacher]:
                break
            extra.add(other)
            load -= self.sessions[other].length
        return extra

    def day_sessions(self, teacher: str, day: str) -> list[int]:
        return sorted({self.teacher[(teacher, day, p)] for p in self.teacher_day[(teacher, day)]})

    def free_room(self, s: Session, day: str, start: int) -> str | None:
        """The smallest fitting room with no blockers here, or None."""
        for room in s.rooms:
            if not self.blockers(s, day, start, room):
                return room
        return None

    def add(self, s: Session, day: str, start: int, room: str) -> None:
        self.placed[s.id] = (day, start, room)
        for p in range(start, start + s.length):
            self.teacher[(s.teacher, day, p)] = s.id
            self.room[(room, day, p)] = s.id
            self.teacher_day[(s.teacher, day)].add(p)
            for group in s.groups:
                self.group[(group, day, p)] = s.id
                self.group_day[(group, day)].add(p)

    def remove(self, s: Session) -> None:
        day, start, room = self.placed.pop(s.id)
        for p in range(start, start + s.length):
            del self.teacher[(s.teacher, day, p)]
            del self.room[(room, day, p)]
            self.teacher_day[(s.teacher, day)].discard(p)
            for group in s.groups:
                del self.group[(group, day, p)]
                self.group_day[(group, day)].discard(p)

    def local_cost(self, s: Session, days: set[str]) -> int:
        """The penalty that a move of this block can change: its teacher and groups on these days, and its pair."""
        cost = sum(gaps(self.teacher_day[(s.teacher, d)]) * TEACHER_GAP_PENALTY for d in days)
        for group in s.groups:
            for day in days:
                periods = self.group_day[(group, day)]
                cost += gaps(periods) * GROUP_GAP_PENALTY
                cost += max(0, len(periods) - GROUP_DAY_LIMIT) * GROUP_OVER_PENALTY
        if s.partner is not None and s.id in self.placed and s.partner in self.placed:
            if self.placed[s.id][0] == self.placed[s.partner][0]:
                cost += SPLIT_PENALTY
        if s.avoid and s.id in self.placed:
            day, start, _ = self.placed[s.id]
            cost += sum(REQUEST_PENALTY for p in range(start, start + s.length) if (day, p) in s.avoid)
        return cost


def difficulty(s: Session, state: State) -> tuple:
    """Hardest first: fewest legal places and rooms, longest block, most groups. The item ID keeps the order stable."""
    return (len(state.places[s.id]) * len(s.rooms), -s.length, -len(s.groups), s.item, s.kind)


def place_best(state: State, s: Session, rng: random.Random) -> bool:
    """Put a block in its cheapest free place. Random order breaks ties, so the seed matters."""
    places = state.places[s.id][:]
    rng.shuffle(places)
    best, best_cost = None, None
    for day, start in places:
        room = state.free_room(s, day, start)
        if room is None:
            continue
        before = state.local_cost(s, {day})
        state.add(s, day, start, room)
        cost = state.local_cost(s, {day}) - before
        state.remove(s)
        if best_cost is None or cost < best_cost:
            best, best_cost = (day, start, room), cost
    if best is None:
        return False
    state.add(s, *best)
    return True


def repair(state: State, waiting: list[Session], rng: random.Random, tick: Callable) -> list[Session]:
    """Place what is left by moving the blocks in its way, and placing those again. Stops after a fixed step count."""
    moved: dict[int, int] = defaultdict(int)
    steps = REPAIR_STEPS_PER_SESSION * len(state.sessions)
    for step in range(steps):
        if not waiting:
            break
        tick(step, steps)
        s = waiting.pop(rng.randrange(len(waiting)))
        best, best_score = None, None
        for day, start in state.places[s.id]:
            for room in s.rooms:
                found = state.blockers(s, day, start, room)
                if -1 in found:
                    continue
                # blocks moved often cost more, which stops two blocks pushing each other out for ever
                score = sum(state.sessions[o].length * (1 + moved[o]) for o in found) + rng.random()
                if best_score is None or score < best_score:
                    best, best_score, best_found = (day, start, room), score, found
        if best is None:
            waiting.append(s)
            continue
        for other in sorted(best_found):
            state.remove(state.sessions[other])
            moved[other] += 1
            waiting.append(state.sessions[other])
        state.add(s, *best)
    return waiting


def improve(state: State, rng: random.Random, tick: Callable) -> None:
    """Move one random block at a time, keeping every move that does not raise the penalty."""
    placed = [s for s in state.sessions if s.id in state.placed]
    steps = min(SEARCH_STEPS_PER_SESSION * len(placed), MAX_SEARCH_STEPS)
    for step in range(steps):
        tick(step, steps)
        s = placed[rng.randrange(len(placed))]
        places = state.places[s.id]
        day, start = places[rng.randrange(len(places))]
        old = state.placed[s.id]
        days = {old[0], day}
        before = state.local_cost(s, days)
        state.remove(s)
        room = state.free_room(s, day, start)
        if room is None:
            state.add(s, *old)
            continue
        state.add(s, day, start, room)
        if state.local_cost(s, days) > before:
            state.remove(s)
            state.add(s, *old)


def to_items(state: State) -> list[dict]:
    """The timetable as the API's `items`, in session order."""
    out = []
    for s in state.sessions:
        if s.id in state.placed:
            day, start, room = state.placed[s.id]
            out.append(
                {
                    "assignmentId": s.item,
                    "roomId": room,
                    "day": day,
                    "period": start,
                    "kind": s.kind,
                    "periodCount": s.length,
                }
            )
    return out


def noop(*_args) -> None:
    return None


def solve_team(data, sessions, limits, seed: int, report: Callable = noop, stop: Callable = lambda: False) -> tuple:
    """The team method. Returns (items, sessions not placed). Raises Cancelled when `stop()` turns true."""
    rng = random.Random(seed)
    state = State(data, sessions, limits)

    def ticker(stage: str, low: float, high: float) -> Callable:
        def tick(step: int, steps: int) -> None:
            if step % REPORT_EVERY == 0:
                if stop():
                    raise Cancelled
                report(stage, low + (high - low) * step / max(steps, 1))

        return tick

    order = sorted(sessions, key=lambda s: difficulty(s, state))
    report("ASSIGNING_SLOTS", 0.0)
    waiting = []
    for index, s in enumerate(order):
        ticker("ASSIGNING_SLOTS", 0.0, 0.2)(index * REPORT_EVERY // 50, len(order) * REPORT_EVERY // 50)
        if not state.places[s.id] or not s.rooms or not place_best(state, s, rng):
            waiting.append(s)
    unplaceable = [s for s in waiting if not state.places[s.id] or not s.rooms]
    rest = [s for s in waiting if state.places[s.id] and s.rooms]
    left = repair(state, rest, rng, ticker("RESOLVING_CONFLICTS", 0.2, 0.4))
    improve(state, rng, ticker("IMPROVING", 0.4, 0.95))
    report("FINALIZING", 0.95)
    return to_items(state), unplaceable + left


def solve_baseline(data, sessions, limits) -> tuple:
    """The simple method for page 5: file order, first place that fits, no repair. Returns (items, not placed)."""
    state = State(data, sessions, limits)
    left = []
    for s in sessions:
        for day, start in state.places[s.id]:
            room = state.free_room(s, day, start)
            if room is not None:
                state.add(s, day, start, room)
                break
        else:
            left.append(s)
    return to_items(state), left
