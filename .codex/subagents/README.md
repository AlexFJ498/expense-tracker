# Subagent Prompts

Use subagents for independent scopes only. Give each one a tight read set and, for workers, a disjoint write set. Do not fork full context unless the task truly needs it.

## General Contract
- Start with `AGENTS.md` and `.codex/context-map.md`.
- Read `.codex/agentic-workflow.md` when coordinating multiple layers.
- Read only files named in the prompt unless blocked.
- Return: summary, files read, files changed, tests run, open risks.
- Do not edit shared files unless assigned.
- Keep final output under 40 lines.

## Frontend Agent
Use for route pages, forms, filters, charts, app shell, and component behavior.

Prompt:
```text
Work in <workspace-root>.
Scope: frontend only.
Read: AGENTS.md, .codex/context-map.md, .codex/skills/frontend-ui/SKILL.md, [active spec], [target files].
Write set: [exact frontend files].
Do not edit Rust or config files.
Use TDD for behavior changes.
Run npm test for touched tests; run npm run build if types/routes changed.
Return concise summary with files changed and verification.
```

## Tauri API Agent
Use for command boundaries, Rust/TypeScript contracts, dirty-state semantics, and API errors.

Prompt:
```text
Work in <workspace-root>.
Scope: Tauri API contract.
Read: AGENTS.md, .codex/context-map.md, .codex/skills/tauri-workbook/SKILL.md, [active spec], src/lib/api.ts, src/lib/types.ts, src-tauri/src/models.rs, src-tauri/src/commands.rs, src-tauri/src/lib.rs.
Write set: [exact API/model/command files].
Do not edit UI pages except assigned type-call adjustments.
Write/adjust failing tests first where behavior changes.
Run cargo test from src-tauri and npm run build if contracts changed.
Return concise summary with contract changes and verification.
```

## Workbook Agent
Use for Excel sheet reads/writes, category/movement persistence, date parsing, sanitization, and temporary-workbook integration tests.

Prompt:
```text
Work in <workspace-root>.
Scope: workbook/Excel internals.
Read: AGENTS.md, .codex/context-map.md, .codex/skills/tauri-workbook/SKILL.md, [active spec], relevant sections of src-tauri/src/excel/workbook.rs, src-tauri/tests/workbook_integration.rs.
Write set: [exact Rust files/tests].
Never commit workbook fixtures; tests must create workbook files in temp dirs.
Use targeted reads of workbook.rs method clusters.
Run cargo test from src-tauri.
Return concise summary with workbook invariants affected.
```

## Analytics Agent
Use for derived metrics and chart contracts.

Prompt:
```text
Work in <workspace-root>.
Scope: analytics only.
Read: AGENTS.md, .codex/context-map.md, [active spec], src-tauri/src/analytics.rs, src-tauri/src/models.rs, src/lib/types.ts, src/pages/Analytics.tsx, src/pages/Dashboard.tsx.
Write set: [exact analytics/model/UI files].
Keep frontend and Rust metric names aligned.
Add tests before changing metric behavior.
Run cargo test from src-tauri and npm test if UI/tests changed.
Return concise summary with metric definitions.
```

## Verifier/Reviewer Agent
Use after implementation or before merging.

Prompt:
```text
Work in <workspace-root>.
Scope: review and verification only.
Read: AGENTS.md, .codex/context-map.md, active spec/plan, changed files.
Do not edit files.
Check for contract drift, missing tests, dirty-state mistakes, committed workbook data, and loading/error regressions.
For publication work, also run `.codex/checklists/publication-gate.md`.
Run only requested verification commands.
Return findings first, ordered by severity, with file/line references where possible.
```
