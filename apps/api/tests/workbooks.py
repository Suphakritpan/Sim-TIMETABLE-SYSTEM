"""A small made-up workbook for tests, built in memory. Tests change `base()` to plant problems."""

import io

import openpyxl

from app.engine.domain import SHEETS


def base() -> dict:
    """The rows of a valid college, by sheet name."""
    return {
        "ครู": [["T1", "ครูสมมติ หนึ่ง", "ไอที", 6], ["T2", "ครูสมมติ สอง", "ไอที", 6]],
        "เวลาไม่สะดวก": [["T1", "อังคาร", 8, 8]],
        "ห้อง": [
            ["LR-1", "ห้องบรรยาย 1", "ห้องบรรยาย", 45, "อาคาร 1"],
            ["COM-1", "ห้องคอม 1", "ห้องคอมพิวเตอร์", 40, "อาคาร 1"],
        ],
        "กลุ่มเรียน": [["G1", "กลุ่มหนึ่ง", "ไอที", 30], ["G2", "กลุ่มสอง", "ไอที", 10]],
        "รายวิชา": [["C1", "วิชาหนึ่ง", "1-2-2", "ไอที", "ห้องคอมพิวเตอร์"], ["C2", "วิชาสอง", "2-0-2", "ไอที", ""]],
        "รายการสอน": [["S1", "C1", "G1", "T1"], ["S2", "C2", "G1, G2", "T2"]],
        "คำขอพิเศษ": [["R1", "ฝ่ายวิชาการ", "ครูสมมติ หนึ่ง ขอไม่สอนคาบแรก"]],
    }


def build(rows: dict | None = None) -> bytes:
    """An .xlsx file from {sheet name: rows}. A sheet left out of `rows` is left out of the file."""
    rows = base() if rows is None else rows
    book = openpyxl.Workbook()
    book.remove(book.active)
    for name, body in rows.items():
        sheet = book.create_sheet(name)
        sheet.append(SHEETS.get(name, ["a"]))
        for row in body:
            sheet.append(row)
    out = io.BytesIO()
    book.save(out)
    return out.getvalue()


def upload(client, content: bytes, filename: str = "data.xlsx"):
    return client.post("/api/v1/imports", files={"file": (filename, content)})
