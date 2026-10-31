# Decisions

Each decision with its reason, newest at the bottom. Change a decision by adding a new row, not by editing an old one.

| date | area | decision | why |
|---|---|---|---|
| (template) | stack | FastAPI + PostgreSQL + worker + React/TypeScript/Vite/Ant Design | size-M apps: one organisation, thousands of users, slow jobs |
| (template) | login | Google sign-in limited to one domain; fake login only in dev | no passwords to store or lose |
| (template) | live progress | worker writes events to the database; pages read them by SSE with Last-Event-ID | survives restarts; replay for free |
| (template) | dev database port | 5433 | a system PostgreSQL often uses 5432 |
| 2026-10-31 | scope | Practice run of the competition: all 6 pages to the brief, no 8-hour limit; `docs/SPEC.md` section 10 lists the enterprise rules skipped | judges test the brief, not enterprise extras |
| 2026-10-31 | login | One shared judge login in one shared workspace, password set on the server; replaces the template's Google decision for this app | judges have no institute account, and strangers must not run jobs on the server |
| 2026-10-31 | hosting | The user's own VPS with docker compose | the worker must stay awake while judges test |
| 2026-10-31 | requests | Built-in Thai rules first; a language AI only if time is left, sending teacher IDs instead of names | works with no key or outage, and names stay on our server |
| 2026-10-31 | data storage | The 7 sheets stay as JSON on `dataset`, with no table per sheet | the solver and pages always read a whole dataset |
| 2026-10-31 | solver | One checker for all numbers; seeded random, fixed iteration limit, one thread, no clock in decisions | the same seed must give the same timetable on any machine |
| 2026-10-31 | scoring readings | Lunch is not a gap; ง counts per teaching item; each period missing an "if possible" request costs 1 | the first two are our reading of the brief, the third is the team's choice, and the site states all three |
| 2026-10-31 | competition files | `extra.md` and `full_test_data/` stay out of git through `.git/info/exclude` until organisers say whether the teacher names are real | personal data never goes to git |
| 2026-10-31 | site name | ระบบจัดตารางสอนอัตโนมัติ / Automatic Timetable System | the name the competition PDF uses |
| 2026-10-31 | deploy order | F9 runs right after F1; later features go online as they are finished | hosting is new work, so its problems should show up early |
| 2026-10-31 | data levels | Workbook data is Internal, not Personal: `docs/SECURITY.md` classes staff names and rooms as Internal, and the data holds no student records | corrects the first spec draft; removes the A3, D2 reads and D6 exceptions |
| 2026-10-31 | font | Bundle Sarabun for the site and the PDF | `App.tsx` asks for it but nothing loads it, so Thai looked different per device |
| 2026-10-31 | code hosting | GitHub replaces GitLab; pull requests replace merge requests | the user must submit the code through GitHub |
| 2026-10-31 | deadline | Submit today by 16:30; the build order follows page scores | the brief's Day 1 is today (user) |
| 2026-10-31 | routes | The backend builds `/api/v1/*` and `apps/web` moves back to it (DEC-002, DEC-003) | both people chose it; data is reached by ID, so visitors do not overwrite each other |
| 2026-10-31 | login | No login and no cookies; replaces the shared judge login above | judges open the link and start (DEC-001, DEC-003) |
| 2026-10-31 | hosting | Vercel for `apps/web`, the user's VPS for the API, worker and database; replaces "everything on the VPS" above | Pan and the user chose it |
| 2026-10-31 | repository | The backend lives in `apps/api/` of the public `Suphakritpan/Sim-TIMETABLE-SYSTEM`; commits use a GitHub noreply address | judges need the source link, and a public repo must not show a personal email |
| 2026-10-31 | progress | Polling only; no SSE in version 1 | enough for the progress bar, and one less cross-site risk in a short build |
| 2026-10-31 | migrations | One new base migration replaces the template's two | nothing was ever deployed, so no data needs a step-by-step path |
| 2026-10-31 | dev database | Compose project `sim-timetable` on port 5434 | other projects on the machine use 5432, 5433 and the name `timetable` |
| 2026-10-31 | font | Sarabun is bundled in F7, not F1 | only the PDF needs it on the backend |
