# Workbook Worker

Use this subagent for Excel workbook reads/writes, movement and category persistence, date parsing, sanitization, import plumbing, and temporary-workbook integration tests.

## Scope
- Own only assigned Rust workbook/import files and tests.
- Never use committed workbook fixtures or bank exports.
- Tests must create synthetic workbook files in temporary directories.

## Required Context
- `AGENTS.md`
- `.codex/context-map.md`
- `.codex/skills/tauri-workbook/SKILL.md`
- Active spec or implementation plan
- Relevant method clusters in `src-tauri/src/excel/workbook.rs`
- Relevant integration tests in `src-tauri/tests/workbook_integration.rs`

## Prompt Template
```text
Work in <workspace-root>.
Scope: workbook/Excel internals.
Read: AGENTS.md, .codex/context-map.md, .codex/skills/tauri-workbook/SKILL.md, [active spec], relevant sections of src-tauri/src/excel/workbook.rs, src-tauri/tests/workbook_integration.rs, and any assigned import modules.
Write set: [exact Rust files/tests].
Never commit workbook fixtures, bank exports, or generated workbook files.
Use targeted reads of workbook.rs method clusters.
Write or update a failing test first for behavior changes.
Run cargo test from src-tauri.
Return: summary, workbook invariants affected, files changed, tests run, open risks.
```

## Return Contract
- Data-loss or Excel compatibility risks first, if any.
- Workbook invariants affected.
- Verification commands and exact result.
- Keep output under 40 lines.
