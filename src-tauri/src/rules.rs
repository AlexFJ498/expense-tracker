use crate::models::{ImportRule, MatchedRule, ParsedImportRow, RuleCombinator, RuleField, RuleOperator};

/// Test whether a single rule matches a description string.
/// Empty values are ignored (they would match everything with Contains).
pub fn rule_matches(rule: &ImportRule, description: &str) -> bool {
    let non_empty: Vec<&String> = rule.values.iter().filter(|v| !v.trim().is_empty()).collect();
    if non_empty.is_empty() {
        return false;
    }
    let desc = description.to_lowercase();
    let matches_value = |v: &&String| {
        let val = v.to_lowercase();
        match rule.field {
            RuleField::Concept => match rule.operator {
                RuleOperator::Equals => desc == val,
                RuleOperator::Contains => desc.contains(&val),
            },
        }
    };
    match rule.combinator {
        RuleCombinator::Or => non_empty.iter().any(matches_value),
        RuleCombinator::And => non_empty.iter().all(matches_value),
    }
}

/// Evaluate all rules against all rows, returning per-row match results.
/// Skips rules with empty values. Matches are case-insensitive.
pub fn evaluate(rows: &[ParsedImportRow], rules: &[ImportRule]) -> Vec<crate::models::RuleMatchResult> {
    rows.iter()
        .map(|row| {
            let description = row.description.to_lowercase();
            let matches: Vec<MatchedRule> = rules
                .iter()
                .filter(|rule| !rule.values.is_empty())
                .filter_map(|rule| {
                    let matched = match rule.combinator {
                        RuleCombinator::Or => rule.values.iter().any(|v| {
                            test_value(&description, &v.to_lowercase(), rule.field, &rule.operator)
                        }),
                        RuleCombinator::And => !rule.values.is_empty()
                            && rule.values.iter().all(|v| {
                                test_value(&description, &v.to_lowercase(), rule.field, &rule.operator)
                            }),
                    };
                    if matched {
                        Some(MatchedRule {
                            rule_id: rule.id.clone(),
                            category: rule.category.clone(),
                            necessary: rule.necessary,
                        })
                    } else {
                        None
                    }
                })
                .collect();
            crate::models::RuleMatchResult {
                source_row: row.source_row,
                matches,
            }
        })
        .collect()
}

fn test_value(description: &str, value: &str, field: RuleField, operator: &RuleOperator) -> bool {
    match field {
        RuleField::Concept => match operator {
            RuleOperator::Equals => description == value,
            RuleOperator::Contains => description.contains(value),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_rule(
        id: &str,
        operator: RuleOperator,
        values: Vec<&str>,
        combinator: RuleCombinator,
        category: &str,
        necessary: Option<bool>,
    ) -> ImportRule {
        ImportRule {
            id: id.to_string(),
            name: id.to_string(),
            description: String::new(),
            field: RuleField::Concept,
            operator,
            values: values.iter().map(|v| v.to_string()).collect(),
            combinator,
            category: category.to_string(),
            necessary,
        }
    }

    fn make_row(source_row: u32, description: &str) -> ParsedImportRow {
        ParsedImportRow {
            source_row,
            date: Some("2025-01-01".to_string()),
            description: description.to_string(),
            kind: Some(crate::models::MovementKind::Gasto),
            amount: Some(100.0),
            warnings: vec![],
        }
    }

    // Test: Contains match (single value, OR combinator)
    #[test]
    fn contains_matches_substring_case_insensitive() {
        let rule = make_rule("r1", RuleOperator::Contains, vec!["mercadona"], RuleCombinator::Or, "Food", Some(true));
        let row = make_row(1, "PAGO MERCADONA 14:30");
        let results = evaluate(&[row], &[rule]);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].source_row, 1);
        assert_eq!(results[0].matches.len(), 1);
        assert_eq!(results[0].matches[0].category, "Food");
        assert_eq!(results[0].matches[0].necessary, Some(true));
    }

    // Test: Equals match (case-insensitive)
    #[test]
    fn equals_matches_exact_case_insensitive() {
        let rule = make_rule("r1", RuleOperator::Equals, vec!["Netflix"], RuleCombinator::Or, "Subscriptions", None);
        let row = make_row(5, "NETFLIX");
        let results = evaluate(&[row], &[rule]);
        assert_eq!(results[0].matches.len(), 1);
        assert_eq!(results[0].matches[0].rule_id, "r1");
    }

    // Test: Equals rejects partial match
    #[test]
    fn equals_rejects_partial_match() {
        let rule = make_rule("r1", RuleOperator::Equals, vec!["Netflix"], RuleCombinator::Or, "Subscriptions", None);
        let row = make_row(5, "NETFLIX PREMIUM");
        let results = evaluate(&[row], &[rule]);
        assert_eq!(results[0].matches.len(), 0);
    }

    // Test: OR combinator — matches if any value matches
    #[test]
    fn or_combinator_matches_any_value() {
        let rule = make_rule("r1", RuleOperator::Contains, vec!["mercadona", "lidl"], RuleCombinator::Or, "Food", None);
        let row = make_row(1, "PAGO LIDL");
        let results = evaluate(&[row], &[rule]);
        assert_eq!(results[0].matches.len(), 1);
    }

    // Test: OR combinator — no match if none match
    #[test]
    fn or_combinator_no_match_when_none_match() {
        let rule = make_rule("r1", RuleOperator::Contains, vec!["mercadona", "lidl"], RuleCombinator::Or, "Food", None);
        let row = make_row(1, "PAGO CARREFOUR");
        let results = evaluate(&[row], &[rule]);
        assert_eq!(results[0].matches.len(), 0);
    }

    // Test: AND combinator — matches if ALL values match
    #[test]
    fn and_combinator_matches_all_values() {
        let rule = make_rule("r1", RuleOperator::Contains, vec!["pago", "vivienda"], RuleCombinator::And, "Alquiler", None);
        let row = make_row(1, "PAGO VIVIENDA ENERO");
        let results = evaluate(&[row], &[rule]);
        assert_eq!(results[0].matches.len(), 1);
    }

    // Test: AND combinator — fails if any value doesn't match
    #[test]
    fn and_combinator_fails_if_any_value_missing() {
        let rule = make_rule("r1", RuleOperator::Contains, vec!["pago", "vivienda"], RuleCombinator::And, "Alquiler", None);
        let row = make_row(1, "PAGO SUPERMERCADO");
        let results = evaluate(&[row], &[rule]);
        assert_eq!(results[0].matches.len(), 0);
    }

    // Test: Multiple rules match same row (conflict)
    #[test]
    fn multiple_rules_match_same_row() {
        let rule_a = make_rule("r1", RuleOperator::Contains, vec!["market"], RuleCombinator::Or, "Food", Some(true));
        let rule_b = make_rule("r2", RuleOperator::Contains, vec!["payment"], RuleCombinator::Or, "Bills", Some(false));
        let row = make_row(10, "PAYMENT AT MARKET");
        let results = evaluate(&[row], &[rule_a, rule_b]);
        assert_eq!(results[0].matches.len(), 2);
    }

    // Test: No rules match
    #[test]
    fn no_rules_match_returns_empty() {
        let rule = make_rule("r1", RuleOperator::Contains, vec!["mercadona"], RuleCombinator::Or, "Food", None);
        let row = make_row(5, "AWS SERVICE CHARGE");
        let results = evaluate(&[row], &[rule]);
        assert_eq!(results[0].matches.len(), 0);
    }

    // Test: Malformed rule with empty values vec is skipped
    #[test]
    fn empty_values_rule_skipped_gracefully() {
        let mut rule = make_rule("r1", RuleOperator::Contains, vec!["mercadona"], RuleCombinator::Or, "Food", None);
        rule.values = vec![];
        let row = make_row(1, "ANY DESCRIPTION");
        let results = evaluate(&[row], &[rule]);
        assert_eq!(results[0].matches.len(), 0);
    }

    // Test: Multiple rows are evaluated independently
    #[test]
    fn multiple_rows_evaluated_independently() {
        let rule = make_rule("r1", RuleOperator::Contains, vec!["netflix"], RuleCombinator::Or, "Subscriptions", Some(false));
        let row1 = make_row(1, "NETFLIX MONTHLY");
        let row2 = make_row(2, "GROCERY STORE");
        let row3 = make_row(3, "NETFLIX ANNUAL");
        let results = evaluate(&[row1, row2, row3], &[rule]);
        assert_eq!(results.len(), 3);
        assert_eq!(results[0].matches.len(), 1);
        assert_eq!(results[1].matches.len(), 0);
        assert_eq!(results[2].matches.len(), 1);
    }
}
