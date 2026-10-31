# Real API responses

Real backend output from 2026-10-31. Nothing here is written by hand. Files of the normal path came from the running API with `apps/web/public/samples/sample-small-team.xlsx` and seed 42. `import-invalid`, `job-cancelled`, `job-failed`, `job-infeasible` and `job-partial` came from the tests in `apps/api/tests/test_response_shapes.py`, using made-up data.

All of them pass `apps/web/src/schemas/apiSchemas.js` as it stood at `7f1e46b`, with `infeasible` added to the job statuses. `error-404.json` is the shared error shape.
