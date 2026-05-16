import { describe, expect, it } from "vitest";
import { cn, formatDate, formatEuro, formatEuroSigned, monthName } from "./utils";

describe("formatEuro", () => {
  it("formats valid euro amounts and hides missing values", () => {
    expect(formatEuro(1234.5)).toMatch(/^1234,50\s€$/u);
    expect(formatEuro(null)).toBe("—");
    expect(formatEuro(Number.NaN)).toBe("—");
  });

  it("adds an explicit sign without changing zero", () => {
    expect(formatEuroSigned(25)).toMatch(/^\+25,00\s€$/u);
    expect(formatEuroSigned(-25)).toMatch(/^−25,00\s€$/u);
    expect(formatEuroSigned(0)).toMatch(/^0,00\s€$/u);
  });
});

describe("formatDate", () => {
  it("formats ISO dates and hides invalid dates", () => {
    expect(formatDate("2026-05-08")).toBe("08/05/2026");
    expect(formatDate("2026-02-31")).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});

describe("monthName", () => {
  it("returns Spanish month names for one-based month numbers", () => {
    expect(monthName(1)).toBe("Enero");
    expect(monthName(12)).toBe("Diciembre");
    expect(monthName(13)).toBe("");
  });
});

describe("cn", () => {
  it("merges conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });
});
