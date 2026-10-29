# GitHub Push Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run all existing test suites automatically on each push.

**Architecture:** One GitHub Actions job installs the repository's Node dependencies and Chromium, runs unit and smoke checks, then uses Docker Compose in `test.db` mode to run Playwright E2E. The job always tears down its Compose stack.

**Tech Stack:** GitHub Actions, Node.js 24, npm, Docker Compose, Playwright Chromium.

**Spec:** `docs/superpowers/specs/2026-10-29-github-push-tests-design.md`

## Global Constraints

- Trigger on every `push`.
- Preserve the existing test commands and use the isolated `test.db` for E2E.
- Do not add dependencies or change application code.

## Review Focus

- The workflow must provision Chromium before E2E runs.
- The web container must start with `DATABASE_FILE=test.db` so E2E cannot touch the development database.
- Compose cleanup must run even when a test step fails.

---

### Task 1: Add the push test workflow

**Files:**
- Create: `.github/workflows/test.yml`

**Interfaces:**
- Consumes: npm scripts `test:unit`, `test:smoke`, and `test:e2e`; existing `compose.yaml` and `tests/e2e/global-setup.ts` contracts.
- Produces: a push-triggered GitHub Actions job that runs all three suites.

- [x] Use `actions/checkout@v7` and `actions/setup-node@v7` with Node.js 24 and npm cache, then run `npm ci`.
- [x] Install Playwright Chromium with system dependencies; run `npm run test:unit` and `npm run test:smoke`.
- [x] Start Compose with `DATABASE_FILE=test.db`, run `npm run test:e2e`, and run `docker compose down -v` in an unconditional cleanup step.
- [x] Review the workflow syntax and diff for scope and whitespace issues; do not run the project test suites during this configuration-only task.
