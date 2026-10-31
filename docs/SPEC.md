# ระบบจัดตารางสอนอัตโนมัติ (Automatic Timetable System): spec

Status: approved 2026-10-31. It replaces the version on GitHub at `anonmianwe/test-for-AI-skills-competition@main`.

Order of authority: the official brief, then this spec, then `apps/web/src/schemas/apiSchemas.js` as it stood at `7f1e46b` for field names. DEC-002 on the `comms` branch records the route decision.

What changed in this version:
- Deadline: today, 2026-10-31, 16:30. The build order is cut to fit about 3 hours.
- No login and no cookies. The site is public.
- `apps/web` on Vercel is the only frontend, owned by Pan. Backend work never touches it.
- The backend, worker and database run on the user's VPS behind Caddy. The VPS and domain are ready.
- The backend lives in `apps/api/` in `Suphakritpan/Sim-TIMETABLE-SYSTEM`, one public repository.
- The backend builds `/api/v1/*` (DEC-002). Pan moves the frontend back to these routes.
- Progress is by polling `GET /api/v1/schedules/{id}`. SSE is left out of version 1.
- The 7 sheets are stored as JSON on one `dataset` row (user's choice).

Sources that are not in git: `~/Desktop/full_test_data/` (the 4 competition files; the design target for the backend and database) and `extra.md` (agent brief, in `~/test-for-AI-skills-competition/`). A copy of `full_test_data/` sits untracked in this repo's root and must not be committed until Q2 is answered. Thai sheet names, column names, day names and class names are matched character by character, so copy them from those files.

## 1. Goal
A college builds its timetable by hand. It takes a long time, and teachers end up double-booked.
This site takes one uploaded Excel file and produces a clash-free timetable for every group, teacher and room.

This build follows the competition's timing: all 6 pages to the brief, submitted by 16:30 on Day 1, with no website or code changes after that.
Success means every item in `extra.md` section 10 passes, including on a data file the site has never seen.

## 2. People
| role | who | about how many | main tasks |
|---|---|---|---|
| visitor | competition judges and the team, with no account | a few at once | upload and check data; confirm requests; run the timetable; read it; compare methods; download PDF and Excel |

There is one kind of user and no login. The template roles (`admin`, `staff`, `teacher`, `student`) are dropped.

Each browser tab has its own workspace, so visitors cannot overwrite each other's data. The page keeps an `importId` and `jobId`, and these long random IDs are the only way to reach that data. No route lists other people's imports or jobs.

| part | owner | folder |
|---|---|---|
| Solver, API, worker, database, VPS | the user | `apps/api/`, `deploy/` |
| Six pages, Vercel, sample files | Pan | `apps/web/`, `scripts/generate_sample_data.py` |
| API contract | both | this spec's section 6, `apps/web/src/schemas/apiSchemas.js`, `docs/API-CONTRACT.md`; changes go through the `comms` branch |

## 3. Data
| table | holds | key fields | relations | level | who sees and changes it | keep for | comes from |
|---|---|---|---|---|---|---|---|
| `dataset` | one uploaded file, parsed | `public_id`, `status` (valid, invalid), `filename`, `summary`, `issues` (JSON), `data` (the 7 sheets as JSON) | | Internal (staff names, see Q2) | anyone holding the ID | 7 days | Excel upload |
| `schedule_run` | one finished timetable | `method` (baseline, team), `seed`, `sessions` (JSON), `report` (checker output), `seconds`, `constraints` (requests used) | `dataset_id`, `job_id` | Internal | anyone holding the job ID | with its dataset | solver |
| `job` (template, changed) | a solver or comparison job | adds `public_id`, `dataset_id`, `stage`, `progress`, `cancel_requested`; `status` grows to hold `completed_partial`, `infeasible` and `cancelled`; drops `created_by` | `dataset_id` | Internal | anyone holding the ID | with its dataset | site |

The 7 sheets stay as JSON on `dataset`: the solver and the pages always read a whole dataset, so separate tables would add work and no feature needs them.

The uploaded file is deleted once parsed. Only the parsed JSON is kept, which leaves less data on the server.

Confirmed requests live in the browser and are sent with each run, as `apps/web` already does. They are saved in `schedule_run.constraints`, so a run can be explained later. The planned `special_request` table is not needed.

Template tables kept: `audit_log` (loses `user_id`), `job`, `event`. Dropped: `user_account`, `document`.

Existing data to bring in: none. The workbooks are test inputs.

Sizes measured from `full_test_data` (the backend must not assume any of them):

| | trial | main | large (Pan's sample, about 600 items) |
|---|---|---|---|
| teachers, rooms, groups | 8, 5, 4 | 21, 12, 12 | not measured |
| teaching items | 29 | 83 | about 600 |
| sessions to place (one theory and/or one practical block per item) | 45 | 128 | about 900, estimated |
| combined classes | 4 | 10 | not measured |
| largest block | 4 | 4 | not measured |
| busiest group, of 38 usable periods | 29 | 32 | not measured |
| room use, by type | lecture 52 of 114, computer 48 of 76 | lecture 136 of 228, computer 108 of 152, electrical 53 of 76 | not measured |

## 4. Business rules
| id | rule | what happens when it is broken | feature |
|---|---|---|---|
| B1 | A teacher is in one place per period | counted as a teacher clash | F3 |
| B2 | A room holds one session per period | counted as a room clash | F3 |
| B3 | A group attends one session per period; a combined class needs all its groups free | counted as a group clash | F3 |
| B4 | Every `รายการสอน` row is scheduled, no block missing or duplicated | shown in "scheduled X of Y", with the missing blocks listed | F3 |
| B5 | A block is one run of consecutive periods, all morning or all afternoon | counted under other rule violations | F3 |
| B6 | Theory goes in `ห้องบรรยาย`; practical goes in the type named by `ห้องที่ใช้เรียนปฏิบัติ` | counted under other rule violations | F3 |
| B7 | Room capacity covers all students attending, summed for combined classes | counted under other rule violations | F3 |
| B8 | Nothing on Wednesday periods 7–8 | counted under other rule violations | F3 |
| B9 | Nothing in a teacher's `เวลาไม่สะดวก` slot | counted under other rule violations | F3 |
| B10 | A teacher's periods per day stay within their maximum | counted under other rule violations | F3 |
| B11 | Soft penalties: ก 2 per group gap, ข 1 per teacher gap, ค 3 per period over 6, ง 2 per teaching item with theory and practical on one day, จ 1 per period that misses an "if possible" request | added to the total penalty | F3, F5 |
| B12 | One checker produces every number for solver, baseline and tests. The frontend computes page 6's room, teacher and gap figures from `items`, so those must agree | a test compares them with the frontend's formulas | F3, F6, F7 |
| B13 | Lunch is not a gap: periods 4 and 5 count as adjacent. This is our reading and the site says so | | F3 |
| B14 | Same data, same confirmed requests and same seed give the same timetable: seeded random, fixed iteration limit, stable order, one thread, no clock in any decision | a test runs twice and compares | F3, F10 |
| B15 | The site never hangs: the solver runs in the worker with a fixed limit, and impossible data ends with a stated reason | the job ends and reports the reason | F3, F10 |
| B16 | Nothing is hardcoded: IDs, names, counts and room types come from the file | a test runs on data with new room types | F2, F8 |
| B17 | The upload lists all errors at once, each with sheet, row, what is wrong and how to fix it | the file is `invalid` | F2 |
| B18 | A run needs a `valid` import; the page's confirm button comes first | 409 `IMPORT_NOT_VALID`; the page disables the button with the reason | F2, F3 |
| B19 | Requests are `ต้องทำตาม` (`must`), `ทำถ้าทำได้` (`best_effort`) or `ไม่ต้องทำอะไรเพิ่ม` (`no_action`). A must-do request that cannot fit (more periods than its allowed days hold) becomes `ทำถ้าทำได้` with the reason shown | reported as partly met on page 6 | F5 |
| B20 | Only confirmed requests affect a run; the run page says how many are unconfirmed | run proceeds with the warning shown | F5 |
| B21 | The Excel export matches section 8 of `extra.md` exactly | a test reads the file back | F7 |
| B22 | Comparison numbers are computed live, never stored in the page | a test changes the data and sees them change | F6 |
| B23 | Bad data is not an API error: a readable file with wrong data returns 201 with `status: "invalid"` and `issues` | a test checks the status code | F2 |
| B24 | One import runs one job at a time, and the queue holds 20 jobs | 409 `JOB_ALREADY_RUNNING`, or 429 `QUEUE_FULL`, with a friendly message | F3, F6 |
| B25 | Public routes are limited per visitor: upload 10 a minute, jobs 10 a minute, exports 30 a minute, reading requests 120 a minute | 429 `RATE_LIMITED` with a friendly message | F1 |
| B26 | Only the origins in `ALLOWED_ORIGINS` may call the API, and production refuses to start with `*` | the browser blocks the call | F1 |

Reading to confirm (Q5): ง counts per teaching item, because one subject can be taught to several groups on purpose.

## 5. Pages
All pages are public and live in `apps/web`. They exist today on mock data, and Pan connects them to the real API.

| URL | purpose | main action |
|---|---|---|
| `/` | page 1: upload, check, confirm; blank template and sample files | confirm data |
| `/requests` | page 2: each request beside its reading, edit, add | confirm requests |
| `/generate` | page 3: seed, run, progress, cancel, results, ordering note | `จัดตาราง` |
| `/timetable` | page 4: weekly grid by group, teacher or room, with search | search |
| `/evaluation` | page 5: baseline against team method, method note | compare |
| `/summary` | page 6: decision numbers, request results, downloads | download Excel |

The grid, search and page 6 figures are built in the browser from `GET /api/v1/imports/{id}` and the run result, so they need no routes of their own. After a refresh the page reloads its data by `importId` and `jobId`, kept in `sessionStorage` by Pan.

## 6. API
Base path `/api/v1`, public, JSON, no cookies. The exact shapes are in `apps/web/src/schemas/apiSchemas.js` at `7f1e46b`, with the changes in section 8a, because the frontend rejects anything that does not match. Where `docs/API-CONTRACT.md` section 2 disagrees, the schema wins.

| method | path | does | feature |
|---|---|---|---|
| GET | `/api/health` | health, including the database | F1 |
| POST | `/api/v1/imports` | upload a file, return summary and all issues | F2 |
| GET | `/api/v1/imports/{id}` | one import, with periods, teachers, rooms, groups, courses, assignments and requests | F2 |
| POST | `/api/v1/requests/interpret` | read one Thai request by rules | F5 |
| POST | `/api/v1/schedules` | start a solver job from seed, method and confirmed requests | F3 |
| GET | `/api/v1/schedules/{id}` | status, stage, progress and result; this is the polling route | F3 |
| POST | `/api/v1/schedules/{id}/cancel` | ask the job to stop; safe to send twice | F3 |
| POST | `/api/v1/evaluations` | start a comparison job | F6 |
| GET | `/api/v1/evaluations/{id}` | comparison status and both methods' numbers | F6 |
| GET | `/api/v1/schedules/{id}/export?format=pdf\|xlsx` | downloads | F7 |

Rules for every route:
- Errors use `{ "error": { "code", "message", "details", "requestId" } }`.
- Days are `MON` to `FRI` in the API, and Thai day names only in the Excel export.
- IDs are random strings such as `imp_` or `job_` plus 128 bits. A wrong ID gets 404.
- Uploads are `.xlsx` only, up to 10 MB, limited at Caddy and in the app. The app checks the file's real content, not just its name, and rejects files that expand too large when unzipped.
- CORS allows only `ALLOWED_ORIGINS`, including the local dev origin in dev, with methods `GET`, `POST` and `OPTIONS`, header `Content-Type`, no credentials, `max_age` 600, and `Content-Disposition` exposed so the page can read download names.
- `requestResults[].reason` is always a string, never null, or the frontend rejects the run.
- `GET /api/v1/imports/{id}` and `GET /api/v1/schedules/{id}` keep working for 7 days, so a refreshed page can reload by ID.
- Logs hold a request ID, never file contents, teacher names or keys.

Blank template and sample files are static files in `apps/web/public/samples/`, so they need no route.

## 7. Background jobs
| job | started by | input | result | progress shown |
|---|---|---|---|---|
| `schedule` | visitor on `/generate` | import, confirmed requests, seed | `schedule_run` | stage, and percent where it can be measured; cancel stops it within about a second |
| `compare` | visitor on `/evaluation` | import, confirmed requests, seed | 2 `schedule_run` rows | status |

The worker runs one job at a time, oldest first, so a visitor may see `queued` while another job finishes. The queue holds 20 jobs at most (B24). When the worker starts, any job left `running` is marked failed, so a restart cannot leave a page waiting forever.

Job statuses: `queued`, `running`, `completed`, `completed_partial`, `infeasible`, `failed`, `cancelled`. Stages: `QUEUED`, `VALIDATING`, `ASSIGNING_SLOTS`, `RESOLVING_CONFLICTS`, `FINALIZING`.

Progress reaches the page by polling `GET /api/v1/schedules/{id}`. `progress` is 0 to 1, or null when it cannot be measured; it is never made up.

Each job also has a hard safety limit on time, and the worker has a memory limit in compose. The time limit only ends a stuck job as `failed` with a reason. It never affects a normal run, so B14 still holds.

## 8. Connections
| system or code | direction | what | status |
|---|---|---|---|
| `~/test-for-AI-skills-competition/backend` | reuse | the web-kit template: FastAPI, SQLAlchemy, Alembic, worker, jobs, audit | exists, copied into `apps/api/` by F1 |
| `~/Desktop/timetable-light` | reference | the user's earlier importer and solver (`engine/importer`, `engine/solver`, `engine/timetable_core`). Read it when F2 and F3 start, as the preferred reference. Its input format may differ, so `full_test_data` stays the target | not read yet |
| openpyxl | reuse | read uploads, write Excel | in the template |
| WeasyPrint with the bundled Sarabun font | new | Thai PDF timetable | to add; check Thai shaping early |
| `apps/web` | connect | calls the API from the browser with `VITE_DATA_MODE=api` | Pan; on mock data |
| Vercel | deploy | `apps/web`, production from `main` | Pan |
| Own VPS | deploy | docker compose: Caddy with HTTPS, API, worker, database; details in `docs/DEPLOYMENT.md` section 3 | VPS and domain ready |
| Free language AI (for example Qwen or DeepSeek) | out, optional | reads requests first, with rules and the form as the fallback; the key stays on the backend, and full teacher names are replaced by IDs before sending | blocked by Q4 |

### 8a. Requests to Pan, sent through `comms`
| # | request | why |
|---|---|---|
| 1 | Move `services`, `schemas` and `mocks` back to `/api/v1/*` (DEC-002) | the backend builds only these routes |
| 2 | Add `infeasible` to `jobSchema` and `JOB_TERMINAL_STATUSES` | impossible data must show a reason |
| 3 | Make `evaluationService.run` start a job and follow it through `GET /api/v1/evaluations/{id}` | a large comparison will pass the 15 s timeout |
| 4 | Add messages for `RATE_LIMITED`, `QUEUE_FULL` and `JOB_ALREADY_RUNNING` | new error codes |
| 5 | Keep `importId` and `jobId` in `sessionStorage`, and reload by ID on refresh | the backend holds no shared "latest" |
| 6 | Add a CSP to `vercel.json`, and set `VITE_API_BASE_URL` on Vercel once the URL exists | A6; `env.js` stops at start without it |
| 7 | Correct the `API-CONTRACT.md` section 2.3 example: that teacher is `TELEC06`, not `TIT01` | the wrong ID would mislead whoever writes the rules |

### 8b. Replying to `REQUEST-TO-BACKEND.md` and `REQUEST-TO-BACKEND-2.md`
Everything sent back must come from real code or real runs, with no passwords, keys or `.env` values. Replies go on the `comms` branch as `friend-ai`.

| part of the request | when |
|---|---|
| Real `openapi.json`, run instructions (R1) | after F1 |
| Backend URL (R2), `curl` results | after F9 |
| Real sample responses, code catalog (R4) | as F2 to F7 finish |
| Method description (R11), D3 | after F10; method: hardest sessions first, then seeded local search |

## 9. Features
Build order: F1, F9, F2, F3, F7, F6, F10, F5, F11. F4 and F8 are Pan's work. Feature numbers are IDs, not the order. Page scores set the order: page 3 is 25 points, page 4 is 23 and depends on real results, and page 5 is 16. Status: todo | doing | done | blocked (<open question>).

| until | backend work |
|---|---|
| 14:10 | F1, with real `openapi.json` sent to Pan |
| 14:25 | F9: the bare API online over HTTPS |
| 14:45 | F2 |
| 15:15 | F3 |
| 15:30 | F7 Excel, then F6 |
| 15:45 | F10, then F5 |
| 16:00 | rehearse like a judge; new features stop at 16:00 |
| 16:30 | submit, with the git tag `submission`, the source link, the 1-page guide and the local run steps |

These times are a target, not a measurement. If time runs short, cut in this order: F11, PDF, explanations, F5's rules for unusual wording. Never cut the 10 rules, same seed same result, the Excel format, or complete import checks.

### F1: Public API base (done)
- **For:** a visitor wants to open the site with no login, so that they can test the pages one by one.
- **Needs:** copy `backend/`, `dev.py`, `compose.yaml`, `.env.example`, `CONTRIBUTING.md` and `docs/SECURITY.md`, `docs/DECISIONS.md` from `~/test-for-AI-skills-competition` into `apps/api/`, leaving out `.env`, `private/`, `files/`, `frontend/`, `extra.md` and `full_test_data/`; remove the personal email from `pyproject.toml`; remove login, roles, session cookies and the documents demo; migration dropping `user_account`, `document` and `audit_log.user_id`; `/api/v1` base with the error shape, CORS and rate limits per IP; bundle the Sarabun font; root `.gitignore` covering `.env`, `.venv`, `__pycache__` and `full_test_data/`. **After:** nothing.
- **Acceptance:**
  - [ ] When any `/api/v1` route is called with no cookie, then it works without login.
  - [ ] When a response is sent, then it has no `Set-Cookie` header.
  - [ ] When an origin outside `ALLOWED_ORIGINS` calls, then no CORS header is returned (B26).
  - [ ] When production starts with `*` or no origins in `ALLOWED_ORIGINS`, then the app refuses to start.
  - [ ] When a limit is passed, then the route gets 429 `RATE_LIMITED` and the page shows a friendly message (B25).
  - [ ] When a caller fakes `X-Forwarded-For` from outside Caddy, then it cannot escape the rate limit.
  - [ ] When a download response is read across origins, then `Content-Disposition` is exposed.
  - [ ] When a route fails, then the answer uses the error shape and shows no internal details.
  - [ ] When `dev.py check unit` runs, then it covers `apps/api`.
  - [ ] When the frontend's dev origin calls the local API, then CORS allows it without a code change.
  - [ ] A scan of the files to be pushed finds no `.env`, secret or personal email.
- **Standards:** A5, A6, A7, O1, O2, R3, M2; A1 to A4 no longer apply (section 10).

### F9: Online deployment (todo)
- **For:** a visitor wants a link that works, so that they can test from anywhere on computer or phone.
- **Needs:** production Docker files with pinned image versions, non-root users and `.dockerignore`; `compose.prod.yaml` with `restart: unless-stopped`, health checks and `depends_on` waiting for healthy services; Caddy with HTTPS, HSTS, an upload size limit and no `Server` header; firewall for ports 80, 443 and SSH, with SSH keys only; nightly `pg_dump`; the Sarabun font in the image; a repeatable deploy command. Vercel settings are Pan's. SSH access stays with the user, never in chat or git. **After:** F1.
- **Acceptance:**
  - [ ] When `/api/health` is called over HTTPS from outside, then it answers, and a preflight from the Vercel origin passes.
  - [ ] When the server restarts, then the database and the stack come back by themselves.
  - [ ] When a port other than 80, 443 and SSH is tried from outside, then it is closed.
  - [ ] When required settings are missing, then the app stops at start with a clear message.
  - [ ] When a clean machine runs the documented steps, then the stack starts, and these steps are the local fallback for judges.
- **Standards:** A6, O2, O4, R2, X2.

### F2: Upload and check data (done)
- **For:** a visitor wants to upload Excel and see every problem at once, so that they can fix the file and confirm it.
- **Needs:** read `timetable-light` first; `dataset`, import routes; validation list from `extra.md` page 1. **After:** F1.
- **Acceptance:**
  - [ ] When the trial shape is uploaded, then the summary shows counts such as `ครู 8 คน, ห้อง 5 ห้อง, กลุ่มเรียน 4 กลุ่ม, รายการสอน 29 รายการ`.
  - [ ] When a file has every planted error type at once, then all are listed with sheet, row, problem and fix.
  - [ ] When a file has errors, then it returns 201 with `invalid` (B23), and a run on it gets 409 (B18).
  - [ ] When a file is not real Excel or is over 10 MB, then it gets a friendly 4xx, not a 500.
  - [ ] When a small `.xlsx` expands to a huge size when unzipped, then it is rejected before it is parsed.
  - [ ] When a file adds a new room type, then it is accepted and used (B16).
  - [ ] When a dataset is over 7 days old, then the worker's cleanup deletes it with its jobs and runs (D5).
  - [ ] When a wrong import ID is used, then it gets 404.
  - [ ] When Pan's 3 sample files and the trial and main sets are uploaded, then all are `valid` and their summaries are correct.
  - [ ] When an import finishes, then the uploaded file is gone from disk.
  - [ ] When the response is checked against `importSchema`, then it passes.
- **Standards:** A7, A8, D1 (list every new table in `docs/SECURITY.md`), D2 (audit upload), D5, U1, U4, U11; R1 by keeping parsing under 2 s at 600 items.

### F3: Rule checker and first timetable (todo)
- **For:** a visitor wants to press `จัดตาราง` and see honest results, so that they can trust the timetable.
- **Needs:** read `timetable-light` first; `schedule_run`, `job` change by migration, schedule routes, worker job. The checker comes first and is the only source of numbers. Two methods share it: baseline (first free slot, file order) and team v1 (hardest sessions first). **After:** F2.
- **Acceptance:**
  - [ ] When a hand-made timetable breaks each of B1–B10 and each soft rule once, then the checker reports exactly those counts.
  - [ ] When a group has periods 4 and 5 with lunch between, then no gap is counted, and the page states this reading (B13).
  - [ ] When a run finishes, then `stats` holds scheduled X of Y, teacher, room and group clashes, other violations, penalty and seconds.
  - [ ] When the same seed runs twice, then the sessions are identical (B14).
  - [ ] When cancel is pressed during a run, then the job ends `cancelled`, and a new run works.
  - [ ] When cancel is sent twice, then both answers succeed.
  - [ ] When data has more periods than free time, then the run ends `infeasible` with a stated reason, and unplaced sessions are listed.
  - [ ] When some blocks cannot be placed, then the run ends `completed_partial` and lists them.
  - [ ] When a second run starts on the same import during a run, then it gets 409 with a friendly message (B24).
  - [ ] When 20 jobs are already queued, then a new one gets 429 `QUEUE_FULL` (B24).
  - [ ] When the response is checked against `jobSchema`, then it passes.
- **Standards:** R1, A5, A7, U1, U2, U7.

### F4: Weekly timetable view (Pan)
- **For:** a visitor wants to see any group, teacher or room's week, so that they can check the rules by eye.
- **Needs:** Pan connects page 4 to real data. The backend only sends correct `items` and the full import. **After:** F3.
- **Acceptance:**
  - [ ] When a teacher, room or group is chosen, then the grid shows times, the lunch row, `กิจกรรม` on Wednesday 7–8, and cells with subject, theory or practical, room and teacher (group in teacher view).
  - [ ] When 2 sessions share a cell, then both are shown.
  - [ ] When the week is shown, then the total reads like `ครูสมชาย สอน 12 คาบ/สัปดาห์` and equals the checker's count.
  - [ ] When a search matches nothing, then the page says so and suggests what to try.
  - [ ] When the large sample's data loads, then the page stays usable within 2 s.
  - [ ] At 390 px wide, the grid is usable and the page itself does not scroll sideways.
- **Standards:** U10, U15, U17, X2, P3.

### F5: Special requests (todo)
- **For:** a visitor wants each Thai request read and sorted, so that the timetable respects it.
- **Needs:** interpret route, Thai rules reader; solver and checker use the requests. Requests use the page's `kind` + `params`, seen so far: `teacher_unavailable`, `group_unavailable`, `room_closed`, `teacher_avoid_period`, `prefer_practice_morning`, `group_end_by`, `teacher_only_days`. Inside the backend, each reduces to one shape: who it covers, which sessions, and which day and period slots to avoid. **After:** F3.
- **Acceptance:**
  - [ ] When the provided sets are read, then each reading matches the table in `extra.md` page 2 (a local test, skipped when the workbooks are absent).
  - [ ] When a first name is shared by 2 teachers, then matching uses the full name.
  - [ ] When a request names someone not in the data, or is already true, then it is `no_action`.
  - [ ] When a must-do request cannot fit, then it becomes `best_effort` with the reason (B19).
  - [ ] When the rules cannot read a request, then it opens in the form marked for a person, and it can be saved by hand.
  - [ ] When a visitor adds a request, then the next run obeys it, with no code change.
  - [ ] When some requests are unconfirmed, then the page does not send them, and a run uses only what it receives (B20).
  - [ ] When a run receives an unknown `kind` or an ID not in the data, then it gets 422 with a reason.
  - [ ] When a file has 50 requests, then reading them all stays inside the rate limit.
- **Standards:** A7, U5, U14.

### F6: Method comparison (todo)
- **For:** a visitor wants baseline and team method on the same data, so that they can see the method really is better.
- **Needs:** `compare` job, evaluation routes. **After:** F3.
- **Acceptance:**
  - [ ] When compare runs, then both methods show clashes, penalty and time, computed live by the checker.
  - [ ] When it repeats with the same seed, then every number except time is the same.
  - [ ] When different data is used, then the numbers change with it (B22).
  - [ ] When the import is not valid, then a comparison gets 409 `IMPORT_NOT_VALID`.
  - [ ] When real results are sent, then `isSimulated` is `false`.
  - [ ] `description` states the method, where AI is used, and the settings, taken from the code's real values, and `metricDefinitions` is sent.
- **Standards:** U2, U7.

### F7: Summary and export (todo)
- **For:** a visitor wants the numbers and the files, so that they can decide and print.
- **Needs:** export route, `requestResults`, WeasyPrint with font. Excel first; PDF last. **After:** F3.
- **Acceptance:**
  - [ ] When a run exists, then each request's result has an outcome and a reason, and the checker's figures match the frontend's page 6 formulas.
  - [ ] When Excel downloads, then a test reads it back: sheet `ตารางสอน`, the 6 headers in order, `คาบเริ่ม` and `จำนวนคาบ` as numbers, no extra sheets, columns or blank rows, and it passes the checker.
  - [ ] When the same seed runs twice, then both exports have identical cells in identical order. (Files can differ in the metadata Excel stores, so we also fix those values and aim for byte equality.)
  - [ ] When the PDF downloads, then it opens, and Thai renders correctly on a printed-size page.
  - [ ] When the large sample's PDF is built, then it takes under 2 s, or it moves to the worker (R1).
  - [ ] When a text cell starts with `=`, then the export stores it as text (A9).
  - [ ] When a job is not finished, then export gets 409 `SCHEDULE_NOT_READY`.
- **Standards:** A9, D2 (audit exports), U1.

### F8: Blank template and sample files (Pan)
- **For:** a visitor wants ready files in 3 sizes, so that they can try the site at once.
- **Needs:** done by Pan: `scripts/generate_sample_data.py` and `sample-small-team.xlsx`, `sample-medium-team.xlsx`, `sample-large-team.xlsx` in `apps/web/public/samples/`. The backend only checks them in F2 and F10. Files with planted errors and impossible data for the backend's tests are made in those tests. **After:** F2.
- **Acceptance:**
  - [ ] The large sample has about 600 teaching items.
  - [ ] When the blank template is uploaded, then every sheet and column is recognised and the only issue is that it holds no data.
- **Standards:** D1 (no real names), B16.

### F10: Strong solver (todo)
- **For:** a visitor wants every file scheduled cleanly and quickly, so that page 3 and 5 earn full marks.
- **Needs:** read `timetable-light` first; seeded local search on team v1, fixed iteration limit, feasibility pre-checks, `tools/eval.py`. **After:** F3, F6.
- **Acceptance:**
  - [ ] Trial and main sets: 0 clashes, 0 other violations, all items scheduled (local test).
  - [ ] The large sample finishes without hanging, and `stage` changes as it runs.
  - [ ] Team method beats baseline on penalty on every sample.
  - [ ] Impossible data returns a reason that names the teacher, group or room type.
  - [ ] Same seed gives identical sessions.
  - [ ] When the server restarts, then a saved run can still be read by its ID.
  - [ ] The main path, from upload to Excel download, is clicked once on the live site with Pan (M1).
  - [ ] The local run steps are written and followed once from clean.
- **Standards:** R1, B14, B15, M1. Riskiest item in the plan: no solver has run on this data yet, so `extra.md`'s checks are necessary conditions, not proof.

### F11: Language AI for requests, optional (blocked: Q4)
- **For:** a visitor wants any wording read, so that few requests need the form. The brief allows this but does not require it.
- **Needs:** free provider client on the backend, key in env only, short timeout, few retries, a limit on calls at once, results cached by request text, and readings prepared ahead for the sample files. Rules and the form from F5 remain the fallback. **After:** F5.
- **Acceptance:**
  - [ ] When a key is set, then AI reads the request first, and its reading is shown marked as AI and still needs confirming.
  - [ ] When the provider fails, times out, hits its quota or returns something invalid, then rules read the request or it stays in the form, and the page keeps working.
  - [ ] When the same text is read twice, then the second reading comes from the cache with no provider call.
  - [ ] When the requests in the trial and main sets are read, then the share read correctly is measured and reported (`extra.md` page 2 table).
  - [ ] Text sent out has full teacher names replaced by teacher IDs (a test inspects the outgoing request).
- **Standards:** D1, A7, O2.

## 10. Standards not met in version 1
| rule | why | when it will be |
|---|---|---|
| A1, A2, A4 | No login: judges have no accounts, and the brief needs none. Rate limits, random IDs and the job queue limit reduce the risk | if real college staff use it |
| A3 | No owners, so a record is reached by its long random ID instead. There is no list route | with personal accounts |
| D4 | Nightly `pg_dump` stays on the server, because data can be uploaded again and the site holds nothing unique | before real use |
| L1, L2 | Thai only: `apps/web` has no language files and the brief is in Thai. Text lives in `apps/web/src/config/messages.js` | if English is needed |
| O3 | No CI on a one-day build; `dev.py check` runs before each commit | before real use |
| P1 | The issues list comes whole from one upload and pages in the browser, because "all errors at once" is the rule | no plan |
| U8, R5 | No sessions and no shared records, so neither applies | with personal accounts |

## 11. Open questions
| id | question | who answers | blocks |
|---|---|---|---|
| Q2 | Are the teacher names in the workbooks real people? The organisers have not confirmed this, and copies of the workbooks may remain in the public repository's history | competition organisers | nothing; if they are real, the workbooks must stay out of git |
| Q4 | Which free language AI and model, and who provides the API key | the user | F11 |
| Q5 | Is lunch truly not a gap, and does ง count per teaching item? Our readings are shown on the site | competition organisers | nothing; can change one line in the checker |

## 12. Not in version 1
- Manual drag-and-drop editing of the timetable: the brief does not ask for it.
- Keeping and comparing many past timetables: only the latest run matters to the judges.
- Accounts, Google login and per-person data: the site is public.
- Sharing a workspace between devices: each browser tab has its own.
- Email or notifications: nothing in the brief needs them.
- SSE live progress: polling is enough for the progress bar, and it removes cross-site streaming risk from a 3-hour build.
- English pages: the brief and the frontend are Thai.
