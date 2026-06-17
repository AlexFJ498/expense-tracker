// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Category, Movement } from "../lib/types";
import { LanguageProvider } from "../lib/i18n";
import { Toaster } from "./ui/use-toast";
import { api } from "../lib/api";
import { MovementForm } from "./MovementForm";

vi.mock("../lib/api", () => ({
  api: {
    createMovement: vi.fn(),
    updateMovement: vi.fn(),
    deleteMovement: vi.fn(),
  },
}));

const updateMovement = vi.mocked(api.updateMovement);

function renderForm(editing: Movement, categories: Category[]) {
  return render(
    <LanguageProvider>
      <Toaster>
        <MovementForm
          open
          onOpenChange={vi.fn()}
          categories={categories}
          editing={editing}
          onSaved={vi.fn()}
          onDeleted={vi.fn()}
        />
      </Toaster>
    </LanguageProvider>,
  );
}

describe("MovementForm", () => {
  it("keeps the movement description when saving an edit", async () => {
    updateMovement.mockResolvedValueOnce({
      id: "m1",
      row: 10,
      date: "2026-05-30",
      category: "COMIDA",
      kind: "gasto",
      amount: 12.34,
      necessary: true,
      description: "COMPRA ACTUALIZADA",
      total: 100,
      raw_date: null,
      dirty: false,
    });

    renderForm(
      {
        id: "m1",
        row: 10,
        date: "2026-05-30",
        category: "COMIDA",
        kind: "gasto",
        amount: 12.34,
        necessary: true,
        description: "SUPERMERCADO CENTRO",
        total: 100,
        raw_date: null,
        dirty: false,
      },
      [{ name: "COMIDA" }],
    );

    const description = await screen.findByLabelText(/descripci.n/i);
    fireEvent.change(description, { target: { value: "COMPRA ACTUALIZADA" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(updateMovement).toHaveBeenCalledTimes(1));
    expect(updateMovement).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({ description: "COMPRA ACTUALIZADA" }),
    );
  });
});
