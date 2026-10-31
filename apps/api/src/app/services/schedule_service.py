"""Pages 3 and 5: start a job, run it in the worker, and shape its result. Used by routes/schedules.py and worker.py."""

import secrets
import time

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import config
from app.audit import audit
from app.engine.checker import REQUEST_PENALTY, check
from app.engine.exports import to_excel, to_pdf
from app.engine.model import Limits, build_sessions
from app.engine.precheck import precheck
from app.engine.requests import compile_limits, outcome, params_problem, soft_misses
from app.engine.solver import MAX_SEARCH_STEPS, solve_baseline, solve_team
from app.errors import ApiError
from app.models import Dataset, Job
from app.repositories import find_dataset, find_job
from app.services.import_service import ID_BYTES

ACTIVE = ("queued", "running")
FINAL_HARD_FIELDS = ("teacherConflicts", "roomConflicts", "groupConflicts", "otherViolations")
EXPLANATION = (
    "จัดบล็อกที่ยากที่สุดก่อน คือบล็อกที่มีเวลาและห้องให้เลือกน้อย คาบติดกันยาว และเรียนรวมหลายกลุ่ม "
    "เพราะถ้าเก็บไว้ท้ายจะไม่เหลือที่ลง จากนั้นย้ายบล็อกอื่นเพื่อวางส่วนที่เหลือ แล้วค้นหาตำแหน่งที่คะแนนโทษน้อยลง"
)
BASELINE_EXPLANATION = "วางทีละรายการตามลำดับในไฟล์ ลงช่องแรกที่ว่าง ไม่ย้ายรายการที่วางแล้ว"


def new_job(db: Session, import_id: str, kind: str, prefix: str, params: dict) -> Job:
    """Queue a job, after checking its import and the limits (B18, B24). Raises ApiError."""
    dataset = find_dataset(db, import_id)
    if dataset.status != "valid":
        raise ApiError(409, "IMPORT_NOT_VALID", "this import has problems")
    problems = [(r["id"], params_problem(r, dataset.data)) for r in params["requests"]]
    details = [{"field": f"requests.{i}", "reason": why} for i, why in problems if why]
    if details:
        raise ApiError(422, "VALIDATION_FAILED", "a request cannot be used", details)
    running = select(func.count()).select_from(Job).where(Job.dataset_id == dataset.id, Job.status.in_(ACTIVE))
    if db.scalar(running):
        raise ApiError(409, "JOB_ALREADY_RUNNING", "a job for this import is still running")
    if db.scalar(select(func.count()).select_from(Job).where(Job.status == "queued")) >= config.MAX_QUEUED_JOBS:
        raise ApiError(429, "QUEUE_FULL", "too many jobs are waiting")
    job = Job(public_id=prefix + secrets.token_hex(ID_BYTES), dataset_id=dataset.id, kind=kind, params=params)
    db.add(job)
    db.flush()
    audit(db, f"start_{kind}", f"job:{job.public_id}", seed=params["seed"])
    db.commit()
    return job


def start_schedule(db: Session, import_id: str, seed: int | None, method: str, requests: list[dict]) -> dict:
    """Start a timetable. With no seed the system picks one and returns it, so the run can be repeated."""
    chosen = secrets.randbelow(config.MAX_SEED) if seed is None else seed
    params = {"seed": chosen, "method": method, "requests": requests}
    job = new_job(db, import_id, "schedule", "job_", params)
    return {"jobId": job.public_id, "status": job.status, "seed": chosen, "method": method}


def schedule_response(job: Job) -> dict:
    """A job as the page reads it (`jobSchema`). The page's schema refuses null here, so empty fields are left out."""
    body = {
        "jobId": job.public_id,
        "status": job.status,
        "progress": job.progress,
        "seed": job.params["seed"],
        "method": job.params["method"],
        "result": job.result,
    }
    if job.stage:
        body["stage"] = job.stage
    if job.error:
        body["error"] = {"code": job.error}
    return body


def get_schedule(db: Session, job_id: str) -> dict:
    return schedule_response(find_job(db, job_id, "schedule", "SCHEDULE_NOT_FOUND"))


def cancel_schedule(db: Session, job_id: str) -> dict:
    """Ask a job to stop. Safe to repeat: a finished job just reports its final status."""
    job = find_job(db, job_id, "schedule", "SCHEDULE_NOT_FOUND", lock=True)
    if job.status == "queued":
        job.status = "cancelled"
    elif job.status == "running":
        job.cancel_requested = True
    db.commit()
    return schedule_response(job)


def unscheduled(left: list) -> list[dict]:
    """One row per teaching item with an unplaced block, with the plain reason."""
    rows = {}
    for s in left:
        code = "NO_SUITABLE_ROOM" if not s.rooms else "NO_FREE_SLOT"
        text = "ไม่มีห้องที่เหมาะสม" if not s.rooms else f"ไม่เหลือช่องที่ครู กลุ่ม และห้องว่างพร้อมกัน {s.length} คาบ"
        rows.setdefault(s.item, {"assignmentId": s.item, "reasonCode": code, "message": text})
    return list(rows.values())


def run_method(data: dict, method: str, seed: int, limits: Limits, progress) -> tuple:
    """Run one method. Returns (items, sessions not placed, seconds)."""
    sessions = build_sessions(data, limits)
    started = time.perf_counter()
    if method == "baseline":
        items, left = solve_baseline(data, sessions, limits)
    else:
        items, left = solve_team(data, sessions, limits, seed, progress.report, progress.cancelled)
    return items, left, time.perf_counter() - started


def build_result(data: dict, run: tuple, explanation: str, requests: list, limits: Limits, reasons=None) -> dict:
    """Everything the page shows about one timetable. All numbers come from the checker (B12)."""
    items, left, seconds = run
    report = check(data, items, seconds, soft_misses(items, limits))
    return {
        "items": items,
        "conflicts": report["conflicts"],
        "unscheduled": unscheduled(left),
        "stats": report["stats"],
        "explanation": explanation,
        "infeasibleReasons": reasons or [],
        "requestResults": [outcome(r, items, data) for r in requests],
    }


def run_schedule(data: dict, params: dict, progress) -> tuple[str, dict]:
    """The `schedule` job. Impossible data ends with reasons instead of a long search (B15)."""
    requests = params["requests"]
    limits = compile_limits(requests, data)
    sessions = build_sessions(data, limits)
    reasons = precheck(data, sessions, limits)
    if reasons:
        return "infeasible", build_result(data, ([], sessions, 0.0), "", requests, limits, reasons)
    method = params["method"]
    run = run_method(data, method, params["seed"], limits, progress)
    result = build_result(data, run, BASELINE_EXPLANATION if method == "baseline" else EXPLANATION, requests, limits)
    clean = not run[1] and not any(result["stats"][f] for f in FINAL_HARD_FIELDS)
    return ("completed" if clean else "completed_partial"), result


METRICS = [
    {"key": "unscheduled", "label": "รายการที่จัดไม่ได้", "higherIsBetter": False},
    {"key": "conflicts", "label": "จุดที่ชน", "higherIsBetter": False},
    {"key": "otherViolations", "label": "ผิดกฎข้ออื่น", "higherIsBetter": False},
    {"key": "penalty", "label": "คะแนนโทษ", "higherIsBetter": False},
    {"key": "elapsedSeconds", "label": "เวลาที่ใช้ (วินาที)", "higherIsBetter": False},
]


def method_row(method: str, stats: dict, description: dict) -> dict:
    metrics = {
        "unscheduled": stats["unscheduled"],
        "conflicts": stats["teacherConflicts"] + stats["roomConflicts"] + stats["groupConflicts"],
        "otherViolations": stats["otherViolations"],
        "penalty": stats["penalty"],
        "elapsedSeconds": stats["elapsedSeconds"],
    }
    return {"method": method, "metrics": metrics, "description": description}


def run_compare(data: dict, params: dict, progress) -> tuple[str, dict]:
    """The `compare` job: both methods on the same data and seed, measured live by the checker (B22)."""
    limits = compile_limits(params["requests"], data)
    seed = params["seed"]
    rows = []
    for method, text in (("baseline", BASELINE_EXPLANATION), ("team", EXPLANATION)):
        items, _left, seconds = run_method(data, method, seed, limits, progress)
        stats = check(data, items, seconds, soft_misses(items, limits))["stats"]
        rows.append(method_row(method, stats, describe(method, text)))
    return "completed", {"methods": rows, "metricDefinitions": METRICS}


def describe(method: str, text: str) -> dict:
    """Page 5's note on a method, from the code's real settings."""
    if method == "baseline":
        return {"method": text, "whereAiUsed": "ไม่ใช้ AI", "settings": "ไม่มี"}
    return {
        "method": text,
        "whereAiUsed": "ใช้การค้นหาแบบสุ่มเฉพาะที่ (local search) ซึ่งเป็นเทคนิค AI ในการปรับตารางให้คะแนนโทษน้อยลง",
        "settings": f"seed กำหนดผล, ค้นหาไม่เกิน {MAX_SEARCH_STEPS:,} รอบ, คำขอที่พลาดคิดโทษ {REQUEST_PENALTY} ต่อคาบ",
    }


def start_evaluation(db: Session, import_id: str, seed: int | None, requests: list[dict]) -> dict:
    chosen = secrets.randbelow(config.MAX_SEED) if seed is None else seed
    params = {"seed": chosen, "method": "compare", "requests": requests}
    job = new_job(db, import_id, "compare", "eval_", params)
    return {"evaluationId": job.public_id, "status": job.status, "seed": chosen}


def get_evaluation(db: Session, evaluation_id: str) -> dict:
    """The comparison. `methods` appears once it is done (`evaluationSchema`); until then, only its status."""
    job = find_job(db, evaluation_id, "compare", "EVALUATION_NOT_FOUND")
    body = {
        "evaluationId": job.public_id,
        "status": job.status,
        "progress": job.progress,
        "seed": job.params["seed"],
        "isSimulated": False,
    }
    if job.stage:
        body["stage"] = job.stage
    if job.error:
        body["error"] = {"code": job.error}
    return {**body, **(job.result or {})}


EXPORTS = {
    "xlsx": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", lambda items, _data: to_excel(items)),
    "pdf": ("application/pdf", to_pdf),
}


def export(db: Session, job_id: str, file_format: str) -> tuple[bytes, str, str]:
    """(file, media type, file name) of a finished timetable. Raises ApiError."""
    if file_format not in EXPORTS:
        raise ApiError(400, "EXPORT_FORMAT_UNSUPPORTED", "format must be pdf or xlsx")
    job = find_job(db, job_id, "schedule", "SCHEDULE_NOT_FOUND")
    if job.status not in ("completed", "completed_partial"):
        raise ApiError(409, "SCHEDULE_NOT_READY", "this timetable is not finished")
    media_type, write = EXPORTS[file_format]
    content = write(job.result["items"], db.get(Dataset, job.dataset_id).data)
    audit(db, "export", f"job:{job.public_id}", format=file_format)
    db.commit()
    return content, media_type, f"timetable-seed-{job.params['seed']}.{file_format}"
