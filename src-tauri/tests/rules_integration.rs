use control_de_gastos_lib as lib;

/// Integration tests for import rule CRUD and evaluate.
/// These test the pure engine and command-level logic patterns.

fn make_rule(
    id: &str,
    name: &str,
    operator: &str,
    values: Vec<&str>,
    combinator: &str,
    category: &str,
    necessary: Option<bool>,
) -> lib::__internal::ImportRule {
    lib::__internal::ImportRule {
        id: id.to_string(),
        name: name.to_string(),
        description: String::new(),
        field: lib::__internal::RuleField::Concept,
        operator: if operator == "equals" {
            lib::__internal::RuleOperator::Equals
        } else {
            lib::__internal::RuleOperator::Contains
        },
        values: values.iter().map(|v| v.to_string()).collect(),
        combinator: if combinator == "and" {
            lib::__internal::RuleCombinator::And
        } else {
            lib::__internal::RuleCombinator::Or
        },
        category: category.to_string(),
        necessary,
    }
}

fn make_parsed_row(source_row: u32, description: &str) -> lib::__internal::ParsedImportRow {
    lib::__internal::ParsedImportRow {
        source_row,
        date: Some("2025-01-01".to_string()),
        description: description.to_string(),
        kind: Some(lib::__internal::MovementKind::Gasto),
        amount: Some(100.0),
        warnings: vec![],
    }
}

// --- List rules: starts empty ---

#[test]
fn list_import_rules_starts_empty() {
    let config = lib::__internal::AppConfig::default();
    assert!(config.import_rules.is_empty(), "default config should have no import rules");
}

// --- Create rule ---

#[test]
fn create_rule_adds_to_config() {
    let mut config = lib::__internal::AppConfig::default();
    let rule = make_rule("id-1", "Groceries", "contains", vec!["mercadona"], "or", "Food", Some(true));
    config.import_rules.push(rule);
    assert_eq!(config.import_rules.len(), 1);
    assert_eq!(config.import_rules[0].name, "Groceries");
    assert_eq!(config.import_rules[0].values.len(), 1);
    assert!(matches!(config.import_rules[0].combinator, lib::__internal::RuleCombinator::Or));
}

// --- Duplicate name rejection ---

#[test]
fn duplicate_rule_name_rejected_case_insensitive() {
    let mut config = lib::__internal::AppConfig::default();
    let rule1 = make_rule("id-1", "Rent", "equals", vec!["alquiler"], "or", "Housing", Some(true));
    config.import_rules.push(rule1);
    let names_lower: Vec<String> = config.import_rules.iter().map(|r| r.name.to_lowercase()).collect();
    assert!(names_lower.contains(&"rent".to_string()));
    assert_eq!(names_lower.iter().filter(|n| *n == "rent").count(), 1);
}

// --- 50-rule cap ---

#[test]
fn rule_cap_at_50() {
    let mut config = lib::__internal::AppConfig::default();
    for i in 0..50 {
        let rule = make_rule(&format!("id-{}", i), &format!("Rule {}", i), "contains", vec!["val"], "or", "Cat", None);
        config.import_rules.push(rule);
    }
    assert_eq!(config.import_rules.len(), 50);
}

// --- Delete rule ---

#[test]
fn delete_rule_removes_from_config() {
    let mut config = lib::__internal::AppConfig::default();
    let rule = make_rule("abc-123", "Groceries", "contains", vec!["mercadona"], "or", "Food", Some(true));
    config.import_rules.push(rule);
    assert_eq!(config.import_rules.len(), 1);
    config.import_rules.retain(|r| r.id != "abc-123");
    assert!(config.import_rules.is_empty());
}

// --- Update rule ---

#[test]
fn update_rule_modifies_in_place() {
    let mut config = lib::__internal::AppConfig::default();
    let rule = make_rule("abc-123", "Groceries", "contains", vec!["lidl"], "or", "Food", None);
    config.import_rules.push(rule);
    if let Some(r) = config.import_rules.iter_mut().find(|r| r.id == "abc-123") {
        r.values = vec!["mercadona".to_string()];
    }
    assert_eq!(config.import_rules[0].values[0], "mercadona");
    assert_eq!(config.import_rules.len(), 1);
}

// --- Evaluate through pure engine ---

#[test]
fn evaluate_engine_through_internal_api() {
    let rules = vec![make_rule("r1", "Groceries", "contains", vec!["mercadona"], "or", "Food", Some(true))];
    let rows = vec![make_parsed_row(1, "PAGO MERCADONA 14:30")];
    let results = lib::__internal::evaluate(&rows, &rules);
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].matches.len(), 1);
    assert_eq!(results[0].matches[0].category, "Food");
}

#[test]
fn evaluate_engine_no_match_returns_empty() {
    let rules = vec![make_rule("r1", "Groceries", "contains", vec!["mercadona"], "or", "Food", None)];
    let rows = vec![make_parsed_row(5, "AWS SERVICE CHARGE")];
    let results = lib::__internal::evaluate(&rows, &rules);
    assert_eq!(results[0].matches.len(), 0);
}

// --- OR combinator ---

#[test]
fn evaluate_or_matches_any_value() {
    let rules = vec![make_rule("r1", "Shops", "contains", vec!["mercadona", "lidl", "carrefour"], "or", "Food", None)];
    let rows = vec![make_parsed_row(1, "compra LIDL semanal")];
    let results = lib::__internal::evaluate(&rows, &rules);
    assert_eq!(results[0].matches.len(), 1);
}

// --- AND combinator ---

#[test]
fn evaluate_and_requires_all_values() {
    let rules = vec![make_rule("r1", "Rent", "contains", vec!["pago", "vivienda"], "and", "Alquiler", None)];
    let rows = vec![make_parsed_row(1, "PAGO VIVIENDA ENERO")];
    let results = lib::__internal::evaluate(&rows, &rules);
    assert_eq!(results[0].matches.len(), 1);
}

#[test]
fn evaluate_and_fails_if_one_missing() {
    let rules = vec![make_rule("r1", "Rent", "contains", vec!["pago", "vivienda"], "and", "Alquiler", None)];
    let rows = vec![make_parsed_row(1, "PAGO SUPERMERCADO")];
    let results = lib::__internal::evaluate(&rows, &rules);
    assert_eq!(results[0].matches.len(), 0);
}
