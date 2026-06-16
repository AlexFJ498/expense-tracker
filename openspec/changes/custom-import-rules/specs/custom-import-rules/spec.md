# Custom Import Rules Specification

## Purpose

User-defined global rules that auto-suggest category and necessary flag during bank import, reducing manual categorization in step 3 of the import wizard.

## Data Model

| Struct | Field | Type | Notes |
|--------|-------|------|-------|
| `ImportRule` | `id` | `String` | UUID v4 |
| | `name` | `String` | Non-empty display label |
| | `description` | `String` | Optional notes |
| | `field` | `RuleField` | Enum — currently only `Description` |
| | `operator` | `RuleOperator` | Enum — `Equals` \| `Contains` |
| | `value` | `String` | Match target, non-empty |
| | `category` | `String` | Suggested category name |
| | `necessary` | `Option<bool>` | Suggested necessary flag |
| `RuleMatchResult` | `source_row` | `u32` | Parsed row reference |
| | `matches` | `Vec<MatchedRule>` | All rules that matched this row |
| `MatchedRule` | `rule_id` | `String` | |
| | `category` | `String` | |
| | `necessary` | `Option<bool>` | |

TypeScript mirrors all structs in `src/lib/types.ts`.

## Requirements

### Requirement: Rule Persistence in AppConfig

The system SHALL store `Vec<ImportRule>` in `AppConfig` with `#[serde(default)]` for backward compatibility. Rules MUST persist across workbooks and app restarts.

#### Scenario: Existing config without rules loads successfully

- GIVEN a `config.json` serialized before this feature
- WHEN the app loads the config
- THEN deserialization succeeds with an empty `import_rules` vector

### Requirement: Rule CRUD Commands

The system SHALL expose Tauri commands: `list_import_rules`, `create_import_rule`, `update_import_rule`, `delete_import_rule`.

#### Scenario: Create valid rule

- GIVEN 49 active rules and no rule named "Groceries"
- WHEN user creates a rule with name "Groceries", field `Description`, operator `Contains`, value "mercadona", category "Food"
- THEN the rule is persisted and returned with a generated UUID

#### Scenario: Reject creation at 50-rule limit

- GIVEN 50 active rules
- WHEN user attempts to create rule 51
- THEN the command returns an error

#### Scenario: Reject duplicate rule name

- GIVEN a rule named "Rent" exists
- WHEN user creates another rule named "rent"
- THEN the command returns a case-insensitive duplicate error

#### Scenario: Update existing rule

- GIVEN rule with id `abc-123`
- WHEN user updates its value from "lidl" to "mercadona"
- THEN the rule is updated in place; other rules are unchanged

#### Scenario: Delete rule

- GIVEN rule with id `abc-123`
- WHEN user deletes it
- THEN the rule is removed from config; remaining rules are unaffected

### Requirement: Rule Evaluation Engine

The system SHALL expose `evaluate_import_rules(rows, rules) -> Vec<RuleMatchResult>`. Each rule's `field`/`operator`/`value` is tested against each row's `description`.

#### Scenario: Single `contains` match

- GIVEN rule: contains "mercadona" → category "Food", necessary `true`
- WHEN a row has description "PAGO MERCADONA 14:30"
- THEN result has exactly one match with category "Food" and necessary `true`

#### Scenario: Single `equals` match

- GIVEN rule: equals "Netflix" → category "Subscriptions"
- WHEN a row has description "NETFLIX" (case-insensitive)
- THEN result has exactly one match

#### Scenario: `equals` rejects partial match

- GIVEN rule: equals "Netflix" → category "Subscriptions"
- WHEN a row has description "NETFLIX PREMIUM"
- THEN result has zero matches

#### Scenario: Multiple rules match same row

- GIVEN rule A (contains "market" → "Food") and rule B (contains "payment" → "Bills")
- WHEN a row has description "PAYMENT AT MARKET"
- THEN result has two matches; no auto-assignment occurs

#### Scenario: No rules match

- GIVEN one rule: contains "mercadona" → "Food"
- WHEN a row has description "AWS SERVICE CHARGE"
- THEN result has zero matches

#### Scenario: Malformed rule skipped gracefully

- GIVEN a rule with empty `value` in config (corrupted)
- WHEN evaluation runs
- THEN the malformed rule is skipped; other rules evaluate normally

### Requirement: Rule Management UI

The system SHALL provide a route `/import-rules` with a navigation link in the sidebar.

#### Scenario: List rules

- GIVEN 3 persisted rules
- WHEN user navigates to the rules page
- THEN a table displays all 3 rules with name, field, operator, value, category, and necessary columns

#### Scenario: Create rule via dialog

- GIVEN the rules page is open and rule count < 50
- WHEN user clicks "New Rule" and fills the form (name, description, field, operator, value, category, necessary)
- THEN the rule is created and appears in the table

#### Scenario: Create disabled at limit

- GIVEN 50 rules exist
- WHEN user views the rules page
- THEN the "New Rule" button is disabled with a tooltip "Maximum 50 rules reached"

#### Scenario: Edit existing rule

- GIVEN a rule "Groceries" in the table
- WHEN user clicks edit, changes value to "mercadona", and saves
- THEN the rule updates and the table reflects the change

#### Scenario: Delete rule with confirmation

- GIVEN a rule in the table
- WHEN user clicks delete
- THEN a confirmation dialog appears; on confirm, the rule is removed

#### Scenario: Empty state

- GIVEN zero rules
- WHEN user views the rules page
- THEN an empty state message is shown: "No import rules yet"

### Requirement: Category Auto-Creation from Rules

When a rule suggests a category that does not exist in the workbook, the import flow MUST auto-create it using the existing `new_categories` mechanism in `confirm_import`.

#### Scenario: Rule suggests new category

- GIVEN rule → category "Delivery" which does not exist in the workbook
- WHEN user accepts the suggestion and confirms import
- THEN "Delivery" is included in `new_categories` and created during import

### Requirement: Nonexistent Category in Rule

A rule MAY reference a category that does not yet exist. The rule is still stored and evaluated normally. The category is auto-created at import confirmation time.

#### Scenario: Create rule with nonexistent category

- GIVEN categories ["Food", "Transport"] exist
- WHEN user creates a rule with category "Streaming"
- THEN the rule is created successfully
