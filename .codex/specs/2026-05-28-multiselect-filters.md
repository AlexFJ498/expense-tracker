# Multiselect Filters

## Intent
- Goal: Allow every app filter to select multiple values.
- User value: Users can compare combined years, months, categories, movement kinds, and necessary/discretionary groups without clearing and reapplying filters.
- Non-goals: Add saved filter presets, advanced boolean logic, visual redesigns outside the filter bar, or persistence of filter state.

## Slice
- Frontend: Replace single-value filter controls in `src/components/FiltersBar.tsx` with compact multi-select controls.
- Tauri commands/API: Keep the same command names and pass a new plural `MovementFilter` payload.
- Workbook/Excel: Update in-memory filtering in `src-tauri/src/excel/workbook.rs`; do not change workbook files.
- Analytics: Update analytics filtering in `src-tauri/src/analytics.rs`.
- Tests: Add Rust tests for multi-value matching and analytics; add a frontend test for filter payload changes.

## Context To Read
- Must read: `src/components/FiltersBar.tsx`, `src/lib/types.ts`, `src-tauri/src/models.rs`, `src-tauri/src/excel/workbook.rs` filter helper, `src-tauri/src/analytics.rs` filter helper.
- Read only if needed: `src/pages/Movements.tsx`, `src/pages/Analytics.tsx`, `src/lib/api.ts`.
- Do not read: generated folders, workbook exports, unrelated import sanitization changes.

## Contract
- TypeScript models to add/change: `MovementFilter` uses optional plural arrays: `years`, `months`, `categories`, `kinds`, `necessary`.
- Rust models to add/change: `MovementFilter` uses defaulted vectors for the same plural fields.
- Tauri commands to add/change: No command name changes; `list_movements` and `get_analytics` receive the new filter shape.
- Error behavior: Invalid movement dates still exclude filtered movement rows; empty or omitted arrays mean no constraint.

## UX
- Entry point: Existing `FiltersBar` on Movements and Analytics.
- Empty/loading/error states: Existing page states remain unchanged.
- Product copy: Keep existing labels and Spanish UI copy already used by the app.
- Accessibility notes: Multi-select controls expose buttons with labels and checkbox items.

## Data Rules
- Source of truth: Excel workbook remains source of truth.
- Dirty/save behavior: Filtering remains read-only and must not mark the workbook dirty.
- Filtering/sorting: Values inside the same filter field are ORed; different fields are ANDed.
- Excel compatibility: No workbook schema or formula changes.

## Tests First
- Frontend failing test: `FiltersBar` selects multiple categories/kinds and emits plural arrays.
- Frontend failing test: an open selector closes when the user clicks outside it.
- Rust failing test: workbook listing and analytics accept multiple categories/kinds.
- Manual check: Open Movements/Analytics and confirm multiple checked values narrow results together.

## Implementation Plan
- Step 1: Add failing frontend and Rust tests for plural filter payloads.
- Step 2: Update `MovementFilter` in TypeScript and Rust.
- Step 3: Update workbook and analytics filter helpers to check array membership.
- Step 4: Replace single-select controls in `FiltersBar` with checkbox-based multi-select dropdowns.
- Step 5: Update page active-filter detection and year source handling as needed.
- Step 6: Run focused tests, then full verification for TS/Rust contract changes.

## Subagent Plan
- Frontend owner: Main agent.
- Backend owner: Main agent.
- Workbook/analytics owner: Main agent.
- Verifier/reviewer: Main agent.
- Shared files to avoid concurrent edits: No subagents for this slice.

## Acceptance
- User-visible result: All filters can hold zero, one, or many selected values.
- Commands that must pass: `npm test`, `npm run build`, `cargo test` from `src-tauri`.
- Risks left open: Existing uncommitted user changes in import/sanitize/workbook files are preserved.

## Decision Log
- 2026-05-28: Apply multiselect to all current filters: year, month, category, type, and necessary.
- 2026-05-28: Use plural arrays as the single contract; empty arrays mean no filter.
- 2026-05-28: Close an open selector when a pointer press starts outside that selector.
