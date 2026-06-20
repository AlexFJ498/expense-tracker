export type MovementKind = "ingreso" | "gasto";

export interface Movement {
  id: string;
  row: number;
  date: string; // ISO
  category: string;
  kind: MovementKind;
  amount: number;
  necessary: boolean | null;
  description: string;
  total: number | null;
  raw_date: string | null;
  dirty: boolean;
}

export interface Category {
  name: string;
}

export interface MovementFilter {
  search?: string;
  years?: number[];
  months?: number[];
  categories?: string[];
  kinds?: MovementKind[];
  necessary?: (boolean | null)[];
  date_from?: string;
  date_to?: string;
}

export interface WorkbookState {
  path: string | null;
  dirty: boolean;
  last_saved: string | null;
  recents: string[];
}

export interface Summary {
  income_total: number;
  expense_total: number;
  balance: number;
  count: number;
  avg_daily_expense: number;
  avg_daily_balance: number;
  max_expense: number;
  max_expense_category: string | null;
  necessary_ratio: number;
}

export interface MonthlySeriesPoint {
  year: number;
  month: number;
  label: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryBreakdownItem {
  category: string;
  income: number;
  expense: number;
  count: number;
}

export interface YearComparisonPoint {
  month: number;
  label: string;
  values: Record<string, number>;
}

export interface Analytics {
  summary: Summary;
  monthly: MonthlySeriesPoint[];
  categories: CategoryBreakdownItem[];
  year_comparison: YearComparisonPoint[];
  necessary_split: { necessary: number; discretionary: number };
  years: number[];
}

export interface MovementInput {
  date: string;
  category: string;
  kind: MovementKind;
  amount: number;
  necessary: boolean | null;
  description: string;
}

export interface ImportProvider {
  id: string;
  name: string;
  description: string;
  accepted_extensions: string[];
}

export interface ParsedImportRow {
  source_row: number;
  date: string | null;
  description: string;
  kind: MovementKind | null;
  amount: number | null;
  warnings: string[];
}

export interface ImportDraftRow {
  source_row: number;
  date: string;
  description: string;
  kind: MovementKind;
  amount: number;
  category: string;
  necessary: boolean | null;
  included: boolean;
}

export interface ImportDuplicate {
  source_row: number;
  movement_id: string;
  reason: string;
}

export interface ConfirmImportInput {
  provider_id: string;
  rows: ImportDraftRow[];
  new_categories: string[];
}

export interface ImportResult {
  imported_count: number;
  created_categories: string[];
  skipped_count: number;
}

export type RuleField = "concept";
export type RuleOperator = "equals" | "contains";
export type RuleCombinator = "and" | "or";

export interface ImportRule {
  id: string;
  name: string;
  description: string;
  field: RuleField;
  operator: RuleOperator;
  values: string[];
  combinator: RuleCombinator;
  category: string;
  necessary: boolean | null;
}

export interface ConflictingRule {
  rule_id: string;
  rule_name: string;
  category: string;
  necessary: boolean | null;
}

export interface BackupInfo {
  filename: string;
  timestamp: string;
  size: number;
}

export interface MovementRuleResult {
  movement_id: string;
  movement_description: string;
  rule_name: string;
  applied_category: string | null;
  applied_necessary: boolean | null;
  skipped: boolean;
  skip_reason: string | null;
  conflicting_rules: ConflictingRule[];
}

export interface MatchedRule {
  rule_id: string;
  category: string;
  necessary: boolean | null;
}

export interface RuleMatchResult {
  source_row: number;
  matches: MatchedRule[];
}
