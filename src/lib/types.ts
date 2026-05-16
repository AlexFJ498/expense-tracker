export type MovementKind = "ingreso" | "gasto";

export interface Movement {
  id: string;
  row: number;
  date: string; // ISO
  category: string;
  kind: MovementKind;
  amount: number;
  necessary: boolean;
  total: number | null;
  raw_date: string | null;
  dirty: boolean;
}

export interface Category {
  name: string;
}

export interface MovementFilter {
  year?: number | null;
  month?: number | null;
  category?: string | null;
  kind?: MovementKind | null;
  necessary?: boolean | null;
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
  date: string; // ISO YYYY-MM-DD
  category: string;
  kind: MovementKind;
  amount: number;
  necessary: boolean;
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
  concept: string;
  kind: MovementKind | null;
  amount: number | null;
  warnings: string[];
}

export interface ImportDraftRow {
  source_row: number;
  date: string;
  concept: string;
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
