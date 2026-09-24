# Kutxabank amount header compatibility

## Objective
Import Kutxabank exports with `importe de la operación` without breaking exports with `importe`.

## Problem and scope
- The current parser requires the exact normalized header `importe`, so the new export fails header detection.
- The user also authorized repairing four existing frontend test failures and remediating npm audit vulnerabilities that block publication. Do not change the TypeScript/Rust API or unrelated importers.
- Local implementation, commit, publication to configured `origin` using the current GitHub CLI session, and npm registry audit were explicitly confirmed by the user.

## Tasks
- [x] KUT-1 — Update the active import spec; write and observe a failing Rust regression test for the four-column export; accept both amount headers; run focused and full Rust tests. Route: delegated direct (reading before a write and multiple non-trivial files). Acceptance: both header variants parse; missing required headers still fail. Checks: `cargo test imports::kutxabank::tests`, `cargo test` from `src-tauri`. Commit: `1fbfd0e906344030eaf1bc7ae0ac85c268fb8c86`.
- [x] KUT-3 — Repair frontend verification: isolate MovementsTable sessionStorage, mock backupWorkbook in Movements tests, and enforce required `necessary` on included import rows. Route: delegated direct (four-file read and multi-file write). Acceptance: the four failing tests and full frontend suite pass without changing unrelated app behavior. Checks: focused Vitest tests, `npm test`, `npm run build`. Commit: `723b814644b0542b75eed33e78fcc91e70a7ff48`.
- [x] KUT-4 — Resolve npm audit findings with the smallest compatible dependency updates: patch packages within existing ranges and upgrade Vitest to patched 4.1.11, not 5.x. Route: delegated direct (package manifest plus lockfile and install verification). Acceptance: clean `npm ci`, zero npm audit findings, `npm test`, and `npm run build`. Commit: `22d9af450b2bc8b49620f3441cba85c90884d69c`.
- [x] KUT-2 — Run the publication gate, confirm commit and remote destination/session, then create a focused PR. Acceptance: only intended files are published. Checks: publication checklist and security screen. PR [#6](https://github.com/AlexFJ498/expense-tracker/pull/6) is open against `main`; the maintainer approved `size:exception`.

## Execution
- TDD: enabled by project instruction; RED → GREEN → REFACTOR. Runner: `cargo test imports::kutxabank::tests` from `src-tauri`.
- Branch: `codex/fix-kutxabank-amount-header`; `main` remains untouched.
- Delivery strategy: `ask-on-risk`; forecast well below 400 authored changed lines.
- Baseline evidence: Kutxabank RED was 2 passed/1 failed (`InvalidWorkbook` for missing `importe`); GREEN was 3/3 focused tests and 50/50 full Rust tests. Frontend RED was 4 failed/32 passed in targeted tests; GREEN was 36/36 targeted and 51/51 full frontend tests. The initial `npm audit` exited 1 with 11 vulnerabilities (6 high, 3 moderate, 2 low); production-only audit had 5 (4 high, 1 low). Root causes addressed: sessionStorage leakage, missing backupWorkbook test mock, and missing necessary validation. `cargo fmt --check` was unavailable (rustfmt missing).
- Dependency decision: use Vitest 4.1.11 as the first patched 4.x rather than the broader 5.x migration; update Vite within 7.x to admit patched esbuild. Lockfile regeneration may normalize stale root metadata (1.0.2 vs package manifest 1.5.2).
- Dependency outcome: `npm ci --ignore-scripts` passed; `npm audit` and `npm audit --omit=dev` both report 0 vulnerabilities; `npm test` passes 51/51 and `npm run build` passes on Vitest 4.1.11. The lockfile root metadata now matches package version 1.5.2.
- Final publication gate: `npm test` 51/51, `npm run build` passed, `cargo test` 50/50, `npm audit` 0 vulnerabilities, `git diff --check` passed, and eight-file security scan 0 findings. `npm run tauri build` skipped because this is not a release build.
- Review-size decision: the generated package-lock.json alone changes 920 lines across 95 dependency entries; it cannot be split into a coherent under-400 PR while keeping the audit green. The maintainer explicitly approved `size:exception` for one PR; tests and security controls remain mandatory.
- Native review: the three-commit slice was approved and acknowledged under lineage `review-678cf76419d9c9fd`; a non-blocking advisory recommends additional ImportData assertions for false and excluded-row cases. Existing tests cover the null rejection and true path. No correction was requested.
- Runtime harness: N/A for a desktop manual import because no real bank export is retained; synthetic Rust parser and React component tests exercise the changed boundaries.
- Delivery: commits `1fbfd0e`, `723b814`, `22d9af4`, and `344ad84` were pushed to `origin/codex/fix-kutxabank-amount-header`. PR #6 has eight intended changed files and was verified open. The unrelated `.codex-remote-attachments/` remains untracked and excluded.
- Next step: review and merge PR #6; optionally add broader necessary-choice assertions in a separate work unit.
