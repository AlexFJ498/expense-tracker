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
    pub necessary: Option<bool>,
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
    pub necessary: Vec<Option<bool>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MovementInput {
    pub date: String,
    pub category: String,
    pub kind: MovementKind,
    pub amount: f64,
    pub necessary: Option<bool>,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportProvider {
    pub id: String,
    pub name: String,
    pub description: String,
    pub accepted_extensions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RuleField {
    Concept,
}

impl std::fmt::Display for RuleField {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RuleField::Concept => write!(f, "Concept"),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RuleOperator {
    Equals,
    Contains,
}

impl std::fmt::Display for RuleOperator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RuleOperator::Equals => write!(f, "Equals"),
            RuleOperator::Contains => write!(f, "Contains"),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RuleCombinator {
    And,
    Or,
}

impl std::fmt::Display for RuleCombinator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RuleCombinator::And => write!(f, "And"),
            RuleCombinator::Or => write!(f, "Or"),
        }
    }
}

impl Default for RuleCombinator {
    fn default() -> Self {
        RuleCombinator::Or
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub field: RuleField,
    pub operator: RuleOperator,
    #[serde(default)]
    pub values: Vec<String>,
    #[serde(default)]
    pub combinator: RuleCombinator,
    pub category: String,
    pub necessary: Option<bool>,
}

// Custom Deserialize to support backward compat: old "value": "string" → values: ["string"]
impl<'de> Deserialize<'de> for ImportRule {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct Helper {
            id: String,
            name: String,
            #[serde(default)]
            description: String,
            field: RuleField,
            operator: RuleOperator,
            #[serde(default)]
            values: Option<Vec<String>>,
            #[serde(default)]
            value: Option<String>,
            #[serde(default)]
            combinator: RuleCombinator,
            category: String,
            necessary: Option<bool>,
        }

        let h = Helper::deserialize(deserializer)?;
        let values = match (h.values, h.value) {
            (Some(v), _) if !v.is_empty() => v,
            (_, Some(v)) if !v.trim().is_empty() => vec![v],
            _ => vec![],
        };

        Ok(ImportRule {
            id: h.id,
            name: h.name,
            description: h.description,
            field: h.field,
            operator: h.operator,
            values,
            combinator: h.combinator,
            category: h.category,
            necessary: h.necessary,
        })
    }
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

#[derive(Debug, Clone, Serialize)]
pub struct MovementRuleResult {
    pub movement_id: String,
    pub movement_description: String,
    pub rule_name: String,
    pub applied_category: Option<String>,
    pub applied_necessary: Option<bool>,
    pub skipped: bool,
    pub skip_reason: Option<String>,
}
