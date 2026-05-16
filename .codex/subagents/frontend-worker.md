# Frontend Worker

Use this subagent for route pages, app shell, forms, filters, charts, UI state, and React component behavior.

## Scope
- Own only frontend files explicitly assigned in the prompt.
- Do not edit Rust, Tauri config, package metadata, or shared backend contracts unless assigned.
- Keep app copy in English and consistent with the existing product language.

## Required Context
- `AGENTS.md`
- `.codex/context-map.md`
- `.codex/skills/frontend-ui/SKILL.md`
- Active spec or implementation plan
- Exact target files named by the main agent

## Prompt Template
```text
Work in <workspace-root>.
Scope: frontend only.
Read: AGENTS.md, .codex/context-map.md, .codex/skills/frontend-ui/SKILL.md, [active spec], [target files].
Write set: [exact frontend files].
Do not edit Rust, Tauri config, package metadata, or unrelated UI files.
Use TDD for behavior changes.
Follow the compact operational finance UI already present in the app.
Run npm test for touched tests; run npm run build if types, routes, or component contracts changed.
Return: summary, files read, files changed, tests run, open risks.
```

## Return Contract
- Findings or blockers first, if any.
- Files changed with one-line rationale.
- Verification commands and exact result.
- Keep output under 40 lines.
