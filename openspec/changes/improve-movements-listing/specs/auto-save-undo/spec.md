# Auto-Save & Undo Specification

## Purpose

Defines the auto-save behavior that replaces the manual save button, and the single-step undo mechanism that allows reverting the last mutation.

## Requirements

### Requirement: Remove Manual Save

The system MUST remove the "Guardar" button and the "Cambios sin guardar" / "Guardado" status indicator from the Topbar. The system MUST automatically save the workbook after every mutation that changes data (create movement, update movement, delete movement, batch delete movements).

#### Scenario: No save button in Topbar

- GIVEN a workbook is open
- WHEN the Topbar renders
- THEN there is no "Guardar" button
- AND there is no "Cambios sin guardar" indicator
- AND there is no "Guardado" indicator

#### Scenario: Auto-save after creating a movement

- GIVEN the user creates a new movement via the form
- WHEN the movement is successfully created
- THEN the workbook is automatically saved
- AND a success toast notification appears

#### Scenario: Auto-save after batch delete

- GIVEN the user deletes 3 movements via batch delete
- WHEN the deletion completes
- THEN the workbook is automatically saved
- AND a success toast notification appears

### Requirement: Undo Notification

After every mutation that auto-saves, the system MUST display a toast notification that includes the message "Cambios guardados" (or translated equivalent) and a "Deshacer" action button. The undo action MUST revert the workbook to its state before the last mutation.

#### Scenario: Toast shows undo button after mutation

- GIVEN the user updates a movement's amount
- WHEN the auto-save completes
- THEN a toast appears with "Cambios guardados" and a "Deshacer" button
- AND the toast auto-dismisses after a reasonable time (e.g., 5 seconds)

#### Scenario: Undo reverts the last change

- GIVEN a toast with "Deshacer" is visible after updating a movement
- WHEN the user clicks "Deshacer"
- THEN a confirmation dialog appears: "¿Deshacer el último cambio?" with description
- AND upon confirming, the workbook reverts to the state before the mutation
- AND the movements list refreshes showing the reverted data

#### Scenario: Undo confirmation can be cancelled

- GIVEN the undo confirmation dialog is open
- WHEN the user clicks "Cancelar"
- THEN the dialog closes
- AND the workbook remains unchanged
- AND the toast has already dismissed

### Requirement: Undo Mechanism

The system MUST capture a snapshot of the workbook state before executing any mutation. The snapshot MUST be sufficient to restore the workbook to its exact previous state. The system MUST support only one undo step (the most recent mutation). After an undo is performed, no further undo is available until another mutation occurs.

#### Scenario: Snapshot captured before mutation

- GIVEN the workbook has 50 movements
- WHEN the user initiates a batch delete of 3 movements
- THEN a snapshot of the current workbook state is captured
- AND the delete proceeds
- AND the snapshot is retained for potential undo

#### Scenario: Undo restores exact previous state

- GIVEN a snapshot was captured before deleting movement "abc"
- WHEN the user confirms undo
- THEN movement "abc" is restored with its original row, date, category, amount, kind, necessary, and description
- AND the workbook is saved after restoration

#### Scenario: No undo available before first mutation

- GIVEN the app just loaded and no mutations have been made
- WHEN no undo-related UI is shown
- THEN there is no pending undo state

#### Scenario: Undo only available for most recent mutation

- GIVEN the user creates movement A (snapshot 1), then creates movement B (snapshot 2 replaces snapshot 1)
- WHEN the user clicks "Deshacer"
- THEN only movement B is reverted (movement A remains)
- AND no further undo is available
