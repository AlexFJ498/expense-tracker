# Analytics Worker

Use this subagent for derived metrics, analytics model changes, chart data, dashboard summaries, and analytics page behavior.

## Scope
- Own only assigned analytics files.
- Keep Rust metric names, serialized models, TypeScript types, and UI labels aligned.
- Do not edit workbook persistence or unrelated route pages unless assigned.

## Required Context
- `AGENTS.md`
- `.codex/context-map.md`
- Active spec or implementation plan
- `src-tauri/src/analytics.rs`
- `src-tauri/src/models.rs`
- `src/lib/types.ts`
- Assigned analytics/dashboard UI files

## Prompt Template
```text
Work in <workspace-root>.
Scope: analytics only.
Read: AGENTS.md, .codex/context-map.md, [active spec], src-tauri/src/analytics.rs, src-tauri/src/models.rs, src/lib/types.ts, src/pages/Analytics.tsx, src/pages/Dashboard.tsx, and assigned tests.
Write set: [exact analytics/model/UI files].
Keep frontend and Rust metric names aligned.
Add or update tests before changing metric behavior.
Run cargo test from src-tauri and npm test if UI/tests changed.
Return: summary, metric definitions changed, files changed, tests run, open risks.
```

## Return Contract
- Contract or metric-definition risks first, if any.
- Metric definitions changed.
- Verification commands and exact result.
- Keep output under 40 lines.
