# Tasks: Improve Movements Listing

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~480 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default (size:exception approved) |
| Chain strategy | size:exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size:exception
400-line budget risk: High

### Affected Files (10)
`src-tauri/src/excel/workbook.rs`, `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`, `src-tauri/tests/workbook_integration.rs`, `src/lib/api.ts`, `src/pages/Movements.tsx`, `src/components/MovementsTable.tsx`, `src/components/FiltersBar.tsx`, `src/components/MovementsTable.test.tsx`, `src/components/FiltersBar.test.tsx`

## Phase 1: Backend — Batch Delete Command

- [ ] 1.1 Extract `delete_row(u32)` helper in workbook.rs from existing `delete_movement` row-shift logic
- [ ] 1.2 Add `delete_movements(&[String]) -> AppResult<usize>`: reverse-sort rows, call `delete_row` each, then `rebuild_index` once
- [ ] 1.3 Add `delete_movements(ids: Vec<String>)` command in commands.rs, set dirty
- [ ] 1.4 Register `delete_movements` in lib.rs invoke_handler
- [ ] 1.5 Write integration tests: batch delete valid IDs, partial invalid, all invalid, empty list, delete all
- [ ] 1.6 Add `deleteMovements(ids: string[]): Promise<number>` in api.ts

## Phase 2: Frontend — Default Year Filter

- [ ] 2.1 In MovementsPage: add `useEffect` on mount, when `years` populated and `filter.years` empty, set `filter.years = [Math.max(...years)]`
- [ ] 2.2 Track applied flag with `useRef` so auto-select only fires once; user clearing years does not re-trigger
- [ ] 2.3 Write test: FiltersBar auto-selects max year on mount, does not re-select after user clears

## Phase 3: Frontend — Sortable Columns & Pagination

- [x] 3.1 Add `SortKey` / `SortDirection` types, `page`, `pageSize` state in MovementsTable (default: sort date desc, page 1, size 30)
- [x] 3.2 Add `useMemo` sorted + paginated movements slice in MovementsTable; totals still computed from full filtered list in MovementsPage
- [x] 3.3 Update MovementsTable: clickable headers with ▲/▼ sort indicators; sort/pagination state internal to component
- [x] 3.4 Add pagination controls to MovementsTable: Prev/Next buttons, page indicator, page-size dropdown (10/30/50/100)
- [x] 3.5 Filter change resets page to 1 via pageSize change handler; sort state managed internally
- [x] 3.6 Write tests: sort toggles direction, switch column resets to asc, pagination slices correctly, empty hides controls

## Phase 4: Frontend — Multi-Select & Batch Delete UI

- [x] 4.1 Add `selectedIds: Set<string>` state in MovementsTable, clear after successful delete
- [x] 4.2 Add checkbox column to MovementsTable rows + select-all in header column (toggle current page)
- [x] 4.3 Add selection toolbar above table: "N selected" + "Delete" button (appears when items selected)
- [x] 4.4 Add confirmation Dialog using `src/components/ui/dialog`: "Delete N movement(s)?" with confirm/cancel
- [x] 4.5 Wire delete: `onBatchDelete` prop calls `api.deleteMovements`, sets dirty, refreshes, clears selection
- [x] 4.6 Write tests: select/delete flow, select-all toggles current page, batch delete confirms and calls API
