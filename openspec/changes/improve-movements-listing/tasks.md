# Tasks: Improve Movements Listing

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1200 |
| 400-line budget risk | Overridden |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default (size:exception approved) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size:exception
400-line budget risk: Overridden (user approved D3)

### Affected Files (18)
`src/lib/i18n.ts`, `src/themes/*.css` (6 files), `src/components/ThemeProvider.tsx`, `src/components/MovementsByCategory.tsx`, `src/components/SettingsDialog.tsx`, `src/components/FiltersBar.tsx`, `src/components/MovementsTable.tsx`, `src/components/Topbar.tsx`, `src/pages/Movements.tsx`, `src/store/workbook.ts`, `src/App.tsx`, `src/App.css`, `index.html`

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

- [x] 3.1 Add `SortKey` / `SortDirection` types, `page`, `pageSize` state in MovementsTable
- [x] 3.2 Add `useMemo` sorted + paginated movements slice in MovementsTable
- [x] 3.3 Update MovementsTable: clickable headers with ▲/▼ sort indicators
- [x] 3.4 Add pagination controls to MovementsTable: Prev/Next, page indicator, page-size dropdown (10/30/50/100)
- [x] 3.5 Filter change resets page to 1 via pageSize change handler
- [x] 3.6 Write tests: sort toggles direction, switch column resets to asc, pagination slices correctly

## Phase 4: Frontend — Multi-Select & Batch Delete UI

- [x] 4.1 Add `selectedIds: Set<string>` state in MovementsTable
- [x] 4.2 Add checkbox column to MovementsTable rows + select-all in header
- [x] 4.3 Add selection toolbar above table: "N selected" + "Delete" button
- [x] 4.4 Add confirmation Dialog using `src/components/ui/dialog`
- [x] 4.5 Wire delete: `onBatchDelete` prop calls `api.deleteMovements`
- [x] 4.6 Write tests: select/delete flow, select-all toggles current page

## Phase 5: Filter UX Polish

- [ ] 5.1 Add active visual state to `MultiSelectFilter` trigger button when values.length > 0 (e.g., `border-primary` instead of `border-input`)
- [ ] 5.2 Add "Sin asignar" (`null`) option to Necessary filter with label "Sin asignar"
- [ ] 5.3 Add search `<input>` inside Category dropdown to filter visible options
- [ ] 5.4 Write tests: active state renders, necessary null filters, search narrows options

## Phase 6: i18n Infrastructure

- [ ] 6.1 Create `src/lib/i18n.ts` with `LanguageProvider` context, `t()` function, translation maps for `es` and `en`
- [ ] 6.2 Define all translation keys covering FiltersBar, MovementsTable, MovementsByCategory, Topbar, dialogs, toasts
- [ ] 6.3 Wrap app with `LanguageProvider` in `App.tsx`
- [ ] 6.4 Update FiltersBar to use `t()` for all labels, options, and button text
- [ ] 6.5 Update MovementsTable to use `t()` for headers, pagination, selection, dialogs, empty/loading states, kind/necessary labels
- [ ] 6.6 Update Movements page summary cards to use `t()`
- [ ] 6.7 Write tests: language switch updates visible strings, default is Spanish, persistence works

## Phase 7: Theme System

- [ ] 7.1 Extract current dark theme CSS variables to `src/themes/oscuro.css`
- [ ] 7.2 Create `src/themes/claro.css` (light theme)
- [ ] 7.3 Create `src/themes/oceano.css` (blue-tinted dark)
- [ ] 7.4 Create `src/themes/bosque.css` (green-tinted dark)
- [ ] 7.5 Create `src/themes/atardecer.css` (warm amber dark)
- [ ] 7.6 Create `src/themes/contraste.css` (high contrast)
- [ ] 7.7 Create `src/components/ThemeProvider.tsx` with context, localStorage persistence, `<html>` class management
- [ ] 7.8 Wrap app with `ThemeProvider` in `App.tsx`
- [ ] 7.9 Remove `class="dark"` from `index.html`
- [ ] 7.10 Update `App.css` to remove inline theme definitions, import theme files
- [ ] 7.11 Write tests: theme switch updates `<html>` class, persistence works, all themes apply

## Phase 8: Category-Grouped View

- [ ] 8.1 Create `src/components/MovementsByCategory.tsx` with collapsible category groups
- [ ] 8.2 Each group: collapsible header (category name + count), compact table (date, description, kind, amount, necessary — no category column)
- [ ] 8.3 Per-group sorting via column header clicks (same SortKey minus "category")
- [ ] 8.4 Add view toggle Tabs ("Lista" / "Por categoría") in MovementsPage
- [ ] 8.5 Wire grouped view to receive same movements, sort state, and click handler
- [ ] 8.6 Write tests: groups render collapsed, expand/collapse works, per-group sort works

## Phase 9: Auto-Save & Undo

- [ ] 9.1 Remove "Guardar" button, "Cambios sin guardar" indicator, and "Guardado" indicator from Topbar
- [ ] 9.2 Add `undoSnapshot` state to `useWorkbook` store
- [ ] 9.3 Add `captureUndoSnapshot()` function that saves current workbook state before mutation
- [ ] 9.4 Add `performUndo()` function that restores snapshot and saves
- [ ] 9.5 Modify `save()` to auto-save after every mutation; update MovementForm, MovementsPage delete handlers
- [ ] 9.6 Show toast with "Deshacer" button after auto-save; wire to undo flow
- [ ] 9.7 Add undo confirmation dialog
- [ ] 9.8 Write tests: auto-save triggers after mutation, undo restores state, confirmation dialog works

## Phase 10: Pagination Enhancements

- [ ] 10.1 Add "Todos" option to `PAGE_SIZE_OPTIONS` that renders all rows on one page
- [ ] 10.2 Render pagination controls above the table (in addition to below)
- [ ] 10.3 When "Todos" is selected, hide/disable navigation buttons (single page)
- [ ] 10.4 Write tests: "Todos" shows all rows, top pagination renders, navigation hidden when "Todos"

## Phase 11: Table Visual Polish

- [ ] 11.1 Adjust `COLUMN_WIDTH` for tighter spacing; make description column flex-fill
- [ ] 11.2 Reduce row padding for more compact rows; balance with readability
- [ ] 11.3 Refine column alignment and spacing between description and kind
- [ ] 11.4 Verify visual appearance across themes

## Phase 12: Settings Dialog

- [ ] 12.1 Create `src/components/SettingsDialog.tsx` with language selector and theme selector
- [ ] 12.2 Add gear icon button to Topbar that opens SettingsDialog
- [ ] 12.3 Wire language and theme changes from settings
- [ ] 12.4 Write tests: dialog opens/closes, selections persist
