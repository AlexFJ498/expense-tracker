// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../components/Sidebar";
import { Toaster } from "../components/ui/use-toast";
import { LanguageProvider } from "../lib/i18n";
import { api } from "../lib/api";
import { ImportDataPage } from "./ImportData";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  setDirty: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mocks.open,
}));

vi.mock("../store/workbook", () => ({
  useWorkbook: (selector: (state: { setDirty: (dirty: boolean) => void }) => unknown) =>
    selector({ setDirty: mocks.setDirty }),
}));

vi.mock("../lib/api", () => ({
  api: {
    listImportProviders: vi.fn(),
    listCategories: vi.fn(),
    parseImportFile: vi.fn(),
    detectImportDuplicates: vi.fn(),
    confirmImport: vi.fn(),
  },
}));

const listImportProviders = vi.mocked(api.listImportProviders);
const listCategories = vi.mocked(api.listCategories);
const parseImportFile = vi.mocked(api.parseImportFile);
const detectImportDuplicates = vi.mocked(api.detectImportDuplicates);
const confirmImport = vi.mocked(api.confirmImport);

function renderPage() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={["/import-data"]}>
        <Toaster>
          <ImportDataPage />
        </Toaster>
      </MemoryRouter>
    </LanguageProvider>,
  );
}

function renderPageWithSidebar() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={["/import-data"]}>
        <Toaster>
          <div className="flex">
            <Sidebar />
            <Routes>
              <Route path="/import-data" element={<ImportDataPage />} />
              <Route path="/" element={<div>Dashboard destino</div>} />
            </Routes>
          </div>
        </Toaster>
      </MemoryRouter>
    </LanguageProvider>,
  );
}

describe("ImportDataPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    listImportProviders.mockResolvedValue([
      {
        id: "kutxabank",
        name: "Kutxabank",
        description: "Exportación de movimientos Kutxabank",
        accepted_extensions: ["xls"],
      },
    ]);
    listCategories.mockResolvedValue([{ name: "COMIDA" }]);
    parseImportFile.mockResolvedValue([
      {
        source_row: 2,
        date: "2026-05-01",
        description: "Compra supermercado",
        kind: "gasto",
        amount: 42.5,
        warnings: [],
      },
    ]);
    detectImportDuplicates.mockResolvedValue([]);
    confirmImport.mockResolvedValue({
      imported_count: 1,
      created_categories: [],
      skipped_count: 0,
    });
  });

  it("loads providers and shows the bank selection", async () => {
    renderPage();

    expect(await screen.findByText("Selecciona un banco")).toBeTruthy();
    expect(screen.getByText("Kutxabank")).toBeTruthy();
  });

  it("requires completing included rows before detecting duplicates", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar archivo de prueba" }));

    expect(await screen.findByText("Completar movimientos")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));

    expect(
      await screen.findByText("Completa fecha, importe y necesario en las filas incluidas."),
    ).toBeTruthy();
    expect(detectImportDuplicates).not.toHaveBeenCalled();
  });

  it("shows an error when parsing the selected file fails", async () => {
    parseImportFile.mockRejectedValueOnce(new Error("bad file"));
    renderPage();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar archivo de prueba" }));

    expect(await screen.findByText("No se pudo leer el archivo seleccionado.")).toBeTruthy();
    expect(screen.queryByText("Completar movimientos")).toBeNull();
  });

  it("shows parse warnings and validates missing date and amount", async () => {
    parseImportFile.mockResolvedValueOnce([
      {
        source_row: 2,
        date: null,
        description: "Movimiento incompleto",
        kind: null,
        amount: null,
        warnings: ["Fecha inválida", "Importe inválido"],
      },
    ]);
    renderPage();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar archivo de prueba" }));

    expect(await screen.findByText("Fecha inválida")).toBeTruthy();
    expect(screen.getByText("Importe inválido")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));

    expect(
      await screen.findByText("Completa fecha, importe y necesario en las filas incluidas."),
    ).toBeTruthy();
    expect(detectImportDuplicates).not.toHaveBeenCalled();
  });

  it("excludes selected rows from duplicate detection and confirmation", async () => {
    parseImportFile.mockResolvedValueOnce([
      {
        source_row: 2,
        date: "2026-05-01",
        description: "Compra supermercado",
        kind: "gasto",
        amount: 42.5,
        warnings: [],
      },
      {
        source_row: 3,
        date: "2026-05-02",
        description: "Nomina",
        kind: "ingreso",
        amount: 1200,
        warnings: [],
      },
    ]);
    renderPage();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar archivo de prueba" }));

    await screen.findByText("Completar movimientos");
    fireEvent.change(screen.getByLabelText("Categoría fila 2"), {
      target: { value: "COMIDA" },
    });
    fireEvent.change(screen.getByLabelText("Necesario fila 2"), {
      target: { value: "true" },
    });
    fireEvent.change(screen.getByLabelText("Categoría fila 3"), {
      target: { value: "COMIDA" },
    });
    fireEvent.change(screen.getByLabelText("Necesario fila 3"), {
      target: { value: "false" },
    });
    fireEvent.click(screen.getByLabelText("Seleccionar fila 3"));
    fireEvent.click(screen.getByRole("button", { name: "Excluir selección" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));

    await screen.findByText("Revisar importación");
    expect(detectImportDuplicates).toHaveBeenCalledWith([
      expect.objectContaining({ source_row: 2, included: true }),
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar importación" }));

    await waitFor(() => expect(confirmImport).toHaveBeenCalledTimes(1));
    expect(confirmImport).toHaveBeenCalledWith({
      provider_id: "kutxabank",
      rows: [expect.objectContaining({ source_row: 2, included: true })],
      new_categories: [],
    });
  });

  it("marks a selected row as necessary and confirms the import payload", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar archivo de prueba" }));

    await screen.findByText("Completar movimientos");
    fireEvent.change(screen.getByLabelText("Nueva categoría"), {
      target: { value: "VIAJES" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir categoría" }));
    fireEvent.change(screen.getByLabelText("Categoría fila 2"), {
      target: { value: "COMIDA" },
    });
    fireEvent.click(screen.getByLabelText("Seleccionar fila 2"));
    fireEvent.click(screen.getByRole("button", { name: "Marcar selección como necesario" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));

    expect(await screen.findByText("Revisar importación")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar importación" }));

    await waitFor(() => expect(confirmImport).toHaveBeenCalledTimes(1));
    expect(confirmImport).toHaveBeenCalledWith({
      provider_id: "kutxabank",
      rows: [
        expect.objectContaining({
          source_row: 2,
          category: "COMIDA",
          necessary: true,
          included: true,
        }),
      ],
      new_categories: [],
    });
    expect(mocks.setDirty).toHaveBeenCalledWith(true);
  });

  it("toggles all row selection from the selection header", async () => {
    parseImportFile.mockResolvedValueOnce([
      {
        source_row: 2,
        date: "2026-05-01",
        description: "Compra supermercado",
        kind: "gasto",
        amount: 42.5,
        warnings: [],
      },
      {
        source_row: 3,
        date: "2026-05-02",
        description: "Nomina",
        kind: "ingreso",
        amount: 1200,
        warnings: [],
      },
    ]);
    renderPage();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar archivo de prueba" }));

    await screen.findByText("Completar movimientos");
    expect(screen.queryByRole("button", { name: "Seleccionar todas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Deseleccionar" })).toBeNull();

    const headerSelection = screen.getByLabelText("Seleccionar o deseleccionar todas las filas");
    fireEvent.click(headerSelection);
    expect(screen.getByText("2 seleccionadas")).toBeTruthy();

    fireEvent.click(headerSelection);

    expect(screen.getByText("0 seleccionadas")).toBeTruthy();
    expect(screen.getByLabelText("Seleccionar fila 2").getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("asks before returning to a step that clears the parsed import", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar archivo de prueba" }));

    await screen.findByText("Completar movimientos");
    fireEvent.click(screen.getByRole("button", { name: "Ir al paso Banco" }));

    expect(
      screen.getByText("Si vuelves a este paso se perderá la importación en curso. ¿Continuar?"),
    ).toBeTruthy();
    expect(screen.getByText("Completar movimientos")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByText("Completar movimientos")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ir al paso Banco" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Selecciona un banco")).toBeTruthy();
  });

  it("warns before navigating away after the wizard has started", async () => {
    renderPageWithSidebar();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));

    expect(
      screen.getByText("La importación en curso se perderá si sales de esta sección. ¿Continuar?"),
    ).toBeTruthy();
    expect(screen.getByText("Selecciona el archivo")).toBeTruthy();
    expect(screen.queryByText("Dashboard destino")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Dashboard destino")).toBeTruthy();
  });

  it("warns before navigating to another section while an import is in progress", async () => {
    renderPageWithSidebar();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar archivo de prueba" }));

    await screen.findByText("Completar movimientos");
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));

    expect(
      screen.getByText("La importación en curso se perderá si sales de esta sección. ¿Continuar?"),
    ).toBeTruthy();
    expect(screen.getByText("Completar movimientos")).toBeTruthy();
    expect(screen.queryByText("Dashboard destino")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Dashboard destino")).toBeTruthy();
  });

  it("allows reviewing and importing rows without a category", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar archivo de prueba" }));

    await screen.findByText("Completar movimientos");
    fireEvent.change(screen.getByLabelText("Necesario fila 2"), {
      target: { value: "false" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));

    expect(await screen.findByText("Revisar importación")).toBeTruthy();
    expect(detectImportDuplicates).toHaveBeenCalledWith([
      expect.objectContaining({ source_row: 2, category: "" }),
    ]);
  });

  it("shows the review as the movement list preview with the imported description", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: "Usar banco" }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar archivo de prueba" }));

    await screen.findByText("Completar movimientos");
    fireEvent.change(screen.getByLabelText("Necesario fila 2"), {
      target: { value: "true" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));

    expect(await screen.findByText("Revisar importación")).toBeTruthy();
    expect(screen.getByText("Compra supermercado")).toBeTruthy();
    expect(screen.getByText("Gasto")).toBeTruthy();
    expect(screen.getAllByText(/42,50/).length).toBeGreaterThan(0);
    expect(screen.getByText("Sí")).toBeTruthy();
  });
});
