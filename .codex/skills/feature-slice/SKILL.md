---
name: feature-slice
description: Use when adding a new feature or changing user-visible behavior in Control de Gastos
---

# Expense Feature Slice

## Principle
Ship one vertical, tested slice at a time. Keep context small by reading the contract and the exact feature boundary, then split independent work across subagents.

## Start
1. Read `AGENTS.md` and `.codex/context-map.md`.
2. Read `.codex/agentic-workflow.md` when the task spans more than one layer.
3. Create or update one spec from `.codex/specs/feature-spec-template.md`.
4. Fill the read set, non-goals, contract, tests, and shared files before editing.

## Slice Order
1. Contract: Rust models/commands and TypeScript types/API.
2. Behavior: workbook, analytics, or state changes.
3. UI: page/component changes.
4. Tests and verification.

## TDD Rule
For behavior changes, write the failing test first and run it. If no automated test is practical, state why in the spec and add a manual check.

## Subagent Rule
Dispatch subagents only when scopes are independent:
- Frontend and backend can run in parallel after the contract is explicit.
- Workbook and analytics should be separate only if they do not edit the same model functions.
- Shared contract files must have one owner.
- Verifier is read-only after implementation.

## Stop Conditions
Pause and summarize if:
- More than 12 source files seem necessary.
- A shared file would be edited by two workers.
- The TypeScript/Rust contract is unclear.
- A first fix attempt fails; re-analyze root cause before trying again.
