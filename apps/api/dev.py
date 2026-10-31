#!/usr/bin/env python3
"""The project's one command for everyday work. Same on Linux, macOS and Windows.

uv run dev.py up              start db + backend + worker (Ctrl+C stops all)
uv run dev.py migrate         bring the database to the newest migration
uv run dev.py health          is the running backend healthy?
uv run dev.py check unit      lint + unit tests
uv run dev.py check eval      the project's quality test (tools/eval.py)
uv run dev.py check all       all of the above
uv run dev.py logs            follow the database log
uv run dev.py backup          dump the database and uploaded files to backups/
"""

import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT


def load_env() -> None:
    """Copy KEY=value lines from .env into the environment (values already set win)."""
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        key, sep, value = line.partition("=")
        if sep and not key.strip().startswith("#"):
            os.environ.setdefault(key.strip(), value.strip())


def tool(name: str) -> str:
    """Full path of a program (finds npm.cmd on Windows), or stop with a clear message."""
    path = shutil.which(name)
    if path is None:
        sys.exit(f"dev: '{name}' is not installed or not on PATH")
    return path


def run(*cmd: str, cwd: Path = ROOT) -> None:
    """Run a command; stop dev.py with its exit code if it fails."""
    print("$", " ".join(cmd), flush=True)
    code = subprocess.call([tool(cmd[0]), *cmd[1:]], cwd=cwd)
    if code:
        sys.exit(code)


def db_up() -> None:
    run("docker", "compose", "up", "-d", "--wait", "db")


def migrate() -> None:
    db_up()
    run("uv", "run", "alembic", "upgrade", "head", cwd=BACKEND)


def start_parts() -> list[subprocess.Popen]:
    """Start backend and worker in the background."""
    return [
        start([tool("uv"), "run", "uvicorn", "app.main:app", "--reload", "--port", "8000"], BACKEND),
        start([tool("uv"), "run", "python", "-m", "app.worker"], BACKEND),
    ]


def up() -> None:
    migrate()
    procs = start_parts()
    print("\ndev: API on http://localhost:8000  (Ctrl+C to stop)\n", flush=True)

    def on_terminate(*_):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, on_terminate)  # a closed terminal or `kill` stops the parts too
    try:
        while all(p.poll() is None for p in procs):
            time.sleep(0.5)
        print("dev: one part stopped; stopping the rest")
    except KeyboardInterrupt:
        pass
    finally:
        for p in procs:
            stop(p)


def start(cmd: list[str], cwd: Path) -> subprocess.Popen:
    """Start a part in its own process group, so stop() can end it with all its children."""
    if os.name == "nt":
        return subprocess.Popen(cmd, cwd=cwd, creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    return subprocess.Popen(cmd, cwd=cwd, start_new_session=True)


def stop(p: subprocess.Popen) -> None:
    """End a part and its children (npm starts vite as a child, uv starts python)."""
    if p.poll() is not None:
        return
    if os.name == "nt":
        subprocess.call(["taskkill", "/F", "/T", "/PID", str(p.pid)], stdout=subprocess.DEVNULL)
    else:
        os.killpg(p.pid, signal.SIGTERM)
    try:
        p.wait(timeout=10)
    except subprocess.TimeoutExpired:
        if os.name != "nt":
            os.killpg(p.pid, signal.SIGKILL)


def health() -> None:
    try:
        with urllib.request.urlopen("http://localhost:8000/api/health", timeout=5) as r:
            print(r.read().decode())
    except Exception as e:
        sys.exit(f"dev: backend not healthy: {e}")


def check(what: str) -> None:
    if what in ("unit", "all"):
        db_up()  # the backend tests use the app_test database
        run("uv", "run", "ruff", "check", ".", cwd=BACKEND)
        run("uv", "run", "ruff", "format", "--check", ".", cwd=BACKEND)
        run("uv", "run", "pytest", "-q", cwd=BACKEND)
    if what in ("eval", "all"):
        if (ROOT / "tools" / "eval.py").exists():
            run("uv", "run", "python", str(ROOT / "tools" / "eval.py"), cwd=BACKEND)
        else:
            print("dev: this project has no tools/eval.py yet")
    if what not in ("unit", "eval", "all"):
        sys.exit("dev: check unit | eval | all")
    print("dev: check passed")


def backup() -> None:
    (ROOT / "backups").mkdir(exist_ok=True)
    out = ROOT / "backups" / f"app-{datetime.now():%Y%m%d-%H%M}.sql"
    with out.open("wb") as f:
        code = subprocess.call(
            [tool("docker"), "compose", "exec", "-T", "db", "pg_dump", "-U", "app", "app"], cwd=ROOT, stdout=f
        )
    if code:
        out.unlink()
        sys.exit(code)
    print(f"dev: saved {out.relative_to(ROOT)}")


def main() -> None:
    load_env()
    args = sys.argv[1:]
    commands = {
        "up": up,
        "migrate": migrate,
        "health": health,
        "check": lambda: check(args[1] if len(args) > 1 else "unit"),
        "logs": lambda: run("docker", "compose", "logs", "-f", "db"),
        "backup": backup,
    }
    if not args or args[0] not in commands:
        sys.exit(__doc__)
    commands[args[0]]()


if __name__ == "__main__":
    main()
