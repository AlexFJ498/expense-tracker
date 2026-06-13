use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MovementKind {
    Ingreso,
    Gasto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Movement {
    pub id: String,
    pub row: u32,
    pub date: String,
    pub category: String,
    pub kind: MovementKind,
    pub amount: f64,
    pub necessary: bool,
    pub description: String,
    pub total: Option<f64>,
    pub raw_date: Option<String>,
    pub dirty: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub name: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct MovementFilter {
    pub years: Vec<i32>,
    pub months: Vec<u32>,
    pub categories: Vec<String>,
    pub kinds: Vec<MovementKind>,
    pub necessary: Vec<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MovementInput {
    pub date: String,
    pub category: String,
    pub kind: MovementKind,
    pub amount: f64,
    pub necessary: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportProvider {
    pub id: String,
    pub name: String,
    pub description: String,
    pub accepted_extensions: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ParsedImportRow {
    pub source_row: u32,
    pub date: Option<String>,
    pub description: String,
    pub kind: Option<MovementKind>,
    pub amount: Option<f64>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportDraftRow {
    pub source_row: u32,
    pub date: String,
    pub description: String,
    pub kind: MovementKind,
    pub amount: f64,
    pub category: String,
    pub necessary: Option<bool>,
    pub included: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportDuplicate {
    pub source_row: u32,
    pub movement_id: String,
    pub reason: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConfirmImportInput {
    pub provider_id: String,
    pub rows: Vec<ImportDraftRow>,
    pub new_categories: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportResult {
    pub imported_count: usize,
    pub created_categories: Vec<String>,
    pub skipped_count: usize,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct WorkbookState {
    pub path: Option<String>,
    pub dirty: bool,
    pub last_saved: Option<String>,
    pub recents: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct Summary {
    pub income_total: f64,
    pub expense_total: f64,
    pub balance: f64,
    pub count: usize,
    pub avg_daily_expense: f64,
    pub max_expense: f64,
    pub max_expense_category: Option<String>,
    pub necessary_ratio: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MonthlySeriesPoint {
    pub year: i32,
    pub month: u32,
    pub label: String,
    pub income: f64,
    pub expense: f64,
    pub balance: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategoryBreakdownItem {
    pub category: String,
    pub income: f64,
    pub expense: f64,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct YearComparisonPoint {
    pub month: u32,
    pub label: String,
    pub values: std::collections::BTreeMap<String, f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NecessarySplit {
    pub necessary: f64,
    pub discretionary: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct Analytics {
    pub summary: Summary,
    pub monthly: Vec<MonthlySeriesPoint>,
    pub categories: Vec<CategoryBreakdownItem>,
    pub year_comparison: Vec<YearComparisonPoint>,
    pub necessary_split: NecessarySplit,
    pub years: Vec<i32>,
}
