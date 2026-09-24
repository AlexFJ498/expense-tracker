# Expense Tracker v1.5.3 release

## Objective
Publish v1.5.3 from the merged Kutxabank import fix with complete, signed desktop update metadata.

## Problem and scope
- The current GitHub Release endpoint expects a cross-platform `latest.json`, but the existing workflow only uploads installers and platform-specific manifest names. The v1.5.2 `latest.json` asset covers Windows only.
- Version identifiers are 1.5.2 in npm, Cargo, and Tauri metadata.
- Scope: release manifest generation/workflow, synchronized version bump, verification, PR/merge, tag, release validation. Do not alter workbook behavior, read signing secrets, or include private exports/attachments.
- Authorization: user confirmed v1.5.3 publication to `AlexFJ498/expense-tracker` GitHub Releases using the current `gh` session, including necessary commits/tag and updater fix.

## Tasks
- [x] REL-1 — Add a tested, fail-closed cross-platform updater manifest generator and integrate it into the release workflow. Route: delegated direct for generator/test, inline workflow integration. Acceptance: `latest.json` includes signed Windows x64, Linux x64, and macOS arm64 update URLs; missing signatures/artifacts fail the release job. Checks: 11/11 generator tests, workflow YAML/readback, `npm test` 51/51. Generator/spec commit `63a6969` merged as [PR #7](https://github.com/AlexFJ498/expense-tracker/pull/7); workflow integration is in release PR slice 2. Signed CI proof belongs to REL-3.
- [x] REL-2 — Bump npm, Cargo, and Tauri version metadata to 1.5.3 on `codex/release-v1.5.3`. Route: inline mechanical edits. Acceptance: package manifest/lock, Cargo manifest/lock, and Tauri config agree. Checks: six-value consistency, `npm test`, `npm run build`, and `cargo test` passed. Version changes are in release PR slice 2.
- [ ] REL-3 — Run publication and security gates. Route: inline verification plus authorized signed GitHub Actions preflight. Acceptance: `npm test`, `npm run build`, `cargo test`, `npm audit`, signed CI Tauri builds on Windows/Linux/macOS, diff check, and security screen pass; local key/password limitation recorded honestly.
- [ ] REL-4 — Commit scoped work, publish a PR, merge after checks, tag the merge commit `v1.5.3`, observe GitHub Actions, and verify release assets and updater JSON. Route: inline Git/GitHub state transitions. Acceptance: release published with three platform installers and valid `latest.json`; no private files. Checks: PR/branch/tag/release API readback.

## Execution
- TDD: enabled by project instruction; first run a failing manifest-generator test, then implement and rerun it. Runner: `node --test scripts/release-manifest.node-tests.mjs`.
- Delivery: 500 authored changed lines across the full feature, so split into two sequential PRs targeting `main` rather than reuse the separate Kutxabank size exception. Slice 1 contains the tested manifest generator and spec (~378 lines); slice 2 integrates workflow/CI preflight, version metadata, and task evidence (~122 lines). Both must merge before the tag.
- Feature branch starts at merged `origin/main` commit `18c9a1b2a288bd85bf4b7861ba801535365ac69f`.
- Current non-task untracked `.codex-remote-attachments/` remains untouched and unpublished.
- REL-1 evidence: first generator test run failed with `ERR_MODULE_NOT_FOUND`; implementation passed 10/10 synthetic manifest tests, then 11/11 after adding pull-request preflight. Node test file was renamed after Vitest collected the initial `.test.mjs` file and failed while all 51 app tests passed. Final `npm test` passes 51/51. PR #7 merged at `8a28a682fe437db1fd649ef5037781672f3cf8ed`.
- REL-2 evidence: all six npm/Cargo/Tauri version values are 1.5.3; `npm test` 51/51, `npm run build`, `npm audit` (0 vulnerabilities), and `cargo test` 50/50 passed.
- REL-3 blocker: local `npm run tauri build -- --ci` compiled the application and created MSI/NSIS installers, then exited 1 without a signing key. After the user authorized use of the ignored local key solely for this build, a retry with its path exited 1 because the key requires an unavailable password. The key contents were not displayed or published. `cargo fmt --check` is unavailable because `cargo-fmt` is not installed for the active toolchain.
- The user authorized a signed same-repository GitHub Actions pull-request preflight with existing CI secrets. The workflow now runs signed builds and manifest validation on PRs but publishes only for `v*` tag pushes. The PR is the replacement release-sensitive proof; no release tag will be pushed until it passes.
- The generator test file uses `.node-tests.mjs` so Vitest does not collect Node's built-in `node:test` suites as Vitest tests; the initial `npm test` run failed only on that discovery conflict (51/51 app tests passed).
- Next step: commit scoped files, open PR, and wait for signed CI preflight before merge/tag.
