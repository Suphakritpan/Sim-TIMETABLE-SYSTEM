"""The frontend's schema refuses a whole response on one wrong field, and it refuses null in optional fields.

These tests write real failure-path responses to a folder (set SAMPLES_DIR) so they can also be run through
apiSchemas.js, and they check here that no optional field is ever null.
"""

import json
import os
from pathlib import Path

from workbooks import base, build, upload

from app import worker
from app.engine.checker import conflict

NULLABLE = {"practiceRoomType", "progress", "result"}


def nulls(value, path="") -> list[str]:
    """Every path in a response that holds null, apart from the fields the frontend allows."""
    found = []
    if isinstance(value, dict):
        for key, item in value.items():
            if item is None and key not in NULLABLE:
                found.append(f"{path}.{key}")
            found += nulls(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            found += nulls(item, f"{path}[{index}]")
    return found


def keep(name: str, body: dict) -> dict:
    if folder := os.environ.get("SAMPLES_DIR"):
        Path(folder, f"{name}.json").write_text(json.dumps(body, ensure_ascii=False, indent=1), encoding="utf-8")
    return body


def run(client, content, name):
    body = upload(client, content).json()
    job = client.post("/api/v1/schedules", json={"importId": body["importId"], "seed": 1}).json()
    worker.run_one()
    return keep(name, client.get(f"/api/v1/schedules/{job['jobId']}").json())


def test_invalid_import_has_no_null_fields(client):
    rows = base()
    del rows["ห้อง"]
    rows["ครู"].append(["T1", "ซ้ำ", None, 0])
    rows["กลุ่มเรียน"].append(["G9", "", None, 0])
    rows["คำขอพิเศษ"].append(["R2", None, "ไม่มีผู้ส่ง"])
    body = keep("import-invalid", upload(client, build(rows)).json())
    assert body["status"] == "invalid" and nulls(body) == []


def test_blank_optional_cells_are_left_out(client):
    rows = base()
    rows["ครู"][0][2] = None
    rows["ห้อง"][0][4] = None
    rows["กลุ่มเรียน"][0][2] = None
    rows["คำขอพิเศษ"][0][1] = None
    body = upload(client, build(rows)).json()
    assert body["status"] == "valid" and nulls(body) == []
    assert "dept" not in body["teachers"][0] and "sender" not in body["requests"][0]


def test_every_final_job_shape_has_no_null_fields(client):
    good = run(client, build(), "job-completed-small")
    assert good["status"] == "completed" and nulls(good) == []

    rows = base()
    rows["ครู"] = [[f"T{i}", f"ครู {i}", "ไอที", 8] for i in range(1, 11)]
    rows["เวลาไม่สะดวก"] = []
    rows["ห้อง"] = rows["ห้อง"][:1]
    rows["กลุ่มเรียน"] = [[f"G{i}", f"กลุ่ม {i}", "ไอที", 10] for i in range(1, 11)]
    rows["รายวิชา"] = [["C1", "วิชา", "3-0-3", "ไอที", ""]]
    rows["รายการสอน"] = [[f"S{i}", "C1", f"G{i}", f"T{i}"] for i in range(1, 11)]
    partial = run(client, build(rows), "job-partial")
    assert partial["status"] == "completed_partial" and nulls(partial) == []

    rows["รายการสอน"] += [[f"X{i}", "C1", f"G{i}", f"T{i}"] for i in range(1, 11)]
    rows["รายวิชา"] = [["C1", "วิชา", "1-0-1", "ไอที", ""], ["C2", "ยาว", "4-0-4", "ไอที", ""]]
    rows["รายการสอน"] = [[f"S{i}", "C2", f"G{i}", f"T{i}"] for i in range(1, 11)]
    infeasible = run(client, build(rows), "job-infeasible")
    assert infeasible["status"] == "infeasible" and nulls(infeasible) == []


def test_cancelled_and_failed_jobs(client, monkeypatch):
    body = upload(client, build()).json()
    job = client.post("/api/v1/schedules", json={"importId": body["importId"], "seed": 1}).json()
    cancelled = client.post(f"/api/v1/schedules/{job['jobId']}/cancel").json()
    keep("job-cancelled", client.get(f"/api/v1/schedules/{job['jobId']}").json())
    assert cancelled["status"] == "cancelled" and cancelled["result"] is None

    def boom(*_):
        raise RuntimeError("detail")

    monkeypatch.setitem(worker.HANDLERS, "schedule", boom)
    failed = client.post("/api/v1/schedules", json={"importId": body["importId"], "seed": 1}).json()
    worker.run_one()
    result = keep("job-failed", client.get(f"/api/v1/schedules/{failed['jobId']}").json())
    assert result["error"] == {"code": "INTERNAL_ERROR"} and nulls(result) == []


def test_conflicts_without_a_slot_leave_day_and_period_out():
    assert "day" not in conflict("ASSIGNMENT_DUPLICATED", ["S1"], "", 0, "ซ้ำ")
    assert "period" not in conflict("TEACHER_DAILY_LIMIT", ["S1"], "MON", 0, "เกิน")
