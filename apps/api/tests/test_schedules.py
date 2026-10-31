"""F3 and F6: run jobs through the real routes and worker, as the page does."""

from pathlib import Path

import pytest
from sqlalchemy import select, update
from workbooks import base, build, upload

from app import config, worker
from app.db import SessionLocal
from app.engine import solver
from app.engine.checker import check
from app.engine.model import Limits, build_sessions
from app.models import Job

TRIAL = Path.home() / "Desktop/full_test_data/2_ข้อมูลชุดทดลอง_4กลุ่ม.xlsx"
MAIN = Path.home() / "Desktop/full_test_data/3_ข้อมูลชุดหลัก_12กลุ่ม.xlsx"
HARD = ("teacherConflicts", "roomConflicts", "groupConflicts", "otherViolations")


def start(client, import_id, **extra):
    return client.post("/api/v1/schedules", json={"importId": import_id, "seed": 7, **extra})


def imported(client, content=None) -> str:
    return upload(client, build() if content is None else content).json()["importId"]


def finished(client, job: dict) -> dict:
    assert worker.run_one() is True
    return client.get(f"/api/v1/schedules/{job['jobId']}").json()


def test_a_run_ends_with_honest_numbers(client):
    created = start(client, imported(client))
    assert created.status_code == 202
    job = created.json()
    assert job["status"] == "queued" and job["seed"] == 7 and job["method"] == "team"
    body = finished(client, job)
    assert body["status"] == "completed" and body["progress"] is not None
    assert "stage" not in body and "error" not in body  # the page's schema refuses null here
    stats = body["result"]["stats"]
    assert stats["scheduled"] == stats["totalAssignments"] == 2
    assert all(stats[f] == 0 for f in HARD)
    assert body["result"]["explanation"] and body["result"]["items"]


def test_no_seed_gets_one_that_is_returned(client):
    job = client.post("/api/v1/schedules", json={"importId": imported(client)}).json()
    assert isinstance(job["seed"], int)


def test_same_seed_same_timetable(client):
    import_id = imported(client)
    first = finished(client, start(client, import_id).json())["result"]["items"]
    second = finished(client, start(client, import_id).json())["result"]["items"]
    assert first == second


def test_bad_requests_are_refused(client):
    assert start(client, "imp_nothing").status_code == 404
    r = client.post("/api/v1/schedules", json={"importId": "x", "seed": -1})
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_FAILED"
    assert client.post("/api/v1/schedules", json={"importId": "x", "method": "magic"}).status_code == 422


def test_invalid_import_cannot_run(client):
    rows = base()
    rows["ครู"].append(["T1", "ซ้ำ", "ไอที", 6])
    r = start(client, imported(client, build(rows)))
    assert r.status_code == 409 and r.json()["error"]["code"] == "IMPORT_NOT_VALID"


def test_second_run_on_the_same_import_waits(client):
    import_id = imported(client)
    start(client, import_id)
    r = start(client, import_id)
    assert r.status_code == 409 and r.json()["error"]["code"] == "JOB_ALREADY_RUNNING"


def test_the_queue_has_a_limit(client, monkeypatch):
    monkeypatch.setattr(config, "MAX_QUEUED_JOBS", 1)
    start(client, imported(client))
    r = start(client, imported(client))
    assert r.status_code == 429 and r.json()["error"]["code"] == "QUEUE_FULL"


def test_cancel_a_queued_job_twice_then_run_again(client):
    import_id = imported(client)
    job = start(client, import_id).json()
    url = f"/api/v1/schedules/{job['jobId']}/cancel"
    assert client.post(url).json()["status"] == "cancelled"
    assert client.post(url).status_code == 200
    assert worker.run_one() is False
    assert start(client, import_id).status_code == 202


def test_cancel_stops_a_running_job(client, monkeypatch):
    job = start(client, imported(client)).json()

    def stops_at_once(data, sessions, limits, seed, report, stop):
        with SessionLocal() as db:
            db.execute(update(Job).values(cancel_requested=True))
            db.commit()
        assert stop() is True
        raise solver.Cancelled

    monkeypatch.setattr("app.services.schedule_service.solve_team", stops_at_once)
    assert finished(client, job)["status"] == "cancelled"


def test_solver_checks_for_cancel_while_working():
    data = {
        "teachers": [{"id": "T", "name": "T", "maxPerDay": 8, "unavailable": []}],
        "rooms": [{"id": "R", "name": "R", "type": "ห้องบรรยาย", "capacity": 40}],
        "groups": [{"id": "G", "name": "G", "size": 10}],
        "courses": [{"code": "C", "name": "C", "theory": 1, "practice": 0, "practiceRoomType": None}],
        "assignments": [{"id": "A", "courseCode": "C", "groupIds": ["G"], "teacherId": "T"}],
    }
    limits = Limits()
    with pytest.raises(solver.Cancelled):
        solver.solve_team(data, build_sessions(data, limits), limits, 1, stop=lambda: True)


def test_impossible_data_ends_with_a_reason(client):
    rows = base()
    rows["ห้อง"] = rows["ห้อง"][:1] + [["COM-1", "ห้องคอม", "ห้องคอมพิวเตอร์", 40, ""]]
    rows["ครู"] = [[f"T{i}", f"ครู {i}", "ไอที", 8] for i in range(1, 22)]
    rows["เวลาไม่สะดวก"] = []
    rows["กลุ่มเรียน"] = [[f"G{i}", f"กลุ่ม {i}", "ไอที", 10] for i in range(1, 22)]
    rows["รายวิชา"] = [["C1", "วิชา", "2-0-2", "ไอที", ""], ["C2", "ปฏิบัติ", "0-2-1", "ไอที", "ห้องคอมพิวเตอร์"]]
    rows["รายการสอน"] = [[f"S{i}", "C2", f"G{i}", f"T{i}"] for i in range(1, 22)]  # 42 hours, one room has 38
    body = finished(client, start(client, imported(client, build(rows))).json())
    assert body["status"] == "infeasible"
    assert "ห้องคอมพิวเตอร์" in body["result"]["infeasibleReasons"][0]
    assert body["result"]["stats"]["unscheduled"] == 21


def test_what_cannot_fit_is_listed_not_hidden(client):
    # 10 three-period blocks, one room: each half day holds one block, and only 9 half days are long enough
    rows = base()
    rows["ครู"] = [[f"T{i}", f"ครู {i}", "ไอที", 8] for i in range(1, 11)]
    rows["เวลาไม่สะดวก"] = []
    rows["ห้อง"] = rows["ห้อง"][:1]
    rows["กลุ่มเรียน"] = [[f"G{i}", f"กลุ่ม {i}", "ไอที", 10] for i in range(1, 11)]
    rows["รายวิชา"] = [["C1", "วิชา", "3-0-3", "ไอที", ""]]
    rows["รายการสอน"] = [[f"S{i}", "C1", f"G{i}", f"T{i}"] for i in range(1, 11)]
    body = finished(client, start(client, imported(client, build(rows))).json())
    assert body["status"] == "completed_partial"
    assert body["result"]["stats"]["scheduled"] == 9 and len(body["result"]["unscheduled"]) == 1
    assert body["result"]["unscheduled"][0]["reasonCode"] == "NO_FREE_SLOT"
    assert all(body["result"]["stats"][f] == 0 for f in HARD)


def test_a_crash_ends_the_job_without_details(client, monkeypatch):
    def boom(*_):
        raise RuntimeError("secret detail")

    job = start(client, imported(client)).json()
    monkeypatch.setitem(worker.HANDLERS, "schedule", boom)
    body = finished(client, job)
    assert body["status"] == "failed" and body["error"] == {"code": "INTERNAL_ERROR"}
    assert "secret" not in str(body)


def test_restart_ends_jobs_left_running(client):
    job = start(client, imported(client)).json()
    with SessionLocal() as db:
        db.execute(update(Job).values(status="running"))
        db.commit()
    worker.recover()
    assert client.get(f"/api/v1/schedules/{job['jobId']}").json()["status"] == "failed"


def test_comparison_gives_both_methods(client):
    created = client.post("/api/v1/evaluations", json={"importId": imported(client), "seed": 3})
    assert created.status_code == 202
    evaluation = created.json()
    url = f"/api/v1/evaluations/{evaluation['evaluationId']}"
    assert client.get(url).json()["status"] == "queued"
    worker.run_one()
    body = client.get(url).json()
    assert body["status"] == "completed" and body["isSimulated"] is False and body["seed"] == 3
    assert [m["method"] for m in body["methods"]] == ["baseline", "team"]
    assert {"conflicts", "otherViolations", "penalty", "elapsedSeconds"} <= set(body["methods"][1]["metrics"])
    assert body["metricDefinitions"] and body["methods"][1]["description"]["whereAiUsed"]


def test_comparison_repeats_except_for_time(client):
    import_id = imported(client)
    numbers = []
    for _ in range(2):
        evaluation = client.post("/api/v1/evaluations", json={"importId": import_id, "seed": 3}).json()
        worker.run_one()
        methods = client.get(f"/api/v1/evaluations/{evaluation['evaluationId']}").json()["methods"]
        numbers.append([{k: v for k, v in m["metrics"].items() if k != "elapsedSeconds"} for m in methods])
    assert numbers[0] == numbers[1]


def test_wrong_ids_get_404(client):
    assert client.get("/api/v1/schedules/job_x").json()["error"]["code"] == "SCHEDULE_NOT_FOUND"
    assert client.get("/api/v1/evaluations/eval_x").json()["error"]["code"] == "EVALUATION_NOT_FOUND"
    assert client.post("/api/v1/schedules/job_x/cancel").status_code == 404


@pytest.mark.parametrize("path", [p for p in (TRIAL, MAIN) if p.exists()], ids=lambda p: p.name)
def test_provided_sets_are_clean_and_repeatable(client, path, monkeypatch):
    # local only: these files are not always on the machine
    monkeypatch.setattr(config, "MAX_UPLOAD_MB", 10)
    import_id = imported(client, path.read_bytes())
    runs = [finished(client, start(client, import_id).json()) for _ in range(2)]
    assert runs[0]["status"] == "completed"
    stats = runs[0]["result"]["stats"]
    assert stats["unscheduled"] == 0 and all(stats[f] == 0 for f in HARD)
    assert runs[0]["result"]["items"] == runs[1]["result"]["items"]


def test_job_queue_is_oldest_first(client):
    first = start(client, imported(client)).json()
    second = start(client, imported(client)).json()
    worker.run_one()
    with SessionLocal() as db:
        statuses = {j.public_id: j.status for j in db.scalars(select(Job))}
    assert statuses[first["jobId"]] == "completed" and statuses[second["jobId"]] == "queued"


def test_checker_agrees_with_the_stored_result(client):
    upload_body = upload(client, build()).json()
    job = start(client, upload_body["importId"]).json()
    result = finished(client, job)["result"]
    assert check(upload_body, result["items"])["stats"]["scheduled"] == result["stats"]["scheduled"]
