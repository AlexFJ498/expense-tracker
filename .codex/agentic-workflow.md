# Agentic Workflow

Use this file when planning or coordinating multi-step work in this repo.

## Default Loop
1. Read `AGENTS.md`, `.codex/context-map.md`, and the one relevant project skill.
2. Identify the smallest vertical slice: contract, behavior, UI, tests, verification.
3. Write or update one spec when behavior changes.
4. Implement with one owner per shared file.
5. Run the verification matrix for the touched surface before claiming completion.
6. Run `.codex/checklists/publication-gate.md` before commit, push, or repo publication.

## Subagent Policy
- Use subagents only when tasks can run independently with disjoint write sets.
- Start from the reusable profiles in `.codex/subagents/`.
- Give each subagent a short read set and exact write set.
- Do not assign the same shared file to multiple workers.
- Keep verifier agents read-only.
- Main agent integrates results and reruns verification.

## Ownership Map
- Contracts: `src-tauri/src/models.rs`, `src-tauri/src/commands.rs`, `src/lib/types.ts`, `src/lib/api.ts`.
- Workbook persistence: `src-tauri/src/excel/*`, `src-tauri/tests/workbook_integration.rs`.
- Analytics: `src-tauri/src/analytics.rs`, analytics models/types, dashboard and analytics pages.
- UI flows: `src/pages/*`, `src/components/*`, frontend tests.
- Agent docs: `AGENTS.md`, `.codex/context-map.md`, `.codex/skills/*`, `.codex/subagents/*`.

## Stop Conditions
- More than 12 source files seem necessary.
- A shared contract file has unclear ownership.
- A test or build fails once after a fix attempt.
- A change needs real workbook, bank export, or local private data.
- Publication would include generated folders or ignored private data.
