# Optional necessary classification during import

## Objective
Allow included imported movements to reach review and confirmation with `necessary` unspecified (`null`), like an unassigned category.

## Problem and why
The Complete step currently rejects otherwise valid rows when `necessary` is null, although the API and workbook already support null. This forces a classification the user may not know.

## Scope and constraints
- Authorized: import review validation and styling, localized validation copy, focused frontend and workbook regression tests, and the active import feature spec.
- Out of scope: analytics classification changes, unrelated movement editing, workbook format changes.
- Preserve the existing `boolean | null` / `Option<bool>` contract and workbook dirty/save behavior.
- Strict TDD: enabled by project instructions; frontend runner `npm test -- src/pages/ImportData.test.tsx`, Rust runner `cargo test import_batch_allows_unspecified_necessary` from `src-tauri`.
- Route: delegated direct, because the slice spans several non-trivial files and requires reading before writing. One writer owns all touched files; verification may be read-only.
- Delivery strategy: ask-on-risk. Forecast: below 400 authored changed lines. No commit or publication without explicit user confirmation, per project AGENTS.md.

## Tasks
- [x] T1: Update the active import spec to make `necessary` optional and define acceptance. Check: spec readback matches user intent.
- [x] T2: Write failing frontend and Rust regression tests, then remove the Complete-step null requirement and error styling; update validation copy. Check: observed frontend RED, then GREEN; all requested checks passed.

## Acceptance
- An included row with valid date and positive amount can be reviewed and confirmed when `necessary` is null.
- An empty necessary value remains empty after workbook save and reopen.
- Invalid date or amount still blocks review; no false/"No" default is introduced.

## Progress and next step
- Current: T1 and T2 complete. Active spec permits `necessary: null` through review, confirmation, save, and reopen. The Complete step no longer rejects or highlights an unspecified necessary value; its empty option reads Unassigned. No production Rust or contract change was needed.
- TDD: `npm test -- src/pages/ImportData.test.tsx` was RED before implementation (3 expected failures, 10 passed); after implementation it passed (13/13). `cargo test import_batch_allows_unspecified_necessary` passed before and after UI changes, proving existing workbook support.
- Verification: `npm test` passed (53/53 across 9 files); `npm run build` passed (TypeScript and Vite; existing dynamic/static import warning); `cargo test` passed (21 unit, 11 rules integration, 19 workbook integration). `git diff --check` passed.
- Parent spot check: `npm test -- src/pages/ImportData.test.tsx` passed (13/13). Native risk assessment with this task file selected and unrelated attachment excluded: medium, `review_due: false` (`under_budget`); no review transaction started.
- Work-unit commit: `571bc1e91df9ddff2ff1f255fdf70b71922b7ec3` on `codex/v1.5.4-optional-import`, containing this verified import behavior together with v1.5.4 metadata. Committed-only assessment remains medium, `under_budget`.
- Pending: no manual Tauri UI check or real bank-file run; no commit or publication without explicit user confirmation. Analytics presentation is unchanged and does not gain a new unspecified bucket.
- Rollback boundary: this spec, `src/pages/ImportData.tsx`, its test, `src/lib/i18n.tsx`, and the focused Rust workbook test; no unrelated behavior or private files were changed.
- Next: parent read-only review and report the outcome to the user; ask for explicit confirmation only if a commit is desired.
