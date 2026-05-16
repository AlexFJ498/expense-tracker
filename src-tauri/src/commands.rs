use crate::analytics;
use crate::error::{AppError, AppResult};
use crate::excel::dates::parse_loose_date;
use crate::excel::Workbook;
use crate::imports;
use crate::models::{
    Analytics, Category, ConfirmImportInput, ImportDraftRow, ImportDuplicate, ImportProvider,
    ImportResult, Movement, MovementFilter, MovementInput, WorkbookState,
};
use crate::state::AppState;
use std::path::PathBuf;
use tauri::State;

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
            let necessary = row.necessary.ok_or_else(|| {
                AppError::Invalid(format!(
                    "La fila {} no tiene marcado si es necesaria",
                    row.source_row
                ))
            })?;
            Ok(MovementInput {
                date: row.date.clone(),
                category: row.category.clone(),
                kind: row.kind,
                amount: row.amount,
                necessary,
            })
        })
        .collect::<AppResult<Vec<_>>>()?;

    for movement in &movement_inputs {
        if movement.amount <= 0.0 {
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
