use crate::analytics;
use crate::error::{AppError, AppResult};
use crate::excel::dates::parse_loose_date;
use crate::excel::Workbook;
use crate::imports;
use crate::models::{
    Analytics, Category, ConflictingRule, ConfirmImportInput, ImportDraftRow, ImportDuplicate,
    ImportProvider, ImportResult, ImportRule, Movement, MovementFilter, MovementInput,
    MovementRuleResult, ParsedImportRow, RuleMatchResult, WorkbookState,
};
use crate::rules;
use crate::state::AppState;
use std::path::PathBuf;
use tauri::State;

use crate::excel::workbook::DEFAULT_CATEGORIES;

#[tauri::command]
pub fn get_workbook_state(state: State<AppState>) -> AppResult<WorkbookState> {
    let mut inner = state.lock_inner()?;
    if inner.workbook.is_none() && inner.config.active_path.is_some() {
        let _ = inner.open_from_config();
    }
    Ok(inner.config.to_workbook_state(inner.dirty))
}

#[tauri::command]
pub fn create_workbook(path: String, state: State<AppState>) -> AppResult<WorkbookState> {
    let p = PathBuf::from(&path);
    let wb = Workbook::create(&p)?;
    let mut inner = state.lock_inner()?;
    inner.workbook = Some(wb);
    inner.dirty = false;
    inner.config.active_path = Some(path.clone());
    inner.config.push_recent(&path);
    inner.config.last_saved = Some(chrono::Utc::now().to_rfc3339());
    inner.config.save()?;
    Ok(inner.config.to_workbook_state(inner.dirty))
}

#[tauri::command]
pub fn import_workbook(path: String, state: State<AppState>) -> AppResult<WorkbookState> {
    let p = PathBuf::from(&path);
    let wb = Workbook::open(&p)?;
    let mut inner = state.lock_inner()?;
    inner.workbook = Some(wb);
    inner.dirty = false;
    inner.config.active_path = Some(path.clone());
    inner.config.push_recent(&path);
    inner.config.save()?;
    Ok(inner.config.to_workbook_state(inner.dirty))
}

#[tauri::command]
pub fn close_workbook(state: State<AppState>) -> AppResult<WorkbookState> {
    let mut inner = state.lock_inner()?;
    inner.workbook = None;
    inner.dirty = false;
    inner.config.active_path = None;
    inner.config.save()?;
    Ok(inner.config.to_workbook_state(inner.dirty))
}

#[tauri::command]
pub fn save_workbook(state: State<AppState>) -> AppResult<WorkbookState> {
    let mut inner = state.lock_inner()?;
    {
        let wb = inner.workbook.as_ref().ok_or(AppError::NoActiveWorkbook)?;
        wb.save_atomic()?;
    }
    inner.dirty = false;
    inner.config.last_saved = Some(chrono::Utc::now().to_rfc3339());
    inner.config.save()?;
    Ok(inner.config.to_workbook_state(inner.dirty))
}

#[tauri::command]
pub fn list_import_providers() -> AppResult<Vec<ImportProvider>> {
    Ok(imports::providers())
}

#[tauri::command]
pub fn parse_import_file(
    provider_id: String,
    path: String,
) -> AppResult<Vec<crate::models::ParsedImportRow>> {
    imports::parse_import_file(&provider_id, &PathBuf::from(path))
}

#[tauri::command]
pub fn detect_import_duplicates(
    rows: Vec<ImportDraftRow>,
    state: State<AppState>,
) -> AppResult<Vec<ImportDuplicate>> {
    let inner = state.lock_inner()?;
    let wb = inner.workbook.as_ref().ok_or(AppError::NoActiveWorkbook)?;
    wb.detect_import_duplicates(&rows)
}

#[tauri::command]
pub fn confirm_import(
    input: ConfirmImportInput,
    state: State<AppState>,
) -> AppResult<ImportResult> {
    imports::ensure_provider(&input.provider_id)?;

    let mut inner = state.lock_inner()?;
    let wb = inner.workbook.as_mut().ok_or(AppError::NoActiveWorkbook)?;

    let total_count = input.rows.len();
    let included: Vec<_> = input.rows.into_iter().filter(|row| row.included).collect();
    let skipped_count = total_count.saturating_sub(included.len());
    let mut category_names = input.new_categories;
    let movement_inputs = included
        .iter()
        .map(|row| {
            Ok(MovementInput {
                date: row.date.clone(),
                category: row.category.clone(),
                kind: row.kind,
                amount: row.amount,
                necessary: row.necessary,
                description: row.description.clone(),
            })
        })
        .collect::<AppResult<Vec<_>>>()?;

    for movement in &movement_inputs {
        if movement.amount < 0.0 {
            return Err(AppError::Invalid("El importe debe ser positivo".into()));
        }
        parse_loose_date(&movement.date)
            .ok_or_else(|| AppError::Invalid("Fecha inválida".into()))?;
    }

    for row in &included {
        let category = row.category.trim();
        if !category.is_empty()
            && !category_names
            .iter()
            .any(|name| name.eq_ignore_ascii_case(category))
        {
            category_names.push(category.to_string());
        }
    }

    let created_categories = wb
        .ensure_categories(&category_names)?
        .into_iter()
        .map(|category| category.name)
        .collect::<Vec<_>>();

    let imported = wb.create_movements_batch(&movement_inputs)?;
    if !imported.is_empty() || !created_categories.is_empty() {
        inner.dirty = true;
    }

    Ok(ImportResult {
        imported_count: imported.len(),
        created_categories,
        skipped_count,
    })
}

#[tauri::command]
pub fn list_movements(filter: MovementFilter, state: State<AppState>) -> AppResult<Vec<Movement>> {
    let inner = state.lock_inner()?;
    let wb = inner.workbook.as_ref().ok_or(AppError::NoActiveWorkbook)?;
    wb.list_movements(&filter)
}

#[tauri::command]
pub fn create_movement(input: MovementInput, state: State<AppState>) -> AppResult<Movement> {
    let mut inner = state.lock_inner()?;
    let m = {
        let wb = inner.workbook.as_mut().ok_or(AppError::NoActiveWorkbook)?;
        wb.create_movement(&input)?
    };
    inner.dirty = true;
    Ok(m)
}

#[tauri::command]
pub fn update_movement(
    id: String,
    input: MovementInput,
    state: State<AppState>,
) -> AppResult<Movement> {
    let mut inner = state.lock_inner()?;
    let m = {
        let wb = inner.workbook.as_mut().ok_or(AppError::NoActiveWorkbook)?;
        wb.update_movement(&id, &input)?
    };
    inner.dirty = true;
    Ok(m)
}

#[tauri::command]
pub fn delete_movement(id: String, state: State<AppState>) -> AppResult<()> {
    let mut inner = state.lock_inner()?;
    {
        let wb = inner.workbook.as_mut().ok_or(AppError::NoActiveWorkbook)?;
        wb.delete_movement(&id)?;
    }
    inner.dirty = true;
    Ok(())
}

#[tauri::command]
pub fn delete_movements(ids: Vec<String>, state: State<AppState>) -> AppResult<usize> {
    let mut inner = state.lock_inner()?;
    let count = {
        let wb = inner.workbook.as_mut().ok_or(AppError::NoActiveWorkbook)?;
        wb.delete_movements(&ids)?
    };
    if count > 0 {
        inner.dirty = true;
    }
    Ok(count)
}

#[tauri::command]
pub fn list_categories(state: State<AppState>) -> AppResult<Vec<Category>> {
    let inner = state.lock_inner()?;
    let wb = inner.workbook.as_ref().ok_or(AppError::NoActiveWorkbook)?;
    wb.list_categories()
}

#[tauri::command]
pub fn create_category(name: String, state: State<AppState>) -> AppResult<Category> {
    let mut inner = state.lock_inner()?;
    let c = {
        let wb = inner.workbook.as_mut().ok_or(AppError::NoActiveWorkbook)?;
        wb.create_category(&name)?
    };
    inner.dirty = true;
    Ok(c)
}

#[tauri::command]
pub fn delete_category(name: String, state: State<AppState>) -> AppResult<()> {
    let mut inner = state.lock_inner()?;
    {
        let wb = inner.workbook.as_mut().ok_or(AppError::NoActiveWorkbook)?;
        wb.delete_category(&name)?;
    }
    inner.dirty = true;
    Ok(())
}

#[tauri::command]
pub fn get_analytics(filter: MovementFilter, state: State<AppState>) -> AppResult<Analytics> {
    let inner = state.lock_inner()?;
    let wb = inner.workbook.as_ref().ok_or(AppError::NoActiveWorkbook)?;
    let movs = wb.list_movements(&MovementFilter::default())?;
    Ok(analytics::compute(&movs, &filter))
}

// ── Import Rules CRUD ──

#[tauri::command]
pub fn list_import_rules(state: State<AppState>) -> AppResult<Vec<ImportRule>> {
    let inner = state.lock_inner()?;
    Ok(inner.config.import_rules.clone())
}

#[tauri::command]
pub fn create_import_rule(mut rule: ImportRule, state: State<AppState>) -> AppResult<ImportRule> {
    if rule.name.trim().is_empty() {
        return Err(AppError::Invalid("Rule name must not be empty".into()));
    }
    rule.values.retain(|v| !v.trim().is_empty());
    if rule.values.is_empty() {
        return Err(AppError::Invalid("At least one non-empty value is required".into()));
    }
    let mut inner = state.lock_inner()?;
    if inner.config.import_rules.len() >= 50 {
        return Err(AppError::Invalid("Maximum of 50 rules reached".into()));
    }
    let name_lower = rule.name.to_lowercase();
    if inner
        .config
        .import_rules
        .iter()
        .any(|r| r.name.to_lowercase() == name_lower)
    {
        return Err(AppError::Invalid(format!(
            "A rule with the name '{}' already exists",
            rule.name
        )));
    }
    inner.config.import_rules.push(rule.clone());
    inner.config.save()?;
    Ok(rule)
}

#[tauri::command]
pub fn update_import_rule(id: String, mut rule: ImportRule, state: State<AppState>) -> AppResult<ImportRule> {
    if rule.name.trim().is_empty() {
        return Err(AppError::Invalid("Rule name must not be empty".into()));
    }
    rule.values.retain(|v| !v.trim().is_empty());
    if rule.values.is_empty() {
        return Err(AppError::Invalid("At least one non-empty value is required".into()));
    }
    let mut inner = state.lock_inner()?;
    let name_lower = rule.name.to_lowercase();
    if inner
        .config
        .import_rules
        .iter()
        .any(|r| r.id != id && r.name.to_lowercase() == name_lower)
    {
        return Err(AppError::Invalid(format!(
            "A rule with the name '{}' already exists",
            rule.name
        )));
    }
    let existing = inner
        .config
        .import_rules
        .iter_mut()
        .find(|r| r.id == id)
        .ok_or_else(|| AppError::Invalid(format!("Rule with id '{}' not found", id)))?;
    *existing = rule.clone();
    inner.config.save()?;
    Ok(rule)
}

#[tauri::command]
pub fn delete_import_rule(id: String, state: State<AppState>) -> AppResult<()> {
    let mut inner = state.lock_inner()?;
    let before = inner.config.import_rules.len();
    inner.config.import_rules.retain(|r| r.id != id);
    if inner.config.import_rules.len() == before {
        return Err(AppError::Invalid(format!("Rule with id '{}' not found", id)));
    }
    inner.config.save()?;
    Ok(())
}

#[tauri::command]
pub fn evaluate_import_rules(
    rows: Vec<ParsedImportRow>,
    state: State<AppState>,
) -> AppResult<Vec<RuleMatchResult>> {
    let inner = state.lock_inner()?;
    let results = rules::evaluate(&rows, &inner.config.import_rules);
    Ok(results)
}

#[tauri::command]
pub fn apply_rules_to_movements(
    rule_ids: Option<Vec<String>>,
    state: State<AppState>,
) -> AppResult<Vec<MovementRuleResult>> {
    let rules: Vec<ImportRule> = {
        let inner = state.lock_inner()?;
        if let Some(ref ids) = rule_ids {
            inner
                .config
                .import_rules
                .iter()
                .filter(|r| ids.contains(&r.id))
                .cloned()
                .collect()
        } else {
            inner.config.import_rules.clone()
        }
    };

    let mut inner = state.lock_inner()?;
    let wb = inner.workbook.as_mut().ok_or(AppError::NoActiveWorkbook)?;
    let filter = MovementFilter::default();
    let movements = wb.list_movements(&filter)?;
    let mut results = Vec::new();

    for m in &movements {
        let needs_category = m.category.trim().is_empty();
        let needs_necessary = m.necessary.is_none();

        if !needs_category && !needs_necessary {
            continue;
        }

        let matched: Vec<&ImportRule> = rules
            .iter()
            .filter(|r| crate::rules::rule_matches(r, &m.description))
            .filter(|r| {
                (needs_category && !r.category.trim().is_empty())
                    || (needs_necessary && r.necessary.is_some())
            })
            .collect();

        if matched.len() == 1 {
            let rule = matched[0];
            let input = MovementInput {
                date: m.date.clone(),
                category: if needs_category {
                    rule.category.clone()
                } else {
                    m.category.clone()
                },
                kind: m.kind,
                amount: m.amount,
                necessary: if needs_necessary {
                    rule.necessary
                } else {
                    m.necessary
                },
                description: m.description.clone(),
            };
            wb.update_movement(&m.id, &input)?;
            results.push(MovementRuleResult {
                movement_id: m.id.clone(),
                movement_description: m.description.clone(),
                rule_name: rule.name.clone(),
                applied_category: if needs_category {
                    Some(rule.category.clone())
                } else {
                    None
                },
                applied_necessary: if needs_necessary { rule.necessary } else { None },
                skipped: false,
                skip_reason: None,
                conflicting_rules: vec![],
            });
        } else if matched.len() > 1 {
            let conflicting = matched
                .iter()
                .map(|r| ConflictingRule {
                    rule_id: r.id.clone(),
                    rule_name: r.name.clone(),
                    category: r.category.clone(),
                    necessary: r.necessary,
                })
                .collect();
            results.push(MovementRuleResult {
                movement_id: m.id.clone(),
                movement_description: m.description.clone(),
                rule_name: String::new(),
                applied_category: None,
                applied_necessary: None,
                skipped: true,
                skip_reason: Some(format!(
                    "{} reglas coinciden — conflicto",
                    matched.len()
                )),
                conflicting_rules: conflicting,
            });
        }
    }

    if !results.is_empty() {
        wb.save_atomic()?;
        inner.dirty = false;
        inner.config.last_saved = Some(chrono::Utc::now().to_rfc3339());
        inner.config.save()?;
    }

    Ok(results)
}

#[tauri::command]
pub fn copy_workbook(path: String, state: State<AppState>) -> AppResult<WorkbookState> {
    let p = PathBuf::from(&path);
    let mut inner = state.lock_inner()?;
    let source = inner.workbook.as_ref().ok_or(AppError::NoActiveWorkbook)?;

    // Create new workbook at target path
    let mut new_wb = Workbook::create(&p)?;

    // Copy movements from source
    let movements = source.list_movements(&MovementFilter::default())?;
    let inputs: Vec<MovementInput> = movements.iter().map(|m| MovementInput {
        date: m.date.clone(),
        category: m.category.clone(),
        kind: m.kind,
        amount: m.amount,
        necessary: m.necessary,
        description: m.description.clone(),
    }).collect();

    if !inputs.is_empty() {
        new_wb.create_movements_batch(&inputs)?;
    }

    // Copy categories
    let categories = source.list_categories()?;
    let existing_cats: Vec<String> = new_wb.list_categories()?.into_iter().map(|c| c.name).collect();
    for cat in &categories {
        if !DEFAULT_CATEGORIES.contains(&cat.name.as_str()) && !existing_cats.iter().any(|c| c.eq_ignore_ascii_case(&cat.name)) {
            let _ = new_wb.create_category(&cat.name);
        }
    }

    // Save the new workbook
    new_wb.save_atomic()?;

    // Swap: close current, open new copy
    inner.workbook = Some(new_wb);
    inner.dirty = false;
    inner.config.active_path = Some(path.clone());
    inner.config.push_recent(&path);
    inner.config.last_saved = Some(chrono::Utc::now().to_rfc3339());
    inner.config.save()?;

    Ok(inner.config.to_workbook_state(inner.dirty))
}
