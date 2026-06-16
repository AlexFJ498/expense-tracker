# Delta for Import Data

## ADDED Requirements

### Requirement: Rule Suggestions in Import Step 3

After parsing an import file (step "complete"), the system SHALL call `evaluate_import_rules` with the parsed rows and all active rules. The results MUST be used to pre-fill or flag each draft row.

#### Scenario: Single match pre-fills category and necessary

- GIVEN one rule matches row 5 (category "Food", necessary `true`)
- WHEN step 3 renders
- THEN row 5's category dropdown shows "Food" and necessary shows "Yes"
- AND the user can override both fields before confirming

#### Scenario: Multiple matches show conflict indicator

- GIVEN two rules match row 5
- WHEN step 3 renders
- THEN row 5's category and necessary remain empty
- AND a visual badge shows "2 rules matched — manual pick required"

#### Scenario: No match preserves current behavior

- GIVEN zero rules match row 5
- WHEN step 3 renders
- THEN row 5's category and necessary remain in their default empty state

#### Scenario: Rule suggestions are overridable

- GIVEN a rule pre-filled category "Food" on row 5
- WHEN user changes category to "Entertainment"
- THEN the user's selection takes precedence; the rule suggestion is discarded

#### Scenario: Evaluation runs once after file parse

- GIVEN the user has 10 active rules and parsed 50 rows
- WHEN the file parse completes and step 3 loads
- THEN `evaluate_import_rules` is called exactly once with all 50 rows and 10 rules
- AND results are cached for the duration of step 3
