# Proposal: Improve Movements Listing

## Intent

The Movements page currently loads every filtered row into memory, sorts only by date descending, and offers no bulk operations. Users managing large workbooks need: multi-select delete, clickable column sorting, pagination, and a sensible default year filter. This change addresses usability and performance pain points without overhauling the data layer.

## Scope

### In Scope
- Add checkboxes and a bulk-delete action to `MovementsTable`.
- Make column headers clickable for client-side sorting (date, amount, category, kind). Default: date descending.
- Add client-side pagination with configurable page size. Default: 30 per page.
- Auto-select the most recent year in `FiltersBar` on page load.
- Add a backend batch-delete command that shifts rows and rebuilds the `id_by_row` index.
- Update `MovementFilter` (Rust/TS) to carry sort and pagination fields as **optional** fields so `get_analytics` remains unaffected.

### Out of Scope
- Server-side sorting or pagination (deferred until backend query performance becomes a bottleneck).
- Global search/filter beyond the existing `FiltersBar` fields.
- Export or import of selected rows.
- Undo/redo for bulk delete.

## Capabilities

### New Capabilities
- `movement-listing-ui`: Sorting, pagination, multi-select, and default year filter on the Movements page.
- `batch-delete`: Backend command to delete multiple movements by ID in a single transaction.

### Modified Capabilities
- None (no existing specs in `openspec/specs/`).

## Approach

**Approach 1: Client-side sort/pagination + backend batch delete.**

1. **Frontend state** (`MovementsPage` / `useMovements`): hold `sortKey`, `sortDirection`, `page`, `pageSize`, and `selectedIds`. Derive the displayed slice from the already-loaded filtered list.
2. **Backend batch delete** (`delete_movements`): accept `Vec<String>` of IDs, remove rows in reverse order to avoid shifting issues, rebuild the `id_by_row` index, and return the deleted count.
3. **Default year filter**: when `FiltersBar` mounts and `years` is empty, set it to the max year from the unfiltered year list.
4. **Pagination controls**: simple Prev/Next + page size dropdown (10/30/50/100).
5. **Sorting**: stable client-side sort by parsed numeric/date values where applicable.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/pages/Movements.tsx` | Modified | Add sort, pagination, and selection state. |
| `src/components/MovementsTable.tsx` | Modified | Add checkboxes, clickable headers, sort indicators. |
| `src/components/FiltersBar.tsx` | Modified | Auto-select most recent year when none selected. |
| `src/lib/types.ts` | Modified | Add optional sort/pagination fields to `MovementFilter`. |
| `src/lib/api.ts` | Modified | Add `deleteMovements(ids)` batch wrapper. |
| `src-tauri/src/commands.rs` | Modified | Add `delete_movements` command. |
| `src-tauri/src/models.rs` | Modified | Add optional `sort` and `pagination` to `MovementFilter`. |
| `src-tauri/src/excel/workbook.rs` | Modified | Implement `delete_movements` row removal and index rebuild. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Batch delete corrupts `id_by_row` index if rows are removed in ascending order | Med | Remove rows in **reverse index order** and rebuild the index atomically. |
| Adding pagination to `MovementFilter` breaks `get_analytics` which passes `default()` | Med | Make pagination fields **optional** and only apply when `Some`. |
| Large filtered lists still cause frontend memory pressure | Low | Pagination is purely a UI slice; the full list is already loaded. This is a known limitation and acceptable for current scale. |
| Sorting by amount with mixed currency or formatting issues | Low | Sort by the raw numeric `amount` field, not formatted strings. |

## Rollback Plan

1. Revert the four frontend files and the four Rust files listed above.
2. If the batch-delete command is invoked and the workbook appears corrupted, the app can reload the workbook from disk (it is the source of truth). No destructive schema changes are introduced.

## Dependencies

- None (no external libraries or services required).

## Success Criteria

- [ ] User can check multiple rows and delete them with a single action; the table refreshes correctly.
- [ ] User can click any column header to sort ascending or descending; default is date descending.
- [ ] User can change page size and navigate pages; default is 30 per page.
- [ ] On page load, the most recent year is pre-selected in the year filter.
- [ ] `cargo test` and `npm test` pass.
- [ ] `get_analytics` continues to return all movements regardless of any new filter fields.
