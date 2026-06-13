// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Movement } from "../lib/types";
import { MovementsTable } from "./MovementsTable";

describe("MovementsTable", () => {
  it("renders movement descriptions in the list", () => {
    const movements: Movement[] = [
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
    ];

    render(<MovementsTable movements={movements} />);

    expect(screen.getByText("SUPERMERCADO CENTRO")).toBeTruthy();
  });
});
