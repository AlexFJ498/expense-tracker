# Proposal: Custom Import Rules

## Intent
Reduce manual categorization during bank import by letting users define global rules that auto-suggest category and "necessary" flag based on the movement description.

## Scope

### In Scope
- Global rule storage in `AppConfig` (CRUD via new page)
- Rule evaluation engine in Rust (`rules.rs`) matching `description` with `equals`/`contains`
- Integration into import wizard step 3: display rule suggestions per row
- Handle multiple matching rules: show conflict, do not auto-assign
- Auto-create missing categories during import (reuse existing flow)

### Out of Scope
- Rules scoped per workbook
- Additional fields beyond `description` (structure extensible, but not implemented)
- Auto-resolution of multi-rule conflicts
- Bulk edit of existing historical movements

## Capabilities

### New Capabilities
- `custom-import-rules`: CRUD and evaluation of user-defined import rules

### Modified Capabilities
- `import-data`: Step 3 must accept and display rule suggestions alongside manual overrides

## Approach
Store rules in `AppConfig` JSON so they persist across workbooks. Add a `rules.rs` module that receives `ParsedImportRow[]` + `ImportRule[]` and returns per-row suggestions. The frontend wizard step 3 renders suggestions as pre-filled, overridable inputs. If multiple rules match a row, the UI shows the conflict list and leaves fields empty. The rule model uses enums (`RuleField`, `RuleOperator`) to keep the door open for future fields without migration.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src-tauri/src/models.rs` | New | `ImportRule`, `RuleField`, `RuleOperator`, `RuleMatchResult` |
| `src-tauri/src/commands.rs` | Modified | Add CRUD commands + `evaluate_import_rules` |
| `src-tauri/src/lib.rs` | Modified | Register new commands |
| `src-tauri/src/config.rs` | Modified | Persist `Vec<ImportRule>` in `AppConfig` |
| `src-tauri/src/rules.rs` | New | Matching engine: `description` × `equals/contains` |
| `src/lib/types.ts` | New | Mirror Rust models |
| `src/lib/api.ts` | New | Wrap rule commands |
| `src/pages/ImportData.tsx` | Modified | Wire step 3 to rule results |
| `src/App.tsx` | Modified | Add route for rules page |
| `src/components/Sidebar.tsx` | Modified | Add navigation link |
| `src/pages/ImportRules.tsx` | New | Rules CRUD page |
| `src-tauri/tests/` | New | Rule engine integration tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Many rules slow down import parse | Low | Cap at 50 rules; evaluate in-memory O(n×m) with early exit |
| Multi-rule conflict confuses user | Med | Clear UI badge: "N rules matched — manual pick required" |
| Category auto-creation naming drift | Low | Reuse existing import normalization logic |

## Rollback Plan
1. Revert the code changes in the listed files.
2. If persisted `AppConfig` contains rule keys, start the app once on the reverted build to let the old config deserializer ignore unknown fields (serde default).
3. If needed, manually edit `app_config.json` to remove the `import_rules` array.

## Dependencies
None external. Relies on existing import wizard and `AppConfig` infrastructure.

## Success Criteria
- [ ] User can create, edit, delete, and view global import rules
- [ ] Import step 3 shows suggested category/necessary when a single rule matches
- [ ] Import step 3 shows conflict indicator when multiple rules match
- [ ] User can override any suggestion manually before confirming
- [ ] Missing categories are auto-created with the same flow as today
- [ ] `cargo test` and `npm test` pass after changes
