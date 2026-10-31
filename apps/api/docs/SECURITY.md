# Security and personal data

Every known risk, its fix, and where the fix stands. Fix them one at a time; add a row whenever a new risk is found.

## Data levels

| level | examples | rule |
|---|---|---|
| Public | documents the organisation publishes | Claude may read them |
| Internal | rooms, real staff names | use made-up versions for development |
| Personal (PDPA) | student lists, ID numbers, emails, grades | never to Claude, git, chat tools or connectors; only in `private/` on the server |

Claude Code is blocked from reading `private/`, `.env` and `backups/` by `.claude/settings.json`.
Each developer turns off "use chats for training" in their claude.ai privacy settings.

## Risks

| # | risk | fix | status |
|---|---|---|---|
| 1 | anyone can call the public API | no accounts by decision; long random IDs, no list routes, rate limits per IP, CORS for real origins only | IDs from F2; the rest done |
| 2 | no record of who changed what | `audit_log` table, written in the same commit as the change | done |
| 3 | personal data ends up in git | `.gitignore` for `private/`, `.env`, `backups/`; made-up seed data | done |
| 4 | secrets in the code | settings from environment; `.env` never committed; production refuses open CORS | done |
| 7 | a harmful uploaded file | size limits; open uploads only in the worker | when uploads are added |
| 8 | one caller overloads the site | rate limits per IP; one job at a time per import; a queue limit | limits done; queue in F3 |
| 9 | libraries with known holes | `npm audit` + `uv run pip-audit` in CI | todo (CI) |
| 10 | data kept too long | cleanup rule in the worker (events: 7 days) | done for events |
