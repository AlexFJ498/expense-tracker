# Description In Movements

## Intent
- Goal: show the movement description in the movements list.
- User value: imported or typed bank concepts are visible without opening each movement.
- Non-goals: change workbook column layout beyond the already added description field.

## Slice
- Frontend: render description in `MovementsTable`; preserve/edit it in `MovementForm`.
- Tauri commands/API: no new command.
- Workbook/Excel: no additional behavior in this slice.
- Analytics: unchanged.
- Tests: focused component tests plus existing frontend verification.

## Context To Read
- Must read: `src/components/MovementsTable.tsx`, `src/components/MovementForm.tsx`, `src/lib/types.ts`.
- Read only if needed: `src/pages/Movements.tsx`, `src/pages/ImportData.tsx`.
- Do not read: generated/build folders or real workbook exports.

## Contract
- TypeScript models to add/change: `MovementTableItem` accepts `description`.
- Rust models to add/change: none in this slice.
- Tauri commands to add/change: none.
- Error behavior: unchanged.

## UX
- Entry point: Movements list.
- Empty/loading/error states: keep existing table states.
- Product copy: column label `Descripción`.
- Accessibility notes: preserve form labels for the description input.

## Data Rules
- Source of truth: workbook movement description.
- Dirty/save behavior: unchanged; creating/editing movements includes description in the payload.
- Filtering/sorting: unchanged.
- Excel compatibility: unchanged.

## Tests First
- Frontend failing test: table renders movement descriptions.
- Rust failing test: none, backend contract already exposes the field.
- Manual check: not required if component tests and build pass.

## Subagent Plan
- Frontend owner: main agent.
- Backend owner: none.
- Workbook/analytics owner: none.
- Verifier/reviewer: main agent.
- Shared files to avoid concurrent edits: `src/lib/types.ts`.

## Acceptance
- User-visible result: descriptions appear in the movement list.
- Commands that must pass: `npm test`, `npm run build`.
- Risks left open: existing uncommitted backend workbook changes are outside this UI slice.

## Decision Log
- 2026-06-01: Keep the fix scoped to rendering and preserving the description in movement UI.
