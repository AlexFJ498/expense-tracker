// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n";
import { MovementsTable, type MovementTableItem } from "./MovementsTable";

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

/** Generate N movements with incrementing dates and amounts for sort/pagination testing */
function makeMovements(count: number): MovementTableItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i + 1}`,
    row: i + 2,
    date: `2026-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    category: i % 3 === 0 ? "SALARIO" : i % 3 === 1 ? "COMIDA" : "TRANSPORTE",
    description: `Movement ${i + 1}`,
    kind: (i % 2 === 0 ? "ingreso" : "gasto") as "ingreso" | "gasto",
    amount: 100 + i * 10,
    necessary: i % 2 === 0,
  }));
}

/** Small set for sort tests — 5 items with distinct values */
function makeSortTestData(): MovementTableItem[] {
  return [
    {
      id: "s1",
      row: 2,
      date: "2026-01-15",
      category: "COMIDA",
      description: "Lunch",
      kind: "gasto",
      amount: 25,
      necessary: true,
    },
    {
      id: "s2",
      row: 3,
      date: "2026-03-10",
      category: "SALARIO",
      description: "Salary March",
      kind: "ingreso",
      amount: 3000,
      necessary: true,
    },
    {
      id: "s3",
      row: 4,
      date: "2026-02-20",
      category: "TRANSPORTE",
      description: "Bus pass",
      kind: "gasto",
      amount: 50,
      necessary: false,
    },
    {
      id: "s4",
      row: 5,
      date: "2026-01-05",
      category: "COMIDA",
      description: "Coffee",
      kind: "gasto",
      amount: 5,
      necessary: false,
    },
    {
      id: "s5",
      row: 6,
      date: "2026-04-01",
      category: "SALARIO",
      description: "Salary April",
      kind: "ingreso",
      amount: 3100,
      necessary: true,
    },
  ];
}

describe("MovementsTable", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // ─── Rendering baseline ────────────────────────────
  describe("basic rendering", () => {
    it("renders movement descriptions in the list", () => {
      const movements: MovementTableItem[] = [
        {
          id: "m1",
          row: 10,
          date: "2026-05-30",
          category: "COMIDA",
          kind: "gasto",
          amount: 12.34,
          necessary: true,
          description: "SUPERMERCADO CENTRO",
        },
      ];

      render(<LanguageProvider><MovementsTable movements={movements} /></LanguageProvider>);

      expect(screen.getByText("SUPERMERCADO CENTRO")).toBeTruthy();
    });
  });

  // ─── Phase 3: Sorting ──────────────────────────────
  describe("sorting", () => {
    const data = makeSortTestData();

    it("sorts by date descending by default", () => {
      render(<LanguageProvider><MovementsTable movements={data} /></LanguageProvider>);

      const rows = screen.getAllByRole("row").slice(1); // skip header
      // Descending date: Apr 01, Mar 10, Feb 20, Jan 15, Jan 05
      expect(rows[0].textContent).toContain("Salary April");
      expect(rows[1].textContent).toContain("Salary March");
    });

    it("toggles to ascending when clicking the active sort column header", () => {
      render(<LanguageProvider><MovementsTable movements={data} /></LanguageProvider>);

      // Default: date desc. Click date header → toggle to asc.
      const dateHeader = screen.getByRole("button", { name: /fecha/i });
      fireEvent.click(dateHeader);

      const rows = screen.getAllByRole("row").slice(1);
      // Ascending date: Jan 05, Jan 15, Feb 20, Mar 10, Apr 01
      expect(rows[0].textContent).toContain("Coffee");
      expect(rows[4].textContent).toContain("Salary April");
    });

    it("sorts descending when clicking a different column", () => {
      render(<LanguageProvider><MovementsTable movements={data} /></LanguageProvider>);

      // Currently sorted by date desc. Click amount header → sort by amount desc.
      const amountHeader = screen.getByRole("button", { name: /importe/i });
      fireEvent.click(amountHeader);

      const rows = screen.getAllByRole("row").slice(1);
      // Descending amount: 3100, 3000, -5, -25, -50
      expect(rows[0].textContent).toContain("Salary April");
      expect(rows[4].textContent).toContain("Bus pass");
    });

    it("toggles direction when clicking the same column twice", () => {
      render(<LanguageProvider><MovementsTable movements={data} /></LanguageProvider>);

      // Click amount → desc (first click on new column)
      const amountHeader = screen.getByRole("button", { name: /importe/i });
      fireEvent.click(amountHeader);
      expect(amountHeader.textContent).toContain("▼");

      // Click again → asc
      fireEvent.click(amountHeader);
      expect(amountHeader.textContent).toContain("▲");

      const rows = screen.getAllByRole("row").slice(1);
      // Ascending: -50, -25, -5, 3000, 3100
      expect(rows[0].textContent).toContain("Bus pass");
      expect(rows[4].textContent).toContain("Salary April");
    });

    it("shows sort indicator on the active column", () => {
      render(<LanguageProvider><MovementsTable movements={data} /></LanguageProvider>);

      // Default: date desc → ▼ indicator
      const dateHeader = screen.getByRole("button", { name: /fecha/i });
      expect(dateHeader.textContent).toContain("▼");

      // Click to toggle asc → ▲
      fireEvent.click(dateHeader);
      expect(dateHeader.textContent).toContain("▲");
    });
  });

  // ─── Phase 3: Pagination ───────────────────────────
  describe("pagination", () => {
    it("shows pagination controls when items exceed page size", () => {
      const data = makeMovements(35); // default page size is 30
      render(<LanguageProvider><MovementsTable movements={data} /></LanguageProvider>);

      const nextButtons = screen.getAllByRole("button", { name: /next/i });
      expect(nextButtons.length).toBeGreaterThanOrEqual(1);
      const pageTexts = screen.getAllByText(/Página 1 de/i);
      expect(pageTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("hides pagination controls when items fit in one page", () => {
      const data = makeMovements(5);
      render(<LanguageProvider><MovementsTable movements={data} /></LanguageProvider>);

      expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
      expect(screen.queryByText(/Página \d+ de/i)).toBeNull();
    });

    it("navigates to next and previous pages", () => {
      const data = makeMovements(35);
      render(<LanguageProvider><MovementsTable movements={data} /></LanguageProvider>);

      // Initially page 1
      const pageTexts = screen.getAllByText(/Página 1 de/i);
      expect(pageTexts.length).toBeGreaterThanOrEqual(1);

      // Click next (use the first next button)
      const nextBtn = screen.getAllByRole("button", { name: /next/i })[0];
      fireEvent.click(nextBtn);

      expect(screen.getAllByText(/Página 2 de/i).length).toBeGreaterThanOrEqual(1);

      // Click prev
      const prevBtn = screen.getAllByRole("button", { name: /previous/i })[0];
      fireEvent.click(prevBtn);

      expect(screen.getAllByText(/Página 1 de/i).length).toBeGreaterThanOrEqual(1);
    });

it("resets to page 1 when page size changes", () => {
      const data = makeMovements(35);
      render(<LanguageProvider><MovementsTable movements={data} enablePagination pageSize={10} /></LanguageProvider>);

      // Go to page 2 with page size 10
      const nextBtn = screen.getAllByRole("button", { name: /next/i })[0];
      fireEvent.click(nextBtn);
      expect(screen.getAllByText(/Página 2 de/i).length).toBeGreaterThanOrEqual(1);

      // Change page size to 50 — all items fit, controls should hide
      const pageSizeSelects = screen.getAllByLabelText(/page size/i);
      fireEvent.change(pageSizeSelects[0], { target: { value: "50" } });

      // All 35 items fit in page size 50 → no pagination controls
      expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
    });

    it("uses default page size 30 when not specified", () => {
      const data = makeMovements(35);
      render(<LanguageProvider><MovementsTable movements={data} /></LanguageProvider>);

      // 35 items, page size 30 → 2 pages
      const pageTexts = screen.getAllByText(/Página 1 de 2/i);
      expect(pageTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Phase 4: Multi-select ──────────────────────────
  describe("multi-select", () => {
    const data = makeMovements(5);

    it("shows checkboxes on each row when enableSelection is true", () => {
      render(<LanguageProvider><MovementsTable movements={data} enableSelection /></LanguageProvider>);

      // Header checkbox + 5 row checkboxes
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(6); // 1 header + 5 rows
    });

    it("does not show checkboxes when enableSelection is false", () => {
      render(<LanguageProvider><MovementsTable movements={data} enableSelection={false} /></LanguageProvider>);

      expect(screen.queryByRole("checkbox")).toBeNull();
    });

    it("selects individual rows via checkboxes", () => {
      render(<LanguageProvider><MovementsTable movements={data} enableSelection /></LanguageProvider>);

      // Click the checkbox for the first data row
      const firstRow = screen.getAllByRole("row")[1];
      const firstCheckbox = within(firstRow).getByRole("checkbox");
      fireEvent.click(firstCheckbox);

      // The batch delete toolbar should appear showing 1 selected
      expect(screen.getByText(/1 seleccionados/i)).toBeTruthy();
    });

    it("selects all rows on current page via header checkbox", () => {
      render(<LanguageProvider><MovementsTable movements={data} enableSelection /></LanguageProvider>);

      const headerCheckbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(headerCheckbox);

      // All 5 checkboxes should be checked → 5 selected
      expect(screen.getByText(/5 seleccionados/)).toBeTruthy();
    });

    it("deselects all on current page when header checkbox clicked with all selected", () => {
      render(<LanguageProvider><MovementsTable movements={data} enableSelection /></LanguageProvider>);

      // First select all
      const headerCheckbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(headerCheckbox);
      expect(screen.getByText(/5 seleccionados/)).toBeTruthy();

      // Click again → deselect all on page
      fireEvent.click(headerCheckbox);
      expect(screen.queryByText(/seleccionados/)).toBeNull();
    });

    it("persists selection across page changes", () => {
      const pagedData = makeMovements(35);
      render(<LanguageProvider><MovementsTable movements={pagedData} enableSelection pageSize={10} /></LanguageProvider>);

      // Select first item on page 1
      const firstRow = screen.getAllByRole("row")[1]; // first data row
      const firstCheckbox = within(firstRow).getByRole("checkbox");
      fireEvent.click(firstCheckbox);

      // Go to page 2
      const nextButtons = screen.getAllByRole("button", { name: /next/i });
      fireEvent.click(nextButtons[0]);

      // Select an item on page 2
      const page2FirstRow = screen.getAllByRole("row")[1];
      const page2Checkbox = within(page2FirstRow).getByRole("checkbox");
      fireEvent.click(page2Checkbox);

      // Go back to page 1
      fireEvent.click(screen.getAllByRole("button", { name: /previous/i })[0]);

      // The first item should still be selected (2 total: 1 from page 1, 1 from page 2)
      expect(screen.getByText(/2 seleccionados/i)).toBeTruthy();
    });
  });

  // ─── Phase 4: Batch delete ───────────────────────────
  describe("batch delete", () => {
    const data = makeMovements(5);

    it("shows delete button when items are selected", () => {
      render(<LanguageProvider><MovementsTable movements={data} enableSelection onBatchDelete={vi.fn()} /></LanguageProvider>);

      // No selection → no delete button
      expect(screen.queryByRole("button", { name: /eliminar/i })).toBeNull();

      // Select one item
      const firstRow = screen.getAllByRole("row")[1];
      const checkbox = within(firstRow).getByRole("checkbox");
      fireEvent.click(checkbox);

      // Delete button should appear
      expect(screen.getByRole("button", { name: /eliminar/i })).toBeTruthy();
    });

    it("opens confirmation dialog when delete is clicked", () => {
      render(<LanguageProvider><MovementsTable movements={data} enableSelection onBatchDelete={vi.fn()} /></LanguageProvider>);

      // Select one item
      const firstRow = screen.getAllByRole("row")[1];
      const checkbox = within(firstRow).getByRole("checkbox");
      fireEvent.click(checkbox);

      // Click delete
      fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));

      // Confirmation dialog should be visible
      expect(screen.getByTestId("dialog-content")).toBeTruthy();
      expect(screen.getByText(/eliminar 1 movimiento/i)).toBeTruthy();
    });

it("calls onBatchDelete with selected IDs on confirmation", async () => {
      const onBatchDelete = vi.fn().mockResolvedValue(undefined);
      render(<LanguageProvider><MovementsTable movements={data} enableSelection onBatchDelete={onBatchDelete} /></LanguageProvider>);

      // Select first and second items (sorted by date desc, so these are the last items in data)
      const rows = screen.getAllByRole("row").slice(1, 3); // first 2 data rows
      for (const row of rows) {
        fireEvent.click(within(row).getByRole("checkbox"));
      }

      // Click delete
      fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));

      // Confirm dialog should be visible
      expect(screen.getByText(/eliminar 2 movimientos/i)).toBeTruthy();

      // Click confirm in dialog
      fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

      // Wait for async onBatchDelete to complete
      await vi.waitFor(() => {
        expect(onBatchDelete).toHaveBeenCalledTimes(1);
      });
      // Verify it was called with exactly 2 IDs
      const calledIds = onBatchDelete.mock.calls[0][0] as string[];
      expect(calledIds).toHaveLength(2);
    });

    it("clears selection after successful delete", async () => {
      const onBatchDelete = vi.fn().mockResolvedValue(undefined);
      render(<LanguageProvider><MovementsTable movements={data} enableSelection onBatchDelete={onBatchDelete} /></LanguageProvider>);

      // Select one item
      const firstRow = screen.getAllByRole("row")[1];
      fireEvent.click(within(firstRow).getByRole("checkbox"));

      // Delete it
      fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

      // Wait for async onBatchDelete to complete and selection to clear
      await vi.waitFor(() => {
        expect(screen.queryByText(/seleccionados/)).toBeNull();
      });
    });
  });
});