# Movement Listing UI Specification

## Purpose

Defines the enhanced listing behavior for the Movements page: multi-select with bulk delete, client-side column sorting, client-side pagination, a default year filter on page load, filter UX polish, category-grouped view toggle, dual pagination with "all" option, and table layout refinements.

## Requirements

### Requirement: Multi-Select Movement Deletion

The system MUST display a checkbox in each movement row and a select-all checkbox in the table header. The system MUST show a bulk-delete action that is enabled only when at least one movement is selected. Before deletion, the system MUST show a confirmation dialog stating the number of movements to delete. After successful deletion, the system MUST clear the selection and refresh the table.

#### Scenario: Select and delete multiple movements

- GIVEN the filtered list contains 50 movements
- WHEN the user checks 3 row checkboxes and clicks the delete-selected action
- THEN a confirmation dialog shows the delete message with count
- AND confirming calls the batch-delete command with the 3 selected IDs
- AND the table refreshes without those 3 movements
- AND the selection is cleared

#### Scenario: Select-all toggles all rows on current page

- GIVEN the table displays page 1 of 30 movements
- WHEN the user clicks the header select-all checkbox
- THEN all 30 visible rows become selected
- AND clicking the header checkbox again deselects all rows

#### Scenario: Delete all movements on last page

- GIVEN the filtered list contains 35 movements with page size 30 (page 2 has 5)
- WHEN the user selects all 5 on page 2, deletes them, and confirms
- THEN the table navigates to page 1 showing 30 movements
- AND the total count updates to 30

#### Scenario: No movements after bulk delete

- GIVEN the filtered list contains exactly 2 movements and both are selected
- WHEN the user deletes them and confirms
- THEN the table displays the empty-state message
- AND the selection is cleared

### Requirement: Column Sorting

The system MUST support sorting by date, amount, category, kind, necessary, and description columns. The default sort MUST be date descending. Clicking a column header MUST toggle between ascending and descending order for that column. The system MUST display a visual indicator (arrow icon) showing the active sort column and direction. Sorting MUST use raw numeric values for amount and parsed dates for date, not formatted strings.

#### Scenario: Default sort on page load

- GIVEN the Movements page loads with filtered results
- WHEN no explicit sort has been chosen
- THEN movements are displayed sorted by date descending

#### Scenario: Click column header to sort ascending

- GIVEN the current sort is date descending
- WHEN the user clicks the "Amount" column header
- THEN movements are re-sorted by amount ascending
- AND an up-arrow indicator appears on the Amount header

#### Scenario: Click same header again to reverse direction

- GIVEN the current sort is amount ascending
- WHEN the user clicks the "Amount" header again
- THEN movements are re-sorted by amount descending
- AND the indicator changes to a down-arrow

#### Scenario: Click different header resets to descending

- GIVEN the current sort is amount ascending
- WHEN the user clicks the "Category" header
- THEN movements are sorted by category descending
- AND the sort indicator moves to the Category column

### Requirement: Pagination

The system MUST paginate filtered results on the client side. The default page size MUST be 30. The system MUST offer page-size options of 10, 30, 50, 100, and "Todos" (all). The system MUST display pagination controls both above and below the table. The system MUST display Prev/Next navigation buttons and current page indicator. Totals (income, expense, balance) MUST reflect ALL filtered results regardless of the current page. When a filter changes, the system MUST reset to page 1.

#### Scenario: Default pagination on load

- GIVEN the filtered list contains 85 movements
- WHEN the page loads
- THEN page 1 displays movements 1–30
- AND totals reflect all 85 movements
- AND pagination controls appear both above and below the table

#### Scenario: Change page size

- GIVEN the user is viewing page 1 with page size 30
- WHEN the user selects page size 50
- THEN the table displays movements 1–50 on page 1
- AND the total page count updates to 2

#### Scenario: Navigate to next page

- GIVEN the filtered list has 85 movements with page size 30
- WHEN the user clicks Next
- THEN the table displays movements 31–60 on page 2
- AND totals remain unchanged (still reflect all 85)

#### Scenario: Filter change resets to page 1

- GIVEN the user is on page 3 of results
- WHEN the user changes the year filter
- THEN the table resets to page 1 with the new filtered results

#### Scenario: Select "Todos" shows all rows

- GIVEN the filtered list contains 120 movements
- WHEN the user selects "Todos" from the page size dropdown
- THEN all 120 movements are displayed on a single page
- AND pagination navigation buttons are hidden or disabled
- AND both top and bottom pagination show page "1 of 1"

#### Scenario: Empty filtered results

- GIVEN the user applies a filter that matches zero movements
- THEN the table displays the empty-state message
- AND pagination controls are hidden

### Requirement: Default Year Filter

The system MUST auto-select the most recent year from the available years list when the Movements page loads and no year is currently selected. The system MUST NOT re-apply the default if the user manually clears the year filter. If no years are available (empty workbook), no year filter is applied.

#### Scenario: Auto-select most recent year on first load

- GIVEN the workbook contains movements from years 2024, 2025, and 2026
- WHEN the user navigates to the Movements page
- THEN the year filter is pre-selected to 2026
- AND the movements list shows only 2026 entries

#### Scenario: User clears year filter

- GIVEN the year filter was auto-selected to 2026
- WHEN the user manually clears the year selection
- THEN movements from all years are displayed
- AND navigating away and back does NOT re-select 2026

#### Scenario: Empty workbook has no default year

- GIVEN the workbook contains zero movements
- WHEN the user navigates to the Movements page
- THEN no year filter is applied
- AND the empty-state message is displayed

### Requirement: Filter Visual Polish

The system MUST display filter labels positioned closely above their corresponding select triggers. When a filter has one or more active values selected, its trigger button MUST visually indicate the active state (e.g., a different border or background color). The Necessary filter MUST include a third option for "Sin asignar" (null/unassigned). The Category filter dropdown MUST include a text search input that filters the visible category options.

#### Scenario: Filter shows active state

- GIVEN the year filter has no values selected
- WHEN the user selects year 2026
- THEN the year filter trigger button changes appearance to indicate it is active
- AND clearing the selection restores the default appearance

#### Scenario: Necessary filter includes unassigned option

- GIVEN the Necessary filter dropdown is open
- WHEN the user views the options
- THEN options include "Sí" (true), "No" (false), and "Sin asignar" (null)
- AND selecting "Sin asignar" filters movements where necessary is null

#### Scenario: Category filter search

- GIVEN the Category filter dropdown is open with 30 categories
- WHEN the user types "super" in the search input
- THEN only categories whose names contain "super" (case-insensitive) are shown
- AND the "(sin categoría)" option remains visible
- AND clearing the search restores all options

#### Scenario: Category filter search with no results

- GIVEN the Category filter dropdown is open
- WHEN the user types a string that matches no category
- THEN a "Sin resultados" message is displayed

### Requirement: Category-Grouped View

The system MUST provide a toggle between the existing flat table view ("Lista") and a category-grouped view ("Por categoría"). The grouped view MUST organize movements by category into collapsible sections. All groups MUST be collapsed by default. Each group section MUST display a compact table without the category column, supporting the same sort keys (date, description, kind, amount, necessary). Groups MUST show the category name and movement count in the section header. Expanding a group MUST reveal its movements sorted according to the active sort configuration for that group.

#### Scenario: Toggle to grouped view

- GIVEN the user is viewing the flat table with 50 movements across 8 categories
- WHEN the user clicks the "Por categoría" tab
- THEN 8 collapsed category groups are displayed
- AND each group header shows the category name and movement count

#### Scenario: Expand a category group

- GIVEN the grouped view shows collapsed groups
- WHEN the user clicks the "Supermercado" group header
- THEN the group expands showing a compact table with columns: Fecha, Descripción, Tipo, Importe, Necesario
- AND the category column is NOT present in the inner table
- AND movements within the group are sorted by date descending by default

#### Scenario: Sort within a group

- GIVEN the "Supermercado" group is expanded, sorted by date descending
- WHEN the user clicks the "Importe" column header in that group's table
- THEN movements within that group re-sort by amount descending
- AND other groups are unaffected

#### Scenario: Collapse a group

- GIVEN the "Supermercado" group is expanded
- WHEN the user clicks the group header again
- THEN the group collapses, hiding its movements

### Requirement: Table Visual Polish

The system MUST reduce excessive whitespace between the description and type columns. Column widths MUST be adjusted so the description column flexibly fills available space while other columns have tighter fixed widths. Row padding MUST be balanced for readability without wasted space.

#### Scenario: Table layout with varied content

- GIVEN movements have descriptions ranging from 5 to 80 characters
- WHEN the table renders
- THEN the description column flexibly occupies remaining space
- AND date, kind, amount, and necessary columns have compact fixed widths
- AND there is no excessive gap between description and type columns
