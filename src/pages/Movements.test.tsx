// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n";
import { ThemeProvider } from "../components/ThemeProvider";

const { movements: mockMovements, categories: mockCategories } = vi.hoisted(() => {
  const movements = [
    {
      id: "m1",
      row: 10,
      date: "2026-04-20",
      category: "SALARIO",
      kind: "ingreso",
      amount: 2400,
      necessary: true,
      description: "",
      total: 2400,
      raw_date: null,
      dirty: false,
    },
    {
      id: "m2",
      row: 11,
      date: "2025-06-15",
      category: "COMIDA",
      kind: "gasto",
      amount: 42.75,
      necessary: true,
      description: "LUNCH",
      total: 2357.25,
      raw_date: null,
      dirty: false,
    },
  ];
  const categories = [{ name: "SALARIO" }, { name: "COMIDA" }];
  return { movements, categories };
});

vi.mock("../lib/api", () => ({
  api: {
    listMovements: vi.fn().mockResolvedValue(mockMovements),
    listCategories: vi.fn().mockResolvedValue(mockCategories),
    deleteMovements: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("../store/workbook", () => {
  const store = {
    setDirty: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    captureUndo: vi.fn(),
    performUndo: vi.fn().mockResolvedValue(undefined),
    clearUndo: vi.fn(),
  };
  return {
    useWorkbook: (selector?: (s: typeof store) => unknown) =>
      selector ? selector(store) : store,
  };
});

vi.mock("../components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogPortal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogOverlay: () => <div data-testid="overlay" />,
}));

import { api } from "../lib/api";
import { MovementsPage } from "./Movements";

function renderPage() {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        <MovementsPage />
      </ThemeProvider>
    </LanguageProvider>,
  );
}

describe("MovementsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("auto-selects the most recent year on first load", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("LUNCH")).toBeTruthy();
    });

    await waitFor(() => {
      const yearButton = screen.getByRole("button", { name: /Año/i });
      expect(yearButton.textContent).toContain("2026");
    });
  });

  it("shows movements after loading", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("SALARIO")).toBeTruthy();
      expect(screen.getByText("LUNCH")).toBeTruthy();
    });
  });

  describe("batch delete integration", () => {
    it("calls api.deleteMovements when batch delete is confirmed", async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("LUNCH")).toBeTruthy();
      });

      const rows = screen.getAllByRole("row").slice(1);
      const firstCheckbox = within(rows[0]).getByRole("checkbox");
      fireEvent.click(firstCheckbox);

      expect(screen.getByText(/1 seleccionados/i)).toBeTruthy();

      const deleteButton = screen.getByRole("button", { name: /eliminar/i });
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByRole("button", { name: /confirmar/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(api.deleteMovements).toHaveBeenCalledTimes(1);
      });
    });
  });
});
