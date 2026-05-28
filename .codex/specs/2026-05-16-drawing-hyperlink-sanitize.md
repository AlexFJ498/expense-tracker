# Drawing Hyperlink Sanitize

## Intent
- Goal: prevent Excel repair prompts after the app edits and saves an existing workbook with drawing hyperlinks.
- User value: users can reopen saved workbooks without Excel warning that drawing parts were repaired.
- Non-goals: preserve clickable shape hyperlinks or redesign workbook drawings.

## Slice
- Frontend: no change.
- Tauri commands/API: no contract change.
- Workbook/Excel: sanitize orphaned drawing hyperlink references before `umya-spreadsheet` reads/saves the workbook.
- Analytics: no change.
- Tests: Rust tests for drawing rel sanitization and movement save roundtrip.

## Context To Read
- Must read: `AGENTS.md`, `.codex/context-map.md`, `.codex/skills/tauri-workbook/SKILL.md`, `src-tauri/src/excel/sanitize.rs`, `src-tauri/src/excel/workbook.rs`, `src-tauri/tests/workbook_integration.rs`.
- Read only if needed: `umya-spreadsheet` raw relationship reader/writer internals.
- Do not read: generated folders or real workbook exports.

## Contract
- TypeScript models to add/change: none.
- Rust models to add/change: none.
- Tauri commands to add/change: none.
- Error behavior: existing workbook open/save errors remain unchanged.

## UX
- Entry point: existing edit movement and save flow.
- Empty/loading/error states: no UI change.
- Product copy: no UI change.
- Accessibility notes: no UI change.

## Data Rules
- Source of truth: the Excel workbook remains source of truth.
- Dirty/save behavior: unchanged; movement edits still mark dirty and save clears dirty.
- Filtering/sorting: unchanged.
- Excel compatibility: remove drawing hyperlink XML nodes whose relationship was removed because internal `Target="#..."` relationships cannot be loaded by `umya-spreadsheet`.

## Tests First
- Frontend failing test: none, no UI/contract change.
- Rust failing test: synthetic xlsx with a drawing hyperlink relationship and matching `a:hlinkClick r:id` should save without orphaned drawing references.
- Manual check: optional reopen of affected workbook in Excel after test green.

## Subagent Plan
- Frontend owner: none.
- Backend owner: main agent.
- Workbook/analytics owner: main agent.
- Verifier/reviewer: main agent.
- Shared files to avoid concurrent edits: `src-tauri/src/excel/sanitize.rs`, `src-tauri/tests/workbook_integration.rs`.

## Acceptance
- User-visible result: saved workbook opens in Excel without drawing repair prompt caused by orphaned hyperlink relationships.
- Commands that must pass: `cargo test` from `src-tauri`.
- Risks left open: shape hyperlinks that point inside the workbook are intentionally removed because the current workbook library cannot load them safely.

## Decision Log
- 2026-05-16: Root cause is orphaned `a:hlinkClick`/`a:hlinkHover` drawing references left after removing internal drawing relationships.
