// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import packageMetadata from "../../package.json";
import { LanguageProvider, useLanguage } from "./i18n";
import { APP_VERSION } from "./version";

function SidebarVersion() {
  const { t } = useLanguage();
  return <span>{t("sidebar.version")}</span>;
}

describe("displayed application version", () => {
  it("uses package metadata in the sidebar translation", () => {
    expect(APP_VERSION).toBe(`v${packageMetadata.version}`);
    render(
      <LanguageProvider>
        <SidebarVersion />
      </LanguageProvider>,
    );
    expect(screen.getByText(APP_VERSION)).toBeTruthy();
  });
});
