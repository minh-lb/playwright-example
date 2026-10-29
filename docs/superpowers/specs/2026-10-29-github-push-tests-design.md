# GitHub Actions Push Tests Design

## Intent

Run the repository's existing tests automatically on every push so regressions are caught in CI.

## Goals and constraints

- Run all three existing suites: unit, smoke, and Playwright E2E.
- Use Node.js 24 and the existing npm scripts.
- Use current major releases of the official checkout and setup-node actions.
- Run E2E against the existing Docker Compose stack with `DATABASE_FILE=test.db` and Chromium.
- Keep the workflow scoped to `push`; add no dependencies or application changes.

## Approaches

- Unit and smoke only: faster, but leaves the existing E2E coverage out of CI.
- All suites: includes the Docker/Keycloak E2E suite and covers every existing test command. Selected because the request is to run the tests on push.

## Implementation

Add one GitHub Actions workflow that installs dependencies and Chromium, runs unit and smoke suites, starts the test-mode Compose stack for E2E, and cleans up the stack after the job.
