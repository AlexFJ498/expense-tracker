# Expense Tracker v1.5.4 release

## Objective
Publish the optional necessary classification import fix as signed GitHub Release v1.5.4 with a valid updater manifest.

## Problem and why
The change is verified locally but uncommitted and unavailable to users. Release metadata must match the tag for the existing signed release workflow.

## Scope and constraints
- Authorized destination: `AlexFJ498/expense-tracker` on GitHub; authorized operations: commit, PR, merge, tag, release; credential/session: authenticated local `gh` session.
- Use only this repository. Do not read signing secrets, private attachments, real workbooks, or bank exports. Do not change `develop` or `master`.
- Include only the optional-import change, its spec/tests/task record, and v1.5.4 metadata/release documentation. Preserve unrelated work.
- Strict TDD is enabled by project instructions. Import behavior's frontend RED/GREEN and Rust persistence regression were already observed in the previous task; no new product behavior is planned for version metadata.
- Verification runners: `npm test`, `npm run build`, `cargo test` from `src-tauri`, `npm run tauri build`, `npm audit`, and release manifest Node tests; use signed CI preflight for platform signing proof.
- Route: delegated direct preparation (multiple non-trivial files), parent-owned publication. Delivery strategy: ask-on-risk; forecast below 400 authored changed lines. One feature branch and one reviewable PR.

## Tasks
- [x] R1: Prepare v1.5.4 metadata and release spec alongside the import fix; run publication/security gates and functional checks; create a Conventional Commit. Check: versions aligned, gate/check outputs recorded, commit contains intended files only.
- [ ] R2: Push feature branch using the authorized `gh` session, open PR to `main`, and merge only after required secret-free CI passes. Check: PR and merge identities recorded.
- [ ] R3: Run signed main preflight, tag the verified merge commit `v1.5.4`, and verify tag workflow, GitHub Release assets, and `latest.json`. Check: all supported platform builds, signatures, and manifest validated.

## Acceptance
- App/package/Cargo/Tauri versions equal 1.5.4 and GitHub Release tag equals `v1.5.4`.
- Import fix reaches `main` through a passing PR; signed release preflight succeeds before tag publication.
- Release assets and updater manifest are published and verified without exposing credentials or private data.

## Progress and next step
- Current: version metadata now aligns to `1.5.4` in the five release files. Release spec `.codex/specs/2026-09-25-release-v1.5.4.md` records the existing secret-free PR, signed manual `main` preflight, and tag publication flow. The import fix remains uncommitted on `codex/v1.5.4-optional-import`, based on `origin/main` at `2152612`.
- Local checks: `node --test scripts/*.node-tests.mjs` passed 13/13; `npm test` passed 53/53; `npm run build` passed with the existing Vite dynamic/static import warning; `CARGO_NET_OFFLINE=true cargo test` passed 51/51; `npm audit --offline` reported zero vulnerabilities from local cache; `git diff --check` passed.
- Release-sensitive local build: `CARGO_NET_OFFLINE=true npm run tauri build` compiled the app and generated Windows MSI/NSIS bundles, then exited 1 because `TAURI_SIGNING_PRIVATE_KEY` is absent. Do not inspect or inject local signing credentials; signed manual `main` CI preflight remains the required release proof.
- Security gate: the bundled `screening-commits-for-security/scripts/security_gate.py` passed both changed and staged scopes (13 intended files, no findings). Publishable tracked paths have no workbook exports, AppleDouble, or local agent/session folders.
- Work-unit commit: `571bc1e91df9ddff2ff1f255fdf70b71922b7ec3` (`fix(import): allow unspecified necessary in v1.5.4`), based on `2152612`. Native committed-only assessment: medium, `review_due: false` (`under_budget`). No native review was due for this slice.
- Next: run fresh post-commit verification, push the authorized feature branch, create the PR, and wait for secret-free CI before merge.
