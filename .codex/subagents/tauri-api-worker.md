# Tauri API Worker

Use this subagent for Tauri commands, Rust/TypeScript API contracts, app state boundaries, dirty-state semantics, and command error behavior.

## Scope
- Own only assigned contract and command files.
- Keep `src/lib/api.ts`, `src/lib/types.ts`, `src-tauri/src/models.rs`, and `src-tauri/src/commands.rs` aligned.
- Do not edit workbook internals or UI pages unless the main agent assigns exact files.

## Required Context
- `AGENTS.md`
- `.codex/context-map.md`
- `.codex/skills/tauri-workbook/SKILL.md`
- Active spec or implementation plan
- Assigned API/model/command files

## Prompt Template
```text
Work in <workspace-root>.
Scope: Tauri API contract.
Read: AGENTS.md, .codex/context-map.md, .codex/skills/tauri-workbook/SKILL.md, [active spec], src/lib/api.ts, src/lib/types.ts, src-tauri/src/models.rs, src-tauri/src/commands.rs, src-tauri/src/lib.rs.
Write set: [exact API/model/command files].
Do not edit UI pages, workbook internals, config, or package metadata unless assigned.
Write or update a failing test first for behavior changes.
Preserve workbook dirty/save semantics.
Run cargo test from src-tauri and npm run build if contracts changed.
Return: summary, contract changes, files changed, tests run, open risks.
```

## Return Contract
- Contract drift risks first, if any.
- Rust and TypeScript changes grouped together.
- Verification commands and exact result.
- Keep output under 40 lines.
