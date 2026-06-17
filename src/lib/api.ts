import { invoke } from "@tauri-apps/api/core";
import type {
  Analytics,
  Category,
  ConfirmImportInput,
  ImportDraftRow,
  ImportDuplicate,
  ImportProvider,
  ImportResult,
  ImportRule,
  Movement,
  MovementFilter,
  MovementInput,
  MovementRuleResult,
  ParsedImportRow,
  RuleMatchResult,
  WorkbookState,
} from "./types";

export const api = {
  // Workbook lifecycle
  getWorkbookState: () => invoke<WorkbookState>("get_workbook_state"),
  createWorkbook: (path: string) => invoke<WorkbookState>("create_workbook", { path }),
  importWorkbook: (path: string) => invoke<WorkbookState>("import_workbook", { path }),
  closeWorkbook: () => invoke<WorkbookState>("close_workbook"),
  saveWorkbook: () => invoke<WorkbookState>("save_workbook"),
  copyWorkbook: (path: string) => invoke<WorkbookState>("copy_workbook", { path }),

  // Import data
  listImportProviders: () => invoke<ImportProvider[]>("list_import_providers"),
  parseImportFile: (providerId: string, path: string) =>
    invoke<ParsedImportRow[]>("parse_import_file", { providerId, path }),
  detectImportDuplicates: (rows: ImportDraftRow[]) =>
    invoke<ImportDuplicate[]>("detect_import_duplicates", { rows }),
  confirmImport: (input: ConfirmImportInput) =>
    invoke<ImportResult>("confirm_import", { input }),

  // Movements
  listMovements: (filter: MovementFilter = {}) =>
    invoke<Movement[]>("list_movements", { filter }),
  createMovement: (input: MovementInput) =>
    invoke<Movement>("create_movement", { input }),
  updateMovement: (id: string, input: MovementInput) =>
    invoke<Movement>("update_movement", { id, input }),
  deleteMovement: (id: string) => invoke<void>("delete_movement", { id }),
  deleteMovements: (ids: string[]) => invoke<number>("delete_movements", { ids }),

  // Categories
  listCategories: () => invoke<Category[]>("list_categories"),
  createCategory: (name: string) => invoke<Category>("create_category", { name }),
  deleteCategory: (name: string) => invoke<void>("delete_category", { name }),

  // Analytics
  getAnalytics: (filter: MovementFilter = {}) =>
    invoke<Analytics>("get_analytics", { filter }),

  // Import Rules
  listImportRules: () => invoke<ImportRule[]>("list_import_rules"),
  createImportRule: (rule: Omit<ImportRule, "id">) => {
    const withId = { ...rule, id: crypto.randomUUID() };
    return invoke<ImportRule>("create_import_rule", { rule: withId });
  },
  updateImportRule: (id: string, rule: ImportRule) =>
    invoke<ImportRule>("update_import_rule", { id, rule }),
  deleteImportRule: (id: string) => invoke<void>("delete_import_rule", { id }),
  evaluateImportRules: (rows: ParsedImportRow[]) =>
    invoke<RuleMatchResult[]>("evaluate_import_rules", { rows }),
  applyRulesToMovements: (ruleIds?: string[]) =>
    invoke<MovementRuleResult[]>("apply_rules_to_movements", {
      ruleIds: ruleIds ?? null,
    }),
};
