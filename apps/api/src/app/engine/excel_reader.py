"""Open an uploaded .xlsx safely and return its sheets. Used by the import service.

A file is checked as a real, reasonably sized Excel zip before any spreadsheet code parses it.
"""

import io
import zipfile

import openpyxl

MAX_UNZIPPED_MB = 100  # far above a real timetable file; stops a small zip that expands hugely


class UnreadableFile(Exception):
    """The file is not a workbook that can be opened."""


class FileTooLargeUnzipped(Exception):
    """The file expands past the safe size when unzipped."""


def check_zip(content: bytes) -> None:
    """Refuse anything that is not an Excel zip, or that expands too far, before parsing it."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            files = archive.infolist()
    except zipfile.BadZipFile as e:
        raise UnreadableFile from e
    if "xl/workbook.xml" not in {f.filename for f in files}:
        raise UnreadableFile
    if sum(f.file_size for f in files) > MAX_UNZIPPED_MB * 1024 * 1024:
        raise FileTooLargeUnzipped


def clean(value):
    """Trim text; a blank cell or blank text becomes None."""
    if isinstance(value, str):
        return value.strip() or None
    return value


def read_sheets(content: bytes) -> dict[str, tuple[list, list]]:
    """{sheet name: (header, [(excel row number, values)])}. Rows with nothing in them are dropped."""
    check_zip(content)
    try:
        book = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        sheets = {}
        for sheet in book.worksheets:
            rows = sheet.iter_rows(values_only=True)
            header = [clean(c) for c in next(rows, ())]
            body = []
            for number, values in enumerate(rows, start=2):
                cleaned = [clean(c) for c in values]
                if any(c is not None for c in cleaned):
                    body.append((number, cleaned))
            sheets[sheet.title.strip()] = (header, body)
        book.close()
    except (KeyError, ValueError, OSError, zipfile.BadZipFile) as e:
        raise UnreadableFile from e
    return sheets
