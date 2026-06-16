// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { api } from "./api";

// Mock @tauri-apps/api/core for all tests
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import type { ImportRule, ParsedImportRow } from "./types";

const mockedInvoke = vi.mocked(invoke);

describe("Import Rules API wrappers", () => {
  it("listImportRules calls invoke with correct command", async () => {
    vi.clearAllMocks();
    const rules: ImportRule[] = [];
    mockedInvoke.mockResolvedValueOnce(rules);
    const result = await api.listImportRules();
    expect(mockedInvoke).toHaveBeenCalledWith("list_import_rules");
    expect(result).toEqual([]);
  });

  it("createImportRule calls invoke with rule including generated id", async () => {
    vi.clearAllMocks();
    const mockUuid = "uuid-1";
    vi.stubGlobal("crypto", {
      randomUUID: () => mockUuid,
    });
    const rule: Omit<ImportRule, "id"> = {
      name: "Groceries",
      description: "",
      field: "concept",
      operator: "contains",
      values: ["mercadona"],
      combinator: "or",
      category: "Food",
      necessary: true,
    };
    const returned: ImportRule = { ...rule, id: mockUuid };
    mockedInvoke.mockResolvedValueOnce(returned);
    const result = await api.createImportRule(rule);
    expect(mockedInvoke).toHaveBeenCalledWith("create_import_rule", {
      rule: { ...rule, id: mockUuid },
    });
    expect(result.id).toBe(mockUuid);
  });

  it("updateImportRule calls invoke with id and rule", async () => {
    vi.clearAllMocks();
    const rule: ImportRule = {
      id: "uuid-1",
      name: "Groceries",
      description: "",
      field: "concept",
      operator: "contains",
      values: ["mercadona"],
      combinator: "or",
      category: "Food",
      necessary: true,
    };
    mockedInvoke.mockResolvedValueOnce(rule);
    const result = await api.updateImportRule("uuid-1", rule);
    expect(mockedInvoke).toHaveBeenCalledWith("update_import_rule", { id: "uuid-1", rule });
    expect(result.id).toBe("uuid-1");
  });

  it("deleteImportRule calls invoke with id", async () => {
    vi.clearAllMocks();
    mockedInvoke.mockResolvedValueOnce(undefined);
    await api.deleteImportRule("uuid-1");
    expect(mockedInvoke).toHaveBeenCalledWith("delete_import_rule", { id: "uuid-1" });
  });

  it("evaluateImportRules calls invoke with rows", async () => {
    vi.clearAllMocks();
    const rows: ParsedImportRow[] = [
      { source_row: 1, date: null, description: "MERCADONA", kind: null, amount: null, warnings: [] },
    ];
    mockedInvoke.mockResolvedValueOnce([
      { source_row: 1, matches: [{ rule_id: "r1", category: "Food", necessary: true }] },
    ]);
    const result = await api.evaluateImportRules(rows);
    expect(mockedInvoke).toHaveBeenCalledWith("evaluate_import_rules", { rows });
    expect(result).toHaveLength(1);
    expect(result[0].source_row).toBe(1);
    expect(result[0].matches).toHaveLength(1);
  });
});