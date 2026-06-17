use crate::error::{AppError, AppResult};
use crate::excel::dates::{date_to_serial, iso_date, parse_loose_date, serial_to_date};
use crate::excel::sanitize;
use crate::models::{
    Category, ImportDraftRow, ImportDuplicate, Movement, MovementFilter, MovementInput,
    MovementKind,
};
use chrono::{Datelike, NaiveDate};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use umya_spreadsheet as us;
use uuid::Uuid;

const REGISTRO: &str = "REGISTRO";
const CONFIGURACION: &str = "CONFIGURACION";
const FIRST_DATA_ROW: u32 = 10;
const HEADER_ROW: u32 = 9;

const COL_MES: u32 = 1;
const COL_ANYO: u32 = 2;
const COL_FECHA: u32 = 3;
const COL_CATEGORIA: u32 = 4;
const COL_INGRESO: u32 = 5;
const COL_GASTO: u32 = 6;
const COL_NECESARIO: u32 = 7;
const COL_TOTAL: u32 = 8;
const COL_DESCRIPCION: u32 = 9;

pub const DEFAULT_CATEGORIES: &[&str] = &[
    "SALARIO",
    "COMIDA",
    "TRANSPORTE",
    "ENTRETENIMIENTO",
    "ALQUILER",
    "GASTOS VIVIENDA",
    "GASOLINA",
    "GIMNASIO",
    "VIAJES",
    "ROPA",
    "SALUD",
    "SEGURO MÉDICO",
    "REGALOS",
    "OTROS",
];

pub struct Workbook {
    path: PathBuf,
    book: us::Spreadsheet,
    /// Maps movement id -> row (1-based). Rebuilt after each structural mutation.
    id_by_row: HashMap<String, u32>,
}

impl Workbook {
    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn open(path: &Path) -> AppResult<Self> {
        if sanitize::needs_sanitize(path)? {
            sanitize::sanitize_in_place(path)?;
        }
        let book = us::reader::xlsx::read(path).map_err(|e| AppError::Excel(format!("{:?}", e)))?;

        // Validate structure
        book.get_sheet_by_name(REGISTRO)
            .ok_or_else(|| AppError::InvalidWorkbook(format!("Falta la hoja '{}'", REGISTRO)))?;
        if book.get_sheet_by_name(CONFIGURACION).is_none() {
            return Err(AppError::InvalidWorkbook(format!(
                "Falta la hoja '{}'",
                CONFIGURACION
            )));
        }

        let mut wb = Self {
            path: path.to_path_buf(),
            book,
            id_by_row: HashMap::new(),
        };
        wb.rebuild_index();
        Ok(wb)
    }

    pub fn create(path: &Path) -> AppResult<Self> {
        let mut book = us::new_file_empty_worksheet();

        // REGISTRO sheet
        book.new_sheet(REGISTRO)
            .map_err(|e| AppError::Excel(e.to_string()))?;
        let sheet = book.get_sheet_by_name_mut(REGISTRO).unwrap();

        // Title
        sheet
            .get_cell_mut("D2")
            .set_value_string("REGISTRO DE INGRESOS Y GASTOS");

        // KPI labels (rows 5, 6, 7)
        sheet.get_cell_mut("G5").set_value_string("TOTAL INGRESOS:");
        sheet.get_cell_mut("H5").set_formula("SUM(E:E)");
        sheet.get_cell_mut("G6").set_value_string("TOTAL GASTOS:");
        sheet.get_cell_mut("H6").set_formula("SUM(F:F)");
        sheet.get_cell_mut("G7").set_value_string("DIFERENCIA:");
        sheet.get_cell_mut("H7").set_formula("H5-H6");

        // Headers in row 9
        sheet
            .get_cell_mut((COL_MES, HEADER_ROW))
            .set_value_string("MES");
        sheet
            .get_cell_mut((COL_ANYO, HEADER_ROW))
            .set_value_string("AÑO");
        sheet
            .get_cell_mut((COL_FECHA, HEADER_ROW))
            .set_value_string("FECHA");
        sheet
            .get_cell_mut((COL_CATEGORIA, HEADER_ROW))
            .set_value_string("CATEGORIA");
        sheet
            .get_cell_mut((COL_INGRESO, HEADER_ROW))
            .set_value_string("INGRESO");
        sheet
            .get_cell_mut((COL_GASTO, HEADER_ROW))
            .set_value_string("GASTO");
        sheet
            .get_cell_mut((COL_NECESARIO, HEADER_ROW))
            .set_value_string("NECESARIO");
        sheet
            .get_cell_mut((COL_TOTAL, HEADER_ROW))
            .set_value_string("TOTAL");
        sheet
            .get_cell_mut((COL_DESCRIPCION, HEADER_ROW))
            .set_value_string("DESCRIPCION");

        // Create the DATOS table (initially empty — header only; area A9:I10 so umya has at least 1 data row stub)
        let mut table = us::Table::new("DATOS", ((1u32, 9u32), (9u32, 10u32)));
        for header in [
            "MES",
            "AÑO",
            "FECHA",
            "CATEGORIA",
            "INGRESO",
            "GASTO",
            "NECESARIO",
            "TOTAL",
            "DESCRIPCION",
        ] {
            let mut col = us::TableColumn::default();
            col.set_name(header.to_string());
            table.add_column(col);
        }
        sheet.add_table(table);

        // Empty row 10 placeholder with formulas so the table is valid; keep it empty
        apply_formula_columns(sheet, FIRST_DATA_ROW, FIRST_DATA_ROW - 1);

        // Number/currency formats for amount columns
        for col in [COL_INGRESO, COL_GASTO, COL_TOTAL] {
            sheet
                .get_style_mut((col, HEADER_ROW))
                .get_number_format_mut()
                .set_format_code("General");
        }

        // CONFIGURACION sheet
        book.new_sheet(CONFIGURACION)
            .map_err(|e| AppError::Excel(e.to_string()))?;
        let cfg = book.get_sheet_by_name_mut(CONFIGURACION).unwrap();
        cfg.get_cell_mut("A1").set_value_string("CATEGORIA");
        for (i, cat) in DEFAULT_CATEGORIES.iter().enumerate() {
            cfg.get_cell_mut((1u32, (i + 2) as u32))
                .set_value_string(*cat);
        }

        // Column widths in REGISTRO for usability
        let sheet = book.get_sheet_by_name_mut(REGISTRO).unwrap();
        for (col_name, width) in [
            ("A", 12.0),
            ("B", 8.0),
            ("C", 12.0),
            ("D", 22.0),
            ("E", 12.0),
            ("F", 12.0),
            ("G", 12.0),
            ("H", 14.0),
        ] {
            sheet.get_column_dimension_mut(col_name).set_width(width);
        }

        // Save
        us::writer::xlsx::write(&book, path).map_err(|e| AppError::Excel(e.to_string()))?;

        Self::open(path)
    }

    fn rebuild_index(&mut self) {
        self.id_by_row.clear();
        let sheet = self.book.get_sheet_by_name(REGISTRO).unwrap();
        let (_, max_row) = sheet.get_highest_column_and_row();
        for r in FIRST_DATA_ROW..=max_row {
            if row_has_content(sheet, r) {
                let id = Uuid::new_v4().to_string();
                self.id_by_row.insert(id, r);
            }
        }
    }

    fn last_data_row(&self) -> u32 {
        let sheet = self.book.get_sheet_by_name(REGISTRO).unwrap();
        let (_, max_row) = sheet.get_highest_column_and_row();
        let mut last = FIRST_DATA_ROW - 1;
        for r in FIRST_DATA_ROW..=max_row {
            if row_has_content(sheet, r) {
                last = r;
            }
        }
        last
    }

    pub fn list_movements(&self, filter: &MovementFilter) -> AppResult<Vec<Movement>> {
        let sheet = self.book.get_sheet_by_name(REGISTRO).unwrap();
        let mut running_total: f64 = 0.0;
        let mut out = Vec::new();

        // Sort rows for deterministic iteration
        let mut rows: Vec<(&String, &u32)> = self.id_by_row.iter().collect();
        rows.sort_by_key(|(_, r)| **r);

        for (id, &row) in rows {
            let Some(m) = read_row(sheet, row, id, &mut running_total)? else {
                continue;
            };
            if filter_matches(&m, filter) {
                out.push(m);
            }
        }
        Ok(out)
    }

    pub fn list_categories(&self) -> AppResult<Vec<Category>> {
        let sheet = self.book.get_sheet_by_name(CONFIGURACION).unwrap();
        let (_, max_row) = sheet.get_highest_column_and_row();
        let mut out = Vec::new();
        for r in 2..=max_row {
            let v = sheet.get_value((1u32, r));
            let v = v.trim().to_string();
            if !v.is_empty() {
                out.push(Category { name: v });
            }
        }
        Ok(out)
    }

    pub fn create_category(&mut self, name: &str) -> AppResult<Category> {
        let name = name.trim();
        if name.is_empty() {
            return Err(AppError::Invalid("El nombre no puede estar vacío".into()));
        }
        let existing = self.list_categories()?;
        if existing.iter().any(|c| c.name.eq_ignore_ascii_case(name)) {
            return Err(AppError::DuplicateCategory);
        }
        let sheet = self.book.get_sheet_by_name_mut(CONFIGURACION).unwrap();
        let (_, max_row) = sheet.get_highest_column_and_row();
        let new_row = max_row + 1;
        sheet.get_cell_mut((1u32, new_row)).set_value_string(name);
        Ok(Category {
            name: name.to_string(),
        })
    }

    pub fn ensure_categories(&mut self, names: &[String]) -> AppResult<Vec<Category>> {
        let existing = self.list_categories()?;
        let mut pending: Vec<String> = Vec::new();

        for name in names {
            let trimmed = name.trim();
            if trimmed.is_empty() {
                return Err(AppError::Invalid(
                    "La categoría no puede estar vacía".into(),
                ));
            }
            if existing
                .iter()
                .any(|c| c.name.eq_ignore_ascii_case(trimmed))
            {
                continue;
            }
            if pending
                .iter()
                .any(|pending_name| pending_name.eq_ignore_ascii_case(trimmed))
            {
                continue;
            }
            pending.push(trimmed.to_string());
        }

        let mut created = Vec::new();

        for name in pending {
            let category = self.create_category(&name)?;
            created.push(category);
        }

        Ok(created)
    }

    pub fn delete_category(&mut self, name: &str) -> AppResult<()> {
        // Guard: not in use
        let movements = self.list_movements(&MovementFilter::default())?;
        if movements
            .iter()
            .any(|m| m.category.eq_ignore_ascii_case(name))
        {
            return Err(AppError::CategoryInUse(name.to_string()));
        }
        let sheet = self.book.get_sheet_by_name_mut(CONFIGURACION).unwrap();
        let (_, max_row) = sheet.get_highest_column_and_row();
        let mut target: Option<u32> = None;
        for r in 2..=max_row {
            let v = sheet.get_value((1u32, r));
            if v.trim().eq_ignore_ascii_case(name) {
                target = Some(r);
                break;
            }
        }
        let Some(row) = target else {
            return Err(AppError::CategoryNotFound(name.to_string()));
        };
        // Shift up: clear and shift subsequent values
        for r in row..max_row {
            let next_val = sheet.get_value((1u32, r + 1));
            sheet.get_cell_mut((1u32, r)).set_value_string(next_val);
        }
        // Clear last
        sheet
            .get_cell_mut((1u32, max_row))
            .set_blank();
        Ok(())
    }

    pub fn create_movement(&mut self, input: &MovementInput) -> AppResult<Movement> {
        let date = parse_loose_date(&input.date)
            .ok_or_else(|| AppError::Invalid("Fecha inválida".into()))?;
        if input.amount < 0.0 {
            return Err(AppError::Invalid("El importe debe ser positivo".into()));
        }
        let last = self.last_data_row();
        let new_row = last + 1;

        let sheet = self.book.get_sheet_by_name_mut(REGISTRO).unwrap();
        write_row(sheet, new_row, &date, input, last)?;

        // Extend DATOS table range
        if let Some(t) = sheet.get_tables_mut().iter_mut().next() {
            let (beg, _end) = t.get_area().clone();
            let beg_t = (*beg.get_col_num(), *beg.get_row_num());
            let end_t = (9u32, new_row);
            t.set_area((beg_t, end_t));
        }

        let id = Uuid::new_v4().to_string();
        self.id_by_row.insert(id.clone(), new_row);

        // Read back for return
        let sheet = self.book.get_sheet_by_name(REGISTRO).unwrap();
        let mut running_total = 0.0;
        // Recompute the running total up to new_row
        let mut rows: Vec<u32> = self.id_by_row.values().copied().collect();
        rows.sort_unstable();
        for r in &rows {
            let income = read_number(sheet, (COL_INGRESO, *r));
            let expense = read_number(sheet, (COL_GASTO, *r));
            running_total = running_total + income.unwrap_or(0.0) - expense.unwrap_or(0.0);
            if *r == new_row {
                break;
            }
        }
        let m = read_row(sheet, new_row, &id, &mut 0.0)?.unwrap();
        Ok(Movement {
            total: Some(running_total),
            ..m
        })
    }

    pub fn create_movements_batch(&mut self, inputs: &[MovementInput]) -> AppResult<Vec<Movement>> {
        for input in inputs {
            parse_loose_date(&input.date)
                .ok_or_else(|| AppError::Invalid("Fecha inválida".into()))?;
            if input.amount < 0.0 {
                return Err(AppError::Invalid("El importe debe ser positivo".into()));
            }
        }

        let mut created = Vec::with_capacity(inputs.len());
        for input in inputs {
            created.push(self.create_movement(input)?);
        }
        Ok(created)
    }

    pub fn detect_import_duplicates(
        &self,
        rows: &[ImportDraftRow],
    ) -> AppResult<Vec<ImportDuplicate>> {
        let movements = self.list_movements(&MovementFilter::default())?;
        let mut duplicates = Vec::new();

        for row in rows {
            if !row.included || row.amount <= 0.0 {
                continue;
            }
            let Some(date) = parse_loose_date(&row.date) else {
                continue;
            };
            let category = row.category.trim();
            if category.is_empty() {
                continue;
            }

            let date = iso_date(date);
            let cents = amount_cents(row.amount);
            if let Some(movement) = movements.iter().find(|movement| {
                movement.date == date
                    && movement.kind == row.kind
                    && amount_cents(movement.amount) == cents
                    && movement.category.eq_ignore_ascii_case(category)
            }) {
                duplicates.push(ImportDuplicate {
                    source_row: row.source_row,
                    movement_id: movement.id.clone(),
                    reason: "Posible duplicado por fecha, tipo, importe y categoría".into(),
                });
            }
        }

        Ok(duplicates)
    }

    pub fn update_movement(&mut self, id: &str, input: &MovementInput) -> AppResult<Movement> {
        let &row = self
            .id_by_row
            .get(id)
            .ok_or_else(|| AppError::MovementNotFound(id.to_string()))?;
        let date = parse_loose_date(&input.date)
            .ok_or_else(|| AppError::Invalid("Fecha inválida".into()))?;

        let sheet = self.book.get_sheet_by_name_mut(REGISTRO).unwrap();
        // Clear both income/expense before writing the correct one
        sheet
            .get_cell_mut((COL_INGRESO, row))
            .set_blank();
        sheet
            .get_cell_mut((COL_GASTO, row))
            .set_blank();
        // Write with same logic
        let prev_row = if row == FIRST_DATA_ROW { 0 } else { row - 1 };
        write_row(sheet, row, &date, input, prev_row)?;

        let sheet = self.book.get_sheet_by_name(REGISTRO).unwrap();
        let m = read_row(sheet, row, id, &mut 0.0)?.unwrap();
        Ok(m)
    }

    pub fn delete_movement(&mut self, id: &str) -> AppResult<()> {
        let &row = self
            .id_by_row
            .get(id)
            .ok_or_else(|| AppError::MovementNotFound(id.to_string()))?;
        self.delete_row(row)?;
        self.rebuild_index();
        Ok(())
    }

    /// Delete multiple movements by ID. Rows are removed bottom-to-top
    /// to avoid index shifting. The index is rebuilt once at the end.
    /// Returns the count of successfully deleted movements.
    pub fn delete_movements(&mut self, ids: &[String]) -> AppResult<usize> {
        if ids.is_empty() {
            return Ok(0);
        }

        // Collect rows for found IDs, track how many are valid
        let mut row_ids: Vec<(String, u32)> = Vec::new();
        let mut found = 0usize;
        for id in ids {
            if let Some(&row) = self.id_by_row.get(id) {
                row_ids.push((id.clone(), row));
                found += 1;
            }
        }

        if found == 0 {
            return Ok(0);
        }

        // Sort reverse by row (delete bottom-up to avoid shifting)
        row_ids.sort_by(|a, b| b.1.cmp(&a.1));

        for (_, row) in &row_ids {
            self.delete_row(*row)?;
        }

        self.rebuild_index();
        Ok(found)
    }

    fn delete_row(&mut self, row: u32) -> AppResult<()> {
        let sheet = self.book.get_sheet_by_name_mut(REGISTRO).unwrap();
        let (_, max_row) = sheet.get_highest_column_and_row();

        // Shift rows up from row+1 to max_row
        for r in row..max_row {
            for col in [
                COL_FECHA,
                COL_CATEGORIA,
                COL_INGRESO,
                COL_GASTO,
                COL_NECESARIO,
                COL_DESCRIPCION,
            ] {
                let v = sheet.get_value((col, r + 1));
                if v.is_empty() {
                    sheet.get_cell_mut((col, r)).set_blank();
                } else if col == COL_FECHA {
                    if let Ok(n) = v.parse::<f64>() {
                        sheet.get_cell_mut((col, r)).set_value_number(n);
                        sheet
                            .get_style_mut((col, r))
                            .get_number_format_mut()
                            .set_format_code("dd/mm/yyyy");
                    } else {
                        sheet.get_cell_mut((col, r)).set_value_string(v);
                    }
                } else if col == COL_INGRESO || col == COL_GASTO {
                    if let Ok(n) = v.parse::<f64>() {
                        sheet.get_cell_mut((col, r)).set_value_number(n);
                    } else {
                        sheet.get_cell_mut((col, r)).set_blank();
                    }
                } else {
                    sheet.get_cell_mut((col, r)).set_value_string(v);
                }
            }
            // Re-apply formula columns for the shifted row (month/year/total depend on row number)
            let prev_row = if r == FIRST_DATA_ROW { 0 } else { r - 1 };
            apply_formula_columns(sheet, r, prev_row);
            // Preserve currency and date formats after shift
            for col in [COL_INGRESO, COL_GASTO, COL_TOTAL] {
                sheet
                    .get_style_mut((col, r))
                    .get_number_format_mut()
                    .set_format_code("#,##0.00\\ \"€\"");
            }
        }

        // Clear the last row
        for col in 1u32..=9u32 {
            sheet
                .get_cell_mut((col, max_row))
                .set_blank();
        }

        // Shrink DATOS table range
        let new_last = std::cmp::max(FIRST_DATA_ROW, max_row - 1);
        if let Some(t) = sheet.get_tables_mut().iter_mut().next() {
            let (beg, _end) = t.get_area().clone();
            let beg_t = (*beg.get_col_num(), *beg.get_row_num());
            let end_t = (9u32, new_last);
            t.set_area((beg_t, end_t));
        }

        Ok(())
    }

    pub fn save_atomic(&self) -> AppResult<()> {
        let tmp = self.path.with_extension("xlsx.savetmp");
        us::writer::xlsx::write(&self.book, &tmp).map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            AppError::Excel(e.to_string())
        })?;
        // On Windows, renaming over an open file can fail. Surface as FileBusy.
        match std::fs::rename(&tmp, &self.path) {
            Ok(()) => Ok(()),
            Err(e) => {
                let _ = std::fs::remove_file(&tmp);
                if cfg!(windows) {
                    Err(AppError::FileBusy)
                } else {
                    Err(AppError::Io(e))
                }
            }
        }
    }
}

fn row_has_content(sheet: &us::Worksheet, row: u32) -> bool {
    let fecha = sheet.get_value((COL_FECHA, row));
    let cat = sheet.get_value((COL_CATEGORIA, row));
    let ing = sheet.get_value((COL_INGRESO, row));
    let gas = sheet.get_value((COL_GASTO, row));
    !fecha.is_empty() && (!cat.is_empty() || !ing.is_empty() || !gas.is_empty())
}

fn read_number(sheet: &us::Worksheet, coord: (u32, u32)) -> Option<f64> {
    let v = sheet.get_value(coord);
    if v.is_empty() {
        return None;
    }
    v.parse::<f64>().ok()
}

fn read_row(
    sheet: &us::Worksheet,
    row: u32,
    id: &str,
    running_total: &mut f64,
) -> AppResult<Option<Movement>> {
    if !row_has_content(sheet, row) {
        return Ok(None);
    }

    let fecha_raw = sheet.get_value((COL_FECHA, row));
    let (date_iso, raw_date, dirty_date) = if let Ok(n) = fecha_raw.parse::<f64>() {
        match serial_to_date(n) {
            Some(d) => (iso_date(d), None, false),
            None => (String::new(), Some(fecha_raw.clone()), true),
        }
    } else {
        match parse_loose_date(&fecha_raw) {
            Some(d) => (iso_date(d), Some(fecha_raw.clone()), false),
            None => (String::new(), Some(fecha_raw.clone()), true),
        }
    };

    let category = sheet.get_value((COL_CATEGORIA, row)).trim().to_string();
    let description = sheet.get_value((COL_DESCRIPCION, row)).trim().to_string();
    let income = read_number(sheet, (COL_INGRESO, row));
    let expense = read_number(sheet, (COL_GASTO, row));
    let necesario = sheet.get_value((COL_NECESARIO, row)).trim().to_uppercase();
    let necessary = match necesario.as_str() {
        "SI" | "SÍ" | "YES" | "TRUE" | "1" => Some(true),
        "" => None,
        _ => Some(false),
    };

    let (kind, amount) = match (income, expense) {
        (Some(i), Some(e)) if i > 0.0 && e > 0.0 => (MovementKind::Gasto, e),
        (Some(i), _) if i > 0.0 => (MovementKind::Ingreso, i),
        (_, Some(e)) if e > 0.0 => (MovementKind::Gasto, e),
        (Some(_), _) => (MovementKind::Ingreso, 0.0),
        (_, Some(_)) => (MovementKind::Gasto, 0.0),
        _ => return Ok(None),
    };

    *running_total += match kind {
        MovementKind::Ingreso => amount,
        MovementKind::Gasto => -amount,
    };

    Ok(Some(Movement {
        id: id.to_string(),
        row,
        date: date_iso,
        category,
        kind,
        amount,
        necessary,
        description,        total: Some(*running_total),
        raw_date,
        dirty: dirty_date,
    }))
}

fn write_row(
    sheet: &mut us::Worksheet,
    row: u32,
    date: &NaiveDate,
    input: &MovementInput,
    prev_row: u32,
) -> AppResult<()> {
    apply_formula_columns(sheet, row, prev_row);

    sheet
        .get_cell_mut((COL_FECHA, row))
        .set_value_number(date_to_serial(*date));
    sheet
        .get_style_mut((COL_FECHA, row))
        .get_number_format_mut()
        .set_format_code("dd/mm/yyyy");

    sheet
        .get_cell_mut((COL_CATEGORIA, row))
        .set_value_string(input.category.trim());

    // Clear both first
    sheet
        .get_cell_mut((COL_INGRESO, row))
        .set_blank();
    sheet
        .get_cell_mut((COL_GASTO, row))
        .set_blank();

    match input.kind {
        MovementKind::Ingreso => {
            sheet
                .get_cell_mut((COL_INGRESO, row))
                .set_value_number(input.amount);
        }
        MovementKind::Gasto => {
            sheet
                .get_cell_mut((COL_GASTO, row))
                .set_value_number(input.amount);
        }
    }

    for c in [COL_INGRESO, COL_GASTO] {
        sheet
            .get_style_mut((c, row))
            .get_number_format_mut()
            .set_format_code("#,##0.00\\ \"€\"");
    }
    sheet
        .get_style_mut((COL_TOTAL, row))
        .get_number_format_mut()
        .set_format_code("#,##0.00\\ \"€\"");

    sheet
        .get_cell_mut((COL_NECESARIO, row))
        .set_value_string(match input.necessary {
            Some(true) => "SI",
            Some(false) => "NO",
            None => "",
        });

    if input.description.trim().is_empty() {
        sheet.get_cell_mut((COL_DESCRIPCION, row)).set_blank();
    } else {
        sheet
            .get_cell_mut((COL_DESCRIPCION, row))
            .set_value_string(input.description.trim());
    }

    Ok(())
}

fn apply_formula_columns(sheet: &mut us::Worksheet, row: u32, prev_row: u32) {
    sheet
        .get_cell_mut((COL_MES, row))
        .set_formula(r#"UPPER(TEXT(DATOS[[#This Row],[FECHA]],"mmmm"))"#);
    sheet
        .get_cell_mut((COL_ANYO, row))
        .set_formula("YEAR(DATOS[[#This Row],[FECHA]])");

    let total_formula = if prev_row < FIRST_DATA_ROW {
        format!(
            "IF(AND(E{row}=\"\",F{row}=\"\"),\"\",E{row}-F{row})",
            row = row
        )
    } else {
        format!(
            "IF(AND(E{row}=\"\",F{row}=\"\"),\"\",E{row}-F{row}+H{prev})",
            row = row,
            prev = prev_row
        )
    };
    sheet
        .get_cell_mut((COL_TOTAL, row))
        .set_formula(total_formula);
}

fn amount_cents(amount: f64) -> i64 {
    (amount * 100.0).round() as i64
}

fn filter_matches(m: &Movement, f: &MovementFilter) -> bool {
    if !f.years.is_empty() || !f.months.is_empty() {
        let Ok(d) = NaiveDate::parse_from_str(&m.date, "%Y-%m-%d") else {
            return false;
        };
        if !f.years.is_empty() && !f.years.contains(&d.year()) {
            return false;
        }
        if !f.months.is_empty() && !f.months.contains(&d.month()) {
            return false;
        }
    }
    if !f.categories.is_empty()
        && !f
            .categories
            .iter()
            .any(|category| m.category.eq_ignore_ascii_case(category))
    {
        return false;
    }
    if !f.kinds.is_empty() && !f.kinds.contains(&m.kind) {
        return false;
    }
    if !f.necessary.is_empty() && !f.necessary.iter().any(|n| n == &m.necessary) {
        return false;
    }
    true
}
