# Subagent Profiles

Use subagents for independent scopes only. Give each one a tight read set and, for workers, a disjoint write set. Do not fork full context unless the task truly needs it.

## Available Profiles
- `frontend-worker.md`: React pages, components, forms, filters, charts, and UI behavior.
- `tauri-api-worker.md`: Tauri commands, Rust/TypeScript contracts, dirty-state semantics, and API errors.
- `workbook-worker.md`: Excel workbook persistence, imports, sanitization, and temporary-workbook tests.
- `analytics-worker.md`: derived metrics, analytics contracts, dashboard, and analytics page behavior.
- `verifier-reviewer.md`: read-only implementation review and verification.
- `publication-auditor.md`: read-only pre-commit, pre-push, repo, PR, and release publication audit.

## General Contract
- Start with `AGENTS.md` and `.codex/context-map.md`.
- Read `.codex/agentic-workflow.md` when coordinating multiple layers.
- Read only files named in the prompt unless blocked.
- Return: summary, files read, files changed, tests run, open risks.
- Do not edit shared files unless assigned.
- Keep final output under 40 lines.

## Dispatch Rules
- Choose one profile per independent scope.
- Give each worker exact ownership of files it may change.
- Keep `src/lib/types.ts`, `src/lib/api.ts`, `src-tauri/src/models.rs`, and `src-tauri/src/commands.rs` owned by one worker at a time.
- Use `verifier-reviewer.md` or `publication-auditor.md` as read-only agents.
- The main agent integrates results and reruns the relevant verification matrix.
