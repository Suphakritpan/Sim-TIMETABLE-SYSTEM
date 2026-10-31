# Timetable API

The backend for `apps/web`: FastAPI, PostgreSQL and a worker. The approved plan is `docs/SPEC.md` at the repository root.

## Run on your own machine
You need [uv](https://docs.astral.sh/uv/) and Docker (Docker Desktop on Windows).

```bash
cd apps/api
cp .env.example .env
uv run dev.py up
```

The API opens on `http://localhost:8000`, and `http://localhost:8000/api/health` shows whether it is up. The database runs in Docker on port 5434. `http://localhost:5173` (the frontend's dev address) is already allowed by CORS.

## Everyday commands
| command | does |
|---|---|
| `uv run dev.py check unit` | lint and tests; needs Docker running |
| `uv run dev.py migrate` | bring the database to the newest migration |
| `uv run dev.py backup` | dump the database to `backups/` |

Windows: use `copy .env.example .env` in place of `cp`. The other commands are the same.

Other files here: `docs/DECISIONS.md` (decisions and why) and `docs/SECURITY.md` (risks and data levels).
