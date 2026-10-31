"""F3: the checker counts each hard and soft rule exactly. Each timetable below is made by hand."""

import pytest

from app.engine.checker import check


def college() -> dict:
    return {
        "teachers": [
            {"id": "T1", "name": "ก", "maxPerDay": 3, "unavailable": [{"day": "TUE", "fromPeriod": 8, "toPeriod": 8}]},
            {"id": "T2", "name": "ข", "maxPerDay": 8, "unavailable": []},
        ],
        "rooms": [
            {"id": "LR", "name": "LR", "type": "ห้องบรรยาย", "capacity": 40},
            {"id": "LR2", "name": "LR2", "type": "ห้องบรรยาย", "capacity": 40},
            {"id": "COM", "name": "COM", "type": "ห้องคอม", "capacity": 40},
            {"id": "SMALL", "name": "SMALL", "type": "ห้องบรรยาย", "capacity": 5},
        ],
        "groups": [{"id": "G1", "name": "G1", "size": 30}, {"id": "G2", "name": "G2", "size": 30}],
        "courses": [
            {"code": "C1", "name": "C1", "theory": 2, "practice": 0, "practiceRoomType": None},
            {"code": "C2", "name": "C2", "theory": 1, "practice": 2, "practiceRoomType": "ห้องคอม"},
        ],
        "assignments": [
            {"id": "A", "courseCode": "C1", "groupIds": ["G1"], "teacherId": "T1"},
            {"id": "B", "courseCode": "C1", "groupIds": ["G2"], "teacherId": "T2"},
        ],
    }


def item(assignment, day, period, count=2, room="LR", kind="theory") -> dict:
    return {
        "assignmentId": assignment,
        "day": day,
        "period": period,
        "periodCount": count,
        "roomId": room,
        "kind": kind,
    }


GOOD = [item("A", "MON", 1), item("B", "MON", 1, room="LR2")]


def test_clean_timetable_has_nothing_to_report():
    report = check(college(), GOOD)
    stats = report["stats"]
    assert stats["scheduled"] == 2 and stats["penalty"] == 0 and report["conflicts"] == []
    assert (
        stats["teacherConflicts"] == stats["roomConflicts"] == stats["groupConflicts"] == stats["otherViolations"] == 0
    )


def test_teacher_clash():
    data = college()
    data["assignments"][1]["teacherId"] = "T1"
    assert check(data, GOOD)["stats"]["teacherConflicts"] == 2  # both periods of the block


def test_room_clash():
    assert check(college(), [item("A", "MON", 1), item("B", "MON", 2)])["stats"]["roomConflicts"] == 1


def test_group_clash_counts_a_combined_class():
    data = college()
    data["assignments"][1]["groupIds"] = ["G1", "G2"]
    assert check(data, GOOD)["stats"]["groupConflicts"] == 2


def test_missing_and_duplicated_blocks():
    report = check(college(), [item("A", "MON", 1)])
    assert report["stats"]["unscheduled"] == 1 and report["missing"] == ["B"]
    repeated = [*GOOD, item("A", "TUE", 1)]
    assert check(college(), repeated)["stats"]["otherViolations"] == 1


@pytest.mark.parametrize(
    ("placed", "code"),
    [
        (item("B", "MON", 4), "CROSSES_LUNCH"),
        (item("B", "MON", 1, room="COM"), "WRONG_ROOM_TYPE"),
        (item("B", "MON", 1, room="SMALL"), "ROOM_CAPACITY_EXCEEDED"),
        (item("B", "WED", 7), "WEDNESDAY_ACTIVITY"),
    ],
)
def test_placement_rules(placed, code):
    report = check(college(), [item("A", "FRI", 1), placed])
    assert [c["code"] for c in report["conflicts"]] == [code] and report["stats"]["otherViolations"] == 1


def test_teacher_unavailable():
    report = check(college(), [item("A", "TUE", 7), item("B", "MON", 1)])
    assert [c["code"] for c in report["conflicts"]] == ["TEACHER_UNAVAILABLE"]


def test_teacher_daily_limit():
    data = college()
    data["assignments"][1]["teacherId"] = "T1"
    report = check(data, [item("A", "MON", 1), item("B", "MON", 3)])
    assert [c["code"] for c in report["conflicts"]] == ["TEACHER_DAILY_LIMIT"]


def test_group_and_teacher_gaps_cost_their_weights():
    data = college()
    data["assignments"][1]["groupIds"] = ["G1"]
    data["assignments"][1]["teacherId"] = "T1"
    data["teachers"][0]["maxPerDay"] = 8
    penalty = check(data, [item("A", "MON", 1), item("B", "MON", 4, count=1)])  # periods 1, 2, 4: one gap
    assert penalty["penalty"]["groupGaps"] == 1 and penalty["penalty"]["teacherGaps"] == 1
    assert penalty["stats"]["penalty"] == 2 + 1


def test_lunch_is_not_a_gap():
    data = college()
    data["courses"][0]["theory"] = 1
    data["assignments"][1].update(groupIds=["G1"], teacherId="T1")
    report = check(data, [item("A", "MON", 4, count=1), item("B", "MON", 5, count=1)])
    assert report["penalty"]["groupGaps"] == 0


def test_more_than_six_periods_costs_three_each():
    data = college()
    data["teachers"][1]["maxPerDay"] = 8
    data["courses"].append({"code": "C3", "name": "C3", "theory": 4, "practice": 0, "practiceRoomType": None})
    data["assignments"] = [
        {"id": "M", "courseCode": "C3", "groupIds": ["G1"], "teacherId": "T2"},
        {"id": "N", "courseCode": "C3", "groupIds": ["G1"], "teacherId": "T2"},
    ]
    report = check(data, [item("M", "MON", 1, count=4), item("N", "MON", 5, count=4)])
    assert report["penalty"]["overSixPeriods"] == 2 and report["stats"]["penalty"] == 6


def test_theory_and_practical_on_one_day_cost_two():
    data = college()
    data["teachers"][1]["maxPerDay"] = 8
    data["assignments"] = [{"id": "P", "courseCode": "C2", "groupIds": ["G1"], "teacherId": "T2"}]
    same = [item("P", "MON", 1, count=1), item("P", "MON", 2, room="COM", kind="practice")]
    apart = [item("P", "MON", 1, count=1), item("P", "TUE", 1, room="COM", kind="practice")]
    assert check(data, same)["stats"]["penalty"] == 2
    assert check(data, apart)["stats"]["penalty"] == 0


def test_request_penalty_is_added():
    assert check(college(), GOOD, request_penalty=3)["stats"]["penalty"] == 3
