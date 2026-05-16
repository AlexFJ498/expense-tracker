// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { AnalyticsPage } from "./Analytics";
import { DashboardPage } from "./Dashboard";

vi.mock("../lib/api", () => ({
  api: {
    getAnalytics: vi.fn(),
    listCategories: vi.fn(),
  },
}));

const getAnalytics = vi.mocked(api.getAnalytics);
const listCategories = vi.mocked(api.listCategories);

describe("page load errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCategories.mockResolvedValue([]);
  });

  it("shows a dashboard error instead of staying in loading state", async () => {
    getAnalytics.mockRejectedValueOnce(new Error("backend unavailable"));

    render(<DashboardPage />);

    expect(await screen.findByText("No se pudo cargar el dashboard.")).toBeTruthy();
    expect(screen.getByText("Error: backend unavailable")).toBeTruthy();
  });

  it("shows an analytics error instead of staying in loading state", async () => {
    getAnalytics.mockRejectedValueOnce(new Error("analytics unavailable"));

    render(<AnalyticsPage />);

    expect(await screen.findByText("No se pudo cargar el análisis.")).toBeTruthy();
    expect(screen.getByText("Error: analytics unavailable")).toBeTruthy();
  });
});
