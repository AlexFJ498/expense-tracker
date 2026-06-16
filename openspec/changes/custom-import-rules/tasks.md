# Tasks: Custom Import Rules

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~850–900 |
| 800-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
800-line budget risk: Medium

## Phase 1: Rust Foundation — Types & Config

- [x] 1.1 **TDD**: Write unit test for config backward compat (AppConfig deserializes without `import_rules` → empty vec)
- [x] 1.2 Add `ImportRule`, `RuleField`, `RuleOperator`, `MatchedRule`, `RuleMatchResult` to `src-tauri/src/models.rs`
- [x] 1.3 Add `#[serde(default)] pub import_rules: Vec<ImportRule>` to `AppConfig` in `src-tauri/src/config.rs`

## Phase 2: Rule Engine — Rust

- [x] 2.1 **TDD**: Write failing unit tests for rules engine in `src-tauri/src/rules.rs` (equals, contains, case-insensitive, empty-value skip, multi-match, no-match)
- [x] 2.2 Implement pure `evaluate()` fn in `rules.rs` that passes all unit tests
- [x] 2.3 Register `mod rules` in `src-tauri/src/lib.rs`, export engine via `__internal`

## Phase 3: Commands — Rust

- [x] 3.1 **TDD**: Write integration tests in `src-tauri/tests/rules_integration.rs` (CRUD + evaluate + 50-rule cap + duplicate name)
- [x] 3.2 Implement `list_import_rules`, `create_import_rule`, `update_import_rule`, `delete_import_rule` in `commands.rs` with validation
- [x] 3.3 Implement `evaluate_import_rules` in `commands.rs` pulling rules from config and calling `rules::evaluate()`
- [x] 3.4 Register all 5 new commands in `src-tauri/src/lib.rs` invoke handler

## Phase 4: TypeScript Contract

- [x] 4.1 Add `ImportRule`, `RuleField`, `RuleOperator`, `MatchedRule`, `RuleMatchResult` types to `src/lib/types.ts`
- [x] 4.2 Add `listImportRules`, `createImportRule`, `updateImportRule`, `deleteImportRule`, `evaluateImportRules` wrappers to `src/lib/api.ts`

## Phase 5: Rules Management UI

- [x] 5.1 **TDD**: Write TS unit test for rule API wrappers (mock invoke params)
- [x] 5.2 Create `src/pages/ImportRules.tsx` with table, create/edit Dialog, delete confirmation, empty state, 50-rule limit guard
- [x] 5.3 Add lazy route for `/import-rules` in `src/App.tsx`
- [x] 5.4 Add nav entry with `FileSearch` icon to `src/components/Sidebar.tsx`

## Phase 6: Import Data Integration

- [x] 6.1 Wire `api.evaluateImportRules()` call after `parseFile` completes in `src/pages/ImportData.tsx`, cache results in state
- [x] 6.2 Render single-match rule suggestion on category/necessary fields and multi-match conflict badge per row

## Phase 7: Full Verification

- [x] 7.1 Run `cargo test` from `src-tauri` — all Rust tests pass
- [x] 7.2 Run `npm test` — all frontend tests pass
- [x] 7.3 Run `npm run build` — TypeScript compiles cleanly
- [ ] 7.4 Manual verification: import step 3 shows suggestions/conflicts
