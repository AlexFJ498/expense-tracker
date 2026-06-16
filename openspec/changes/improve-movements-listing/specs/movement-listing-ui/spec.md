# Movement Listing UI Specification

## Purpose

Defines the enhanced listing behavior for the Movements page: multi-select with bulk delete, client-side column sorting, client-side pagination, and a default year filter on page load.

## Requirements

### Requirement: Multi-Select Movement Deletion

The system MUST display a checkbox in each movement row and a select-all checkbox in the table header. The system MUST show a bulk-delete action that is enabled only when at least one movement is selected. Before deletion, the system MUST show a confirmation dialog stating the number of movements to delete. After successful deletion, the system MUST clear the selection and refresh the table.

#### Scenario: Select and delete multiple movements

- GIVEN the filtered list contains 50 movements
- WHEN the user checks 3 row checkboxes and clicks the delete-selected action
- THEN a confirmation dialog shows "Delete 3 movements?"
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

The system MUST support sorting by date, amount, category, and kind columns. The default sort MUST be date descending. Clicking a column header MUST toggle between ascending and descending order for that column. The system MUST display a visual indicator (arrow icon) showing the active sort column and direction. Sorting MUST use raw numeric values for amount and parsed dates for date, not formatted strings.

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

#### Scenario: Click different header resets to ascending

- GIVEN the current sort is amount descending
- WHEN the user clicks the "Category" header
- THEN movements are sorted by category ascending
- AND the sort indicator moves to the Category column

### Requirement: Pagination

The system MUST paginate filtered results on the client side. The default page size MUST be 30. The system MUST offer page-size options of 10, 30, 50, and 100. The system MUST display Prev/Next navigation buttons and current page indicator. Totals (income, expense, balance) MUST reflect ALL filtered results regardless of the current page. When a filter changes, the system MUST reset to page 1.

#### Scenario: Default pagination on load

- GIVEN the filtered list contains 85 movements
- WHEN the page loads
- THEN page 1 displays movements 1–30
- AND totals reflect all 85 movements

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
