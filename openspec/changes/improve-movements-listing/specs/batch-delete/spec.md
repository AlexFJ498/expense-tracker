# Batch Delete Specification

## Purpose

Defines the backend batch-delete command that removes multiple movements by ID in a single operation, maintaining workbook integrity and the `id_by_row` index.

## Requirements

### Requirement: Batch Delete Command

The system MUST provide a Tauri command `delete_movements` that accepts a list of movement IDs (`Vec<String>`). The command MUST remove the corresponding rows from the Excel workbook in reverse index order to prevent row-shifting corruption. After removal, the command MUST rebuild the `id_by_row` index atomically. The command MUST mark the workbook as dirty. The command MUST return the count of successfully deleted movements.

#### Scenario: Delete multiple movements successfully

- GIVEN the workbook contains movements with IDs ["a", "b", "c", "d", "e"]
- WHEN `delete_movements(["b", "d"])` is called
- THEN rows for "b" and "d" are removed from the worksheet
- AND the `id_by_row` index is rebuilt with remaining IDs ["a", "c", "e"] in correct row order
- AND the workbook dirty flag is set to true
- AND the command returns 2

#### Scenario: Delete with some invalid IDs

- GIVEN the workbook contains movements with IDs ["a", "b", "c"]
- WHEN `delete_movements(["a", "z"])` is called (where "z" does not exist)
- THEN only row "a" is removed
- AND the index is rebuilt with ["b", "c"]
- AND the command returns 1

#### Scenario: Delete with all invalid IDs

- GIVEN the workbook contains movements with IDs ["a", "b"]
- WHEN `delete_movements(["x", "y"])` is called
- THEN no rows are removed
- AND the index is unchanged
- AND the command returns 0

#### Scenario: Delete empty list

- GIVEN the workbook is in a valid state
- WHEN `delete_movements([])` is called
- THEN no rows are removed
- AND the command returns 0

#### Scenario: Delete all movements

- GIVEN the workbook contains exactly 3 movements ["a", "b", "c"]
- WHEN `delete_movements(["a", "b", "c"])` is called
- THEN all 3 data rows are removed (header row preserved)
- AND the `id_by_row` index is empty
- AND the command returns 3

### Requirement: MovementFilter Optional Fields

The system MUST add optional sort and pagination fields to `MovementFilter` in both Rust (`models.rs`) and TypeScript (`types.ts`). These fields MUST default to `None`/`null` so that existing callers (especially `get_analytics`) are unaffected. When sort fields are `None`, the backend MUST return movements in their natural workbook order.

#### Scenario: Analytics unaffected by new fields

- GIVEN `get_analytics` calls `list_movements(&MovementFilter::default())`
- WHEN sort and pagination fields are `None`
- THEN all movements are returned without sorting or pagination applied

#### Scenario: Frontend passes sort fields

- GIVEN the user sorted by amount descending
- WHEN the frontend calls `list_movements` with sort fields set
- THEN the backend receives the sort parameters (even if currently unused server-side)
