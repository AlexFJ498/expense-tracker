---
name: tauri-workbook
description: Use when changing Rust Tauri commands, workbook Excel persistence, analytics, models, or frontend/backend API contracts in Control de Gastos
---

# Expense Tauri Workbook

## Read First
- `AGENTS.md`
- `.codex/context-map.md`
- Active feature spec
- `src-tauri/src/models.rs`
- `src/lib/types.ts`
- `src/lib/api.ts`
- Exact command/workbook/analytics files for the slice

## Contract Order
Keep these aligned:
1. Rust serializable models in `src-tauri/src/models.rs`.
2. Tauri commands in `src-tauri/src/commands.rs`.
3. Command registration in `src-tauri/src/lib.rs`.
4. TypeScript models in `src/lib/types.ts`.
5. Frontend wrappers in `src/lib/api.ts`.

## Workbook Rules
- Excel is the source of truth for movements and categories.
- Do not commit workbook fixtures; tests should create workbooks in temp dirs.
- Preserve dirty-state semantics in `commands.rs`: mutations set `inner.dirty = true`; save clears it.
- When changing `workbook.rs`, read only the method cluster needed plus adjacent helpers.
- Be careful with row/table ranges, formulas, date parsing, category casing, and running totals.

## Analytics Rules
- `src-tauri/src/analytics.rs` computes derived metrics from listed movements.
- Metric names and shapes must match `Analytics` in Rust and TypeScript.
- Chart/page behavior must handle empty data and errors.

## Tests
- Add or update Rust integration tests in `src-tauri/tests/workbook_integration.rs` for workbook behavior.
- Add frontend tests when API errors or visible UI states change.
- Run `cargo test` from `src-tauri`; run `npm run build` when contracts changed.
- Before publication, run `.codex/checklists/publication-gate.md` to catch workbook exports and broad Tauri permissions.
