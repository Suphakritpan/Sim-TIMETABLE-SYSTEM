"""F5: reading Thai requests, applying them to a run, and reporting the outcome."""

from pathlib import Path

import pytest
from workbooks import base, build, upload

from app import config, worker
from app.engine.excel_reader import read_sheets
from app.engine.requests import compile_limits, interpret
from app.engine.validate import validate

TRIAL = Path.home() / "Desktop/full_test_data/2_ข้อมูลชุดทดลอง_4กลุ่ม.xlsx"
MAIN = Path.home() / "Desktop/full_test_data/3_ข้อมูลชุดหลัก_12กลุ่ม.xlsx"
# Expected readings, from the agent brief's table: id -> (kind, category, a param that must match)
TRIAL_ANSWERS = {
    "R01": ("teacher_unavailable", "must", ("teacherId", "TGEN01")),
    "R02": ("teacher_unavailable", "must", ("teacherId", "TGEN02")),
    "R03": ("prefer_practice_morning", "best_effort", ("dept", "เทคโนโลยีสารสนเทศ")),
    "R04": ("teacher_avoid_periods", "best_effort", ("teacherId", "TIT02")),
    "R05": ("group_unavailable", "must", ("groupId", "IT-H11")),
    "R06": ("teacher_only_days", "best_effort", ("teacherId", "TIT01")),
}
MAIN_ANSWERS = {
    "R01": ("teacher_unavailable", "must", ("teacherId", "TELEC06")),
    "R02": ("teacher_unavailable", "must", ("teacherId", "TACC03")),
    "R03": ("room_closed", "must", ("roomId", "LR-04")),
    "R04": ("prefer_practice_morning", "best_effort", ("dept", "การบัญชี")),
    "R05": ("teacher_avoid_periods", "best_effort", ("teacherId", "TELEC06")),
    "R06": ("group_unavailable", "must", ("groupId", "ELEC-H22")),
    "R07": ("teacher_only_days", "best_effort", ("teacherId", "TGEN04")),
    "R08": ("none", "no_action", None),
}


def read(text: str) -> dict:
    data, _ = validate(read_sheets(build()))
    return interpret(text, data)["request"]


@pytest.mark.parametrize(("path", "answers"), [(TRIAL, TRIAL_ANSWERS), (MAIN, MAIN_ANSWERS)], ids=["trial", "main"])
def test_provided_requests_match_the_answers(path, answers):
    # local only: these files are not always on the machine
    if not path.exists():
        pytest.skip("competition files are not on this machine")
    data, _ = validate(read_sheets(path.read_bytes()))
    for raw in data["requests"]:
        request = interpret(raw["text"], data)["request"]
        kind, category, param = answers[raw["id"]]
        assert (raw["id"], request["kind"], request["category"]) == (raw["id"], kind, category)
        if param:
            assert request["params"][param[0]] == param[1], raw["id"]


def test_a_surname_that_contains_a_day_is_not_a_day():
    data, _ = validate(read_sheets(build()))
    data["teachers"][0]["name"] = "ครูจิราพร จันทร์แก้ว"
    request = interpret("ครูจิราพร จันทร์แก้ว ถ้าเลี่ยงได้ขอไม่สอนคาบแรก", data)["request"]
    assert request["kind"] == "teacher_avoid_periods" and request["params"]["periods"] == [1]


def test_finish_time_becomes_periods():
    request = read("กลุ่ม G1 ต้องซ้อมกีฬาทุกวันพฤหัสบดี ขอเลิกเรียนไม่เกิน 15.00 น.")
    assert request["kind"] == "group_unavailable"
    assert request["params"]["days"] == ["THU"] and request["params"]["periods"] == [7, 8]


def test_full_name_wins_over_a_shared_first_name():
    data, _ = validate(read_sheets(build()))
    data["teachers"].append({"id": "T3", "name": "ครูสมมติ สาม", "maxPerDay": 5, "unavailable": []})
    assert interpret("ครูสมมติ สาม ขอไม่สอนคาบแรก", data)["request"]["params"]["teacherId"] == "T3"


def test_someone_not_in_the_data_needs_nothing():
    request = read("ครูไม่มีตัวตน ขอไม่สอนคาบแรก")
    assert request["category"] == "no_action" and request["understanding"]


def test_if_possible_words_make_it_soft():
    assert read("ครูสมมติ หนึ่ง ถ้าเลี่ยงได้ขอไม่สอนคาบแรก")["category"] == "best_effort"
    assert read("ครูสมมติ หนึ่ง ขอไม่สอนคาบแรก")["category"] == "must"


def test_understanding_reads_like_the_brief():
    assert read("ครูสมมติ สอง ถ้าเลี่ยงได้ขอไม่สอนคาบแรก")["understanding"] == "ครู T2 / ไม่สอนคาบ 1 / ทำถ้าทำได้"


def imported(client, rows=None) -> str:
    return upload(client, build(rows)).json()["importId"]


def test_interpret_route_and_unreadable_text(client):
    import_id = imported(client)
    body = client.post("/api/v1/requests/interpret", json={"importId": import_id, "text": "ครูสมมติ หนึ่ง ขอไม่สอนคาบแรก"})
    assert body.status_code == 200 and body.json()["request"]["id"] == "R1"
    assert body.json()["confidence"] == "high" and body.json()["ambiguities"] == []
    new = client.post("/api/v1/requests/interpret", json={"importId": import_id, "text": "ครูสมมติ สอง ขอไม่สอนคาบแรก"})
    assert new.json()["request"]["id"].startswith("U")
    bad = client.post("/api/v1/requests/interpret", json={"importId": import_id, "text": "สวัสดีตอนเย็น"})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "INTERPRET_FAILED"


def run(client, import_id, requests) -> dict:
    job = client.post("/api/v1/schedules", json={"importId": import_id, "seed": 5, "requests": requests})
    assert job.status_code == 202, job.text
    worker.run_one()
    return client.get(f"/api/v1/schedules/{job.json()['jobId']}").json()


def test_a_must_request_is_obeyed_and_reported(client):
    import_id = imported(client)
    request = {
        "id": "M1",
        "kind": "teacher_unavailable",
        "category": "must",
        "params": {"teacherId": "T1", "day": "MON", "periods": [1, 2, 3, 4, 5, 6, 7, 8]},
    }
    body = run(client, import_id, [request])
    assert body["status"] == "completed"
    assert all(i["day"] != "MON" for i in body["result"]["items"] if i["assignmentId"] == "S1")
    assert body["result"]["requestResults"] == [{"requestId": "M1", "outcome": "met", "reason": "จัดได้ตามคำขอทั้งหมด"}]


def test_a_closed_room_stays_empty(client):
    import_id = imported(client)
    closed = [
        {
            "id": "M1",
            "kind": "room_closed",
            "category": "must",
            "params": {"roomId": "LR-1", "days": ["MON", "TUE", "WED", "THU"], "periods": [1, 2, 3, 4, 5, 6, 7, 8]},
        }
    ]
    items = run(client, import_id, closed)["result"]["items"]
    assert all(i["day"] == "FRI" for i in items if i["roomId"] == "LR-1")


@pytest.mark.parametrize(
    ("change", "reason"),
    [
        ({"kind": "magic"}, "unknown kind"),
        ({"params": {"teacherId": "NOPE", "day": "MON", "periods": [1]}}, "unknown teacherId"),
        ({"params": {"teacherId": "T1", "day": "SUN", "periods": [1]}}, "days must be"),
        ({"params": {"teacherId": "T1", "day": "MON", "periods": [9]}}, "periods must be"),
        ({"params": {"teacherId": "T1", "periods": [1]}}, "needs a day"),
    ],
)
def test_a_request_that_cannot_be_used_is_refused(client, change, reason):
    request = {"id": "M1", "kind": "teacher_unavailable", "category": "must", "params": {}, **change}
    r = client.post("/api/v1/schedules", json={"importId": imported(client), "requests": [request]})
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_FAILED"
    assert reason in r.json()["error"]["details"][0]["reason"]


def test_every_sent_request_has_a_result(client):
    none = {"id": "N1", "kind": "none", "category": "no_action", "params": {}}
    results = run(client, imported(client), [none])["result"]["requestResults"]
    assert [r["requestId"] for r in results] == ["N1"] and isinstance(results[0]["reason"], str)


def test_impossible_must_request_ends_infeasible_with_a_reason(client):
    everything = {"day": "MON", "periods": [1, 2, 3, 4, 5, 6, 7, 8]}
    requests = [
        {
            "id": f"M{i}",
            "kind": "teacher_unavailable",
            "category": "must",
            "params": {"teacherId": "T1", **everything, "day": day},
        }
        for i, day in enumerate(["MON", "TUE", "WED", "THU", "FRI"])
    ]
    body = run(client, imported(client), requests)
    assert body["status"] == "infeasible" and body["result"]["infeasibleReasons"]


def test_must_only_days_that_cannot_fit_is_treated_as_if_possible():
    data, _ = validate(read_sheets(build()))
    data["teachers"][0]["maxPerDay"] = 1
    request = {
        "id": "M1",
        "kind": "teacher_only_days",
        "category": "must",
        "params": {"teacherId": "T1", "days": ["MON"]},
    }
    limits = compile_limits([request], data)
    assert "T1" not in limits.teacher and limits.avoid


def test_soft_request_affects_penalty_and_is_reported_partly_met(client):
    rows = base()
    rows["ครู"][0][3] = 8
    rows["เวลาไม่สะดวก"] = []
    rows["รายวิชา"] = [["C1", "ยาว", "4-4-2", "ไอที", "ห้องคอมพิวเตอร์"]]
    rows["รายการสอน"] = [["S1", "C1", "G1", "T1"], ["S2", "C1", "G2", "T2"]]
    days = ["MON", "TUE", "WED", "THU", "FRI"]
    params = {"teacherId": "T1", "days": days[:1]}
    request = {"id": "M1", "kind": "teacher_only_days", "category": "best_effort", "params": params}
    body = run(client, imported(client, rows), [request])
    assert body["status"] == "completed"
    assert body["result"]["requestResults"][0]["outcome"] in ("met", "partial")


@pytest.mark.parametrize("path", [p for p in (TRIAL, MAIN) if p.exists()], ids=lambda p: p.name)
def test_provided_sets_with_all_requests_stay_clean(client, path, monkeypatch):
    monkeypatch.setattr(config, "MAX_UPLOAD_MB", 10)
    body = upload(client, path.read_bytes()).json()
    data = {k: body[k] for k in ("teachers", "rooms", "groups", "courses", "assignments", "requests")}
    requests = [interpret(r["text"], data)["request"] for r in data["requests"]]
    payload = [{k: r[k] for k in ("id", "kind", "category", "params")} for r in requests]
    result = run(client, body["importId"], payload)
    assert result["status"] == "completed", result["result"]["unscheduled"][:3]
    stats = result["result"]["stats"]
    assert stats["unscheduled"] == 0 and stats["otherViolations"] == 0
    assert len(result["result"]["requestResults"]) == len(requests)
    must = {r["id"] for r in requests if r["category"] == "must"}
    assert all(o["outcome"] == "met" for o in result["result"]["requestResults"] if o["requestId"] in must)
