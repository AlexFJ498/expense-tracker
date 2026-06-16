# Design: Custom Import Rules

## Technical Approach

Add a `rules.rs` engine that matches `ParsedImportRow.description` against user-defined rules using case-insensitive `Equals`/`Contains`. Rules live in `AppConfig` (global, not per-workbook). A new `ImportRules` page at `/import-rules` provides CRUD. Import step 3 calls `evaluate_import_rules` once after file parse and renders suggestions per row. Multi-rule matches show a conflict badge — no auto-assignment.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Rule storage | `AppConfig` (global) | Per-workbook in Excel | Config is simpler, matches user expectation of "set once, apply everywhere" |
| Engine location | Rust module `rules.rs` | Frontend JS | Single source of truth, avoid serializing all rules to frontend, faster at scale |
| Case sensitivity | Case-insensitive (lowercase normalize) | Exact match, configurable | Matches bank data reality; short-value noise is acceptable tradeoff |
| Conflict handling | Show list, leave empty | Auto-pick first, require priority | User must decide; auto-pick hides data loss risk |

## Data Flow

```
  [ImportRules Page] ──CRUD──→ [commands.rs] ──read/write──→ [config.rs (AppConfig)]
                                                                     │
  [Import Step 3] ──calls──→ [commands::evaluate_import_rules] ──reads──┘
        │                          │
        │                    [rules.rs engine]
        │                          │
        └──── renders suggestions ──┘
```

## Interfaces / Contracts

### Rust — `src-tauri/src/models.rs` (new types)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuleField { Description }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuleOperator { Equals, Contains }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportRule {
    pub id: String,              // UUID v4
    pub name: String,
    pub description: String,
    pub field: RuleField,
    pub operator: RuleOperator,
    pub value: String,
    pub category: String,
    pub necessary: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MatchedRule {
    pub rule_id: String,
    pub category: String,
    pub necessary: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RuleMatchResult {
    pub source_row: u32,
    pub matches: Vec<MatchedRule>,
}
```

### TypeScript — `src/lib/types.ts`

```typescript
export type RuleField = "description";
export type RuleOperator = "equals" | "contains";
export interface ImportRule {
  id: string; name: string; description: string;
  field: RuleField; operator: RuleOperator;
  value: string; category: string; necessary: boolean | null;
}
export interface MatchedRule {
  rule_id: string; category: string; necessary: boolean | null;
}
export interface RuleMatchResult {
  source_row: number; matches: MatchedRule[];
}
```

### Commands — `src-tauri/src/commands.rs`

| Command | Input | Output |
|---------|-------|--------|
| `list_import_rules` | `State<AppState>` | `Vec<ImportRule>` |
| `create_import_rule` | `ImportRule` (without id) + `State` | `ImportRule` |
| `update_import_rule` | `id: String, rule: ImportRule` + `State` | `ImportRule` |
| `delete_import_rule` | `id: String` + `State` | `()` |
| `evaluate_import_rules` | `rows: Vec<ParsedImportRow>` + `State` | `Vec<RuleMatchResult>` |

Validations: name must be non-empty and unique (case-insensitive), value non-empty, max 50 rules.

### API — `src/lib/api.ts`

```typescript
listImportRules: () => invoke<ImportRule[]>("list_import_rules"),
createImportRule: (rule: Omit<ImportRule, "id">) => invoke<ImportRule>("create_import_rule", { rule }),
updateImportRule: (id: string, rule: ImportRule) => invoke<ImportRule>("update_import_rule", { id, rule }),
deleteImportRule: (id: string) => invoke<void>("delete_import_rule", { id }),
evaluateImportRules: (rows: ParsedImportRow[]) => invoke<RuleMatchResult[]>("evaluate_import_rules", { rows }),
```

## Rule Engine — `src-tauri/src/rules.rs`

```
evaluate(row, rules):
  for each rule:
    skip if rule.value is empty
    normalize row.description to lowercase
    normalize rule.value to lowercase
    match rule.operator:
      Equals  → description == value
      Contains → description.contains(value)
    if match → push RuleMatchResult
```

The engine is pure (no state dependency) — receives `&[ParsedImportRow]` and `&[ImportRule]`, returns `Vec<RuleMatchResult>`. Commands load rules from config and pass them in.

## Persistence

Add `#[serde(default)] pub import_rules: Vec<ImportRule>` to `AppConfig`. Existing configs without the field deserialize to empty vec. Rules persist immediately on every CRUD mutation via `config.save()`.

## Routing & Navigation

- Route: `/import-rules` → lazy-loaded `ImportRulesPage`
- Sidebar: add `{ to: "/import-rules", label: "Reglas", icon: FileRule }` (use `FileSearch` lucide icon)
- CRUD UI: table view with inline edit dialog (Radix `Dialog`), confirmation on delete

## Wireframes (text)

### Import Step 3 — row with rule match

```
| Fecha | Descripción        | Categoría       | Necesario | Incluir |
|-------|-------------------|-----------------|-----------|---------|
| [date]| "MERCADONA 14:30" | [Food        ▼] | [Yes    ▼]| [✓]     |
|       |                    ^ suggested by "Groceries" rule     |
```

### Conflict indicator

```
| "PAYMENT AT MARKET"  | [Select...   ▼] | [Pendiente ▼]| [✓] |
|                       ^ ⚠ 2 rules matched — manual pick req.  |
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/src/rules.rs` | Create | Pure matching engine |
| `src-tauri/src/models.rs` | Modify | Add `ImportRule`, `RuleField`, `RuleOperator`, `MatchedRule`, `RuleMatchResult` |
| `src-tauri/src/commands.rs` | Modify | Add 5 rule commands |
| `src-tauri/src/lib.rs` | Modify | Register `mod rules`, register commands |
| `src-tauri/src/config.rs` | Modify | Add `import_rules: Vec<ImportRule>` |
| `src/lib/types.ts` | Modify | Mirror new Rust types |
| `src/lib/api.ts` | Modify | Add 5 API wrappers |
| `src/pages/ImportRules.tsx` | Create | Rule CRUD page |
| `src/pages/ImportData.tsx` | Modify | Wire step 3 to rule evaluation |
| `src/App.tsx` | Modify | Add lazy route for `/import-rules` |
| `src/components/Sidebar.tsx` | Modify | Add nav entry |
| `src-tauri/tests/rules_integration.rs` | Create | Rule engine integration tests |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (Rust) | `rules.rs` — equals/contains, case-insensitive, empty value skip, multi-match | Pure fn tests, no state |
| Unit (Rust) | Config deserialization — backward compat without `import_rules` | JSON roundtrip |
| Integration (Rust) | CRUD commands — create/update/delete/list, 50-rule cap, duplicate name | Through `AppState` with temp config |
| Integration (Rust) | `evaluate_import_rules` command — full flow with `ParsedImportRow` | Through `AppState` |
| Unit (TS) | Rule API wrappers — invoke params | Mock `invoke` |
| E2E | Import step 3 shows suggestions/conflicts | Manual check |

## Migration / Rollout

Add `#[serde(default)]` field — no migration needed. Old configs load with empty rules.

## Risk: Short-Value Noise in Contains

`Contains` with a 2-3 char value (e.g., "PA") can match unintended rows. Acceptable: user controls rule creation and can delete/refine noisy rules. Future: add `min_value_length` validation (e.g., 3 chars) if needed.

## Open Questions

- [ ] Lucide icon for "Reglas" in sidebar — `FileSearch` or `FileCode`? Check existing icon set.
