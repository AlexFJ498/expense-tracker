import { invoke } from "@tauri-apps/api/core";
import type {
  Analytics,
  Category,
  ConfirmImportInput,
  ImportDraftRow,
  ImportDuplicate,
  ImportProvider,
  ImportResult,
  Movement,
  MovementFilter,
  MovementInput,
  ParsedImportRow,
  WorkbookState,
} from "./types";

export const api = {
  // Workbook lifecycle
  getWorkbookState: () => invoke<WorkbookState>("get_workbook_state"),
  createWorkbook: (path: string) => invoke<WorkbookState>("create_workbook", { path }),
  importWorkbook: (path: string) => invoke<WorkbookState>("import_workbook", { path }),
  closeWorkbook: () => invoke<WorkbookState>("close_workbook"),
  saveWorkbook: () => invoke<WorkbookState>("save_workbook"),

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

  // Categories
  listCategories: () => invoke<Category[]>("list_categories"),
  createCategory: (name: string) => invoke<Category>("create_category", { name }),
  deleteCategory: (name: string) => invoke<void>("delete_category", { name }),

  // Analytics
  getAnalytics: (filter: MovementFilter = {}) =>
    invoke<Analytics>("get_analytics", { filter }),
};
