use crate::error::{AppError, AppResult};
use crate::excel::dates::{iso_date, parse_loose_date, serial_to_date};
use crate::models::{MovementKind, ParsedImportRow};
use calamine::{Data, Reader};
use std::path::Path;

const REQUIRED_HEADERS: [&str; 3] = ["fecha", "concepto", "importe"];

pub fn parse_file(path: &Path) -> AppResult<Vec<ParsedImportRow>> {
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default();
    if !extension.eq_ignore_ascii_case("xls") {
        return Err(AppError::Invalid(
            "Kutxabank solo admite archivos .xls".to_string(),
        ));
    }

    let mut workbook = calamine::open_workbook_auto(path)
        .map_err(|err| AppError::Excel(format!("No se pudo abrir el archivo: {err}")))?;
    let range = workbook
        .worksheet_range_at(0)
        .ok_or_else(|| AppError::InvalidWorkbook("El archivo no contiene hojas".to_string()))?
        .map_err(|err| AppError::Excel(format!("No se pudo leer la primera hoja: {err}")))?;

    parse_range(&range)
}

pub fn parse_range(range: &calamine::Range<Data>) -> AppResult<Vec<ParsedImportRow>> {
    let (header_index, columns) = find_header(range)?;
    let mut rows = Vec::new();

    for (row_index, row) in range.rows().enumerate().skip(header_index + 1) {
        if is_empty_row(row) {
            continue;
        }

        let mut warnings = Vec::new();
        let source_row = (row_index + 1) as u32;
        let concept = cell_string(row.get(columns.concept)).trim().to_string();

        let date = match parse_date_cell(row.get(columns.date)) {
            Some(date) => Some(date),
            None => {
                warnings.push("Fecha inválida".to_string());
                None
            }
        };

        let (kind, amount) = match parse_amount_cell(row.get(columns.amount)) {
            Some(amount) if amount < 0.0 => (Some(MovementKind::Gasto), Some(amount.abs())),
            Some(amount) => (Some(MovementKind::Ingreso), Some(amount)),
            None => {
                warnings.push("Importe inválido".to_string());
                (None, None)
            }
        };

        rows.push(ParsedImportRow {
            source_row,
            date,
            concept,
            kind,
            amount,
            warnings,
        });
    }

    Ok(rows)
}

#[derive(Debug, Clone, Copy)]
struct HeaderColumns {
    date: usize,
    concept: usize,
    amount: usize,
}

fn find_header(range: &calamine::Range<Data>) -> AppResult<(usize, HeaderColumns)> {
    let mut best_row: Option<(usize, Vec<String>)> = None;

    for (row_index, row) in range.rows().enumerate() {
        let headers = row
            .iter()
            .map(|cell| normalize_header(&cell_string(Some(cell))))
            .collect::<Vec<_>>();
        let matched = REQUIRED_HEADERS
            .iter()
            .filter(|required| headers.iter().any(|header| header == **required))
            .count();

        if matched == REQUIRED_HEADERS.len() {
            return Ok((
                row_index,
                HeaderColumns {
                    date: find_header_index(&headers, "fecha").unwrap(),
                    concept: find_header_index(&headers, "concepto").unwrap(),
                    amount: find_header_index(&headers, "importe").unwrap(),
                },
            ));
        }

        if matched
            > best_row
                .as_ref()
                .map(|(_, headers)| header_count(headers))
                .unwrap_or(0)
        {
            best_row = Some((row_index, headers));
        }
    }

    let headers = best_row.map(|(_, headers)| headers).unwrap_or_default();
    let missing = REQUIRED_HEADERS
        .iter()
        .filter(|required| !headers.iter().any(|header| header == **required))
        .copied()
        .collect::<Vec<_>>();

    Err(AppError::InvalidWorkbook(format!(
        "Faltan columnas obligatorias: {}",
        missing.join(", ")
    )))
}

fn header_count(headers: &[String]) -> usize {
    REQUIRED_HEADERS
        .iter()
        .filter(|required| headers.iter().any(|header| header == **required))
        .count()
}

fn find_header_index(headers: &[String], required: &str) -> Option<usize> {
    headers.iter().position(|header| header == required)
}

fn normalize_header(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn is_empty_row(row: &[Data]) -> bool {
    row.iter()
        .all(|cell| cell_string(Some(cell)).trim().is_empty())
}

fn parse_date_cell(cell: Option<&Data>) -> Option<String> {
    match cell {
        Some(Data::Float(value)) => serial_to_date(*value).map(iso_date),
        Some(Data::Int(value)) => serial_to_date(*value as f64).map(iso_date),
        Some(Data::String(value)) => parse_loose_date(value).map(iso_date),
        Some(other) => parse_loose_date(&cell_string(Some(other))).map(iso_date),
        None => None,
    }
}

fn parse_amount_cell(cell: Option<&Data>) -> Option<f64> {
    match cell {
        Some(Data::Float(value)) => Some(*value),
        Some(Data::Int(value)) => Some(*value as f64),
        Some(Data::String(value)) => parse_amount_string(value),
        Some(other) => parse_amount_string(&cell_string(Some(other))),
        None => None,
    }
}

fn parse_amount_string(value: &str) -> Option<f64> {
    let mut normalized = value
        .trim()
        .replace('€', "")
        .replace(char::is_whitespace, "");
    if normalized.is_empty() {
        return None;
    }

    if normalized.contains(',') {
        normalized = normalized.replace('.', "").replace(',', ".");
    }

    normalized.parse::<f64>().ok()
}

fn cell_string(cell: Option<&Data>) -> String {
    match cell {
        Some(Data::Empty) | None => String::new(),
        Some(Data::String(value)) => value.clone(),
        Some(Data::Float(value)) => value.to_string(),
        Some(Data::Int(value)) => value.to_string(),
        Some(Data::Bool(value)) => value.to_string(),
        Some(Data::DateTime(value)) => value.to_string(),
        Some(Data::DateTimeIso(value)) => value.clone(),
        Some(Data::DurationIso(value)) => value.clone(),
        Some(Data::Error(value)) => value.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use calamine::{Data, Range};

    fn sample_range() -> Range<Data> {
        let mut range = Range::new((0, 0), (3, 4));
        range.set_value((0, 0), Data::String("fecha".to_string()));
        range.set_value((0, 1), Data::String("concepto".to_string()));
        range.set_value((0, 2), Data::String("fecha valor".to_string()));
        range.set_value((0, 3), Data::String("importe".to_string()));
        range.set_value((0, 4), Data::String("saldo".to_string()));
        range.set_value((1, 0), Data::String("01/05/2026".to_string()));
        range.set_value((1, 1), Data::String("SUPERMERCADO".to_string()));
        range.set_value((1, 3), Data::Float(-12.34));
        range.set_value((2, 0), Data::String("02/05/2026".to_string()));
        range.set_value((2, 1), Data::String("NOMINA".to_string()));
        range.set_value((2, 3), Data::Float(1200.0));
        range.set_value((3, 0), Data::String("sin fecha".to_string()));
        range.set_value((3, 1), Data::String("FILA RARA".to_string()));
        range.set_value((3, 3), Data::String("8,50".to_string()));
        range
    }

    #[test]
    fn parses_kutxabank_rows_from_range() {
        let rows = parse_range(&sample_range()).expect("parse range");

        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0].source_row, 2);
        assert_eq!(rows[0].date.as_deref(), Some("2026-05-01"));
        assert_eq!(rows[0].concept, "SUPERMERCADO");
        assert_eq!(rows[0].kind, Some(MovementKind::Gasto));
        assert_eq!(rows[0].amount, Some(12.34));
        assert_eq!(rows[1].kind, Some(MovementKind::Ingreso));
        assert_eq!(rows[1].amount, Some(1200.0));
        assert_eq!(rows[2].date, None);
        assert!(rows[2]
            .warnings
            .iter()
            .any(|w| w.contains("Fecha inválida")));
    }

    #[test]
    fn fails_when_required_headers_are_missing() {
        let mut range = Range::new((0, 0), (1, 1));
        range.set_value((0, 0), Data::String("fecha".to_string()));
        range.set_value((0, 1), Data::String("concepto".to_string()));

        let err = parse_range(&range).expect_err("missing importe should fail");

        assert!(err.to_string().contains("Faltan columnas obligatorias"));
    }
}
