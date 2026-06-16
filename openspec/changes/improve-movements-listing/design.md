# Design: Improve Movements Listing

## Technical Approach

Client-side sort + pagination keeps the backend lean. A new `delete_movements` Rust command accepts multiple IDs, deletes rows bottom-to-top (safe shift), and rebuilds the index once. Sort/pagination/selection state stays in `MovementsPage`. Default year is set once on mount from the unfiltered movement years list.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Sort/Pagination location | Server-side vs Client-side | **Client-side** | Full list already in memory after `list_movements`; server round-trip adds latency at current scale |
| Batch delete strategy | Single big shift vs per-row | **Per-row bottom-up + one `rebuild_index`** | Reuses existing shift logic; only changes: skip per-delete index rebuild, do it once at end |
| `MovementFilter` fields | Add sort/page vs leave alone | **Leave alone** | Sort/pagination are pure UI state — no backend model changes needed |
| Default year source | `get_analytics` vs computed | **Computed from unfiltered `listMovements`** | Already fetched on mount; no extra API call |
| Confirmation UX | Custom vs existing components | **`Dialog` from `src/components/ui/dialog`** | Already in codebase, consistent look |

## Data Flow

```
Mount
 → api.listMovements({}) + api.listCategories() + api.listMovements({}) (unfiltered)
 → years[] derived → useEffect sets filter.years = [Math.max(...years)]
 → load() reruns with filter → display filtered movements

Sort click
 → MovementsPage: setSortKey/setSortDirection
 → useMemo: [...movements].sort() → paginate via slice()

Batch delete
 → Check rows → floating bar shows "N selected" + "Delete" button
 → Dialog confirms → api.deleteMovements(ids)
 → Rust: delete_movements → delete row by row (reverse order), rebuild_index
 → Refresh movements, clear selection
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/src/excel/workbook.rs` | Modify | Extract `delete_row(u32)` from `delete_movement`; add `delete_movements(&[String]) -> AppResult<usize>` |
| `src-tauri/src/commands.rs` | Modify | Add `delete_movements(ids: Vec<String>) -> AppResult<usize>` |
| `src-tauri/src/lib.rs` | Modify | Register `delete_movements` in invoke_handler |
| `src/lib/api.ts` | Modify | Add `deleteMovements(ids: string[]): Promise<number>` |
| `src/pages/Movements.tsx` | Modify | Add `sortKey`, `sortDirection`, `page`, `pageSize`, `selectedIds` state; default-year effect; wire paginated + sorted data to table |
| `src/components/MovementsTable.tsx` | Modify | Add sortable column headers, checkboxes per row, pagination controls, selection-aware actions |
| `src/components/FiltersBar.tsx` | Modify | Auto-select most recent year when `years` populated and filter empty |

## Interfaces / Contracts

### Rust — new command
```rust
// models.rs — no changes to MovementFilter

// commands.rs — new
#[tauri::command]
pub fn delete_movements(ids: Vec<String>, state: State<AppState>) -> AppResult<usize>

// workbook.rs — new public method
pub fn delete_movements(&mut self, ids: &[String]) -> AppResult<usize> {
    // 1. Collect rows from id_by_row (skip missing)
    // 2. Sort reverse (bottom-up)
    // 3. For each: shift all cells from row+1..max_row up, clear last row, shrink table
    // 4. rebuild_index() once
    // 5. Return count
}
```

### TypeScript — no model changes
```typescript
// types.ts — no changes to MovementFilter or Movement
// api.ts — new method
deleteMovements: (ids: string[]) => invoke<number>("delete_movements", { ids })
```

### Frontend state shape
```typescript
type SortKey = "date" | "amount" | "category" | "kind" | "necessary";
type SortDirection = "asc" | "desc";

// in MovementsPage:
const [sortKey, setSortKey] = useState<SortKey>("date");
const [sortDir, setSortDir] = useState<SortDirection>("desc");
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(30);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

### Batch delete algorithm
```rust
fn delete_row(&mut self, row: u32) -> AppResult<()> {
    let sheet = self.book.get_sheet_by_name_mut(REGISTRO).unwrap();
    let (_, max_row) = sheet.get_highest_column_and_row();
    // Shift each column from row..=max_row
    for r in row..max_row {
        for col in [COL_FECHA, COL_CATEGORIA, COL_INGRESO, COL_GASTO, COL_NECESARIO, COL_DESCRIPCION] {
            let v = sheet.get_value((col, r + 1));
            // same per-cell logic as current delete_movement
        }
        apply_formula_columns(sheet, r, r - 1);
    }
    // Clear last row, shrink table
    Ok(())
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (Rust) | `delete_movements` deletes multiple IDs, updates index, handles missing IDs | Add to `workbook_integration.rs`: create 3 movements, delete 2, verify count and remaining |
| Unit (TS) | Sort/pagination produces correct slice | Colocated test with MovementsTable: sort by amount asc, check first row |
| Integration | `delete_movements` command returns deleted count | Tauri command test via `cargo test` |
| E2E | Checkbox selection, batch delete confirmation, page navigation | Manual (existing app pattern) |

## Migration / Rollout

No migration required. The new `delete_movements` command is additive; old `delete_movement` stays. The default year effect runs only when `filter.years` is empty — existing saved state is unaffected.

## Open Questions

- None.
