// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MovementFilter } from "../lib/types";
import { FiltersBar } from "./FiltersBar";

describe("FiltersBar", () => {
  afterEach(() => {
    cleanup();
  });

  const categories = [{ name: "COMIDA" }, { name: "SALARIO" }];
  const years = [2026, 2025];

  function renderFilters(filter: MovementFilter = {}, onChange = () => {}) {
    return render(
      <div>
        <FiltersBar filter={filter} onChange={onChange} categories={categories} years={years} />
        <button type="button">Fuera</button>
      </div>,
    );
  }

  it("emits plural filter arrays when selecting multiple values", () => {
    let currentFilter: MovementFilter = {};
    const changes: MovementFilter[] = [];

    const { rerender } = render(
      <FiltersBar
        filter={currentFilter}
        onChange={(next) => {
          changes.push(next);
          currentFilter = next;
        }}
        categories={categories}
        years={years}
      />,
    );

    const renderWithCurrentFilter = () =>
      rerender(
        <FiltersBar
          filter={currentFilter}
          onChange={(next) => {
            changes.push(next);
            currentFilter = next;
          }}
          categories={categories}
          years={years}
        />,
      );

    fireEvent.click(screen.getByRole("button", { name: /Categor/ }));
    fireEvent.click(screen.getByLabelText("COMIDA"));
    renderWithCurrentFilter();

    fireEvent.click(screen.getByLabelText("SALARIO"));
    renderWithCurrentFilter();

    fireEvent.click(screen.getByRole("button", { name: /Tipo/ }));
    fireEvent.click(screen.getByLabelText("Ingresos"));
    renderWithCurrentFilter();

    fireEvent.click(screen.getByLabelText("Gastos"));

    expect(changes[changes.length - 1]).toMatchObject({
      categories: ["COMIDA", "SALARIO"],
      kinds: ["ingreso", "gasto"],
    });
  });

  it("closes an open selector when clicking outside it", async () => {
    renderFilters();

    fireEvent.click(screen.getByRole("button", { name: /Categor/ }));
    expect(screen.getByRole("listbox", { name: /Categor/ })).toBeTruthy();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Fuera" }));

    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: /Categor/ })).toBeNull(),
    );
  });
});
