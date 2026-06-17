# i18n Specification

## Purpose

Defines the internationalization infrastructure that allows switching the application UI language between Spanish and English, with Spanish as the default.

## Requirements

### Requirement: Language Context

The system MUST provide a React context (`LanguageProvider`) that holds the current language (`"es"` or `"en"`) and a translation function `t(key)`. The language MUST default to `"es"` (Spanish). The language preference MUST be persisted to `localStorage` under the key `"app-lang"` and restored on mount.

#### Scenario: Default language is Spanish

- GIVEN the app is loaded for the first time (no saved preference)
- WHEN any component renders a translated string
- THEN the Spanish translation is displayed

#### Scenario: Language preference persists

- GIVEN the user switches language to English
- WHEN the app is reloaded
- THEN the language is still English

#### Scenario: Translation key returns correct string

- GIVEN the current language is Spanish
- WHEN `t("filter.year")` is called
- THEN it returns "Año"
- AND when language is switched to English, it returns "Year"

#### Scenario: Unknown key returns the key itself

- GIVEN a translation key "nonexistent.key" does not exist
- WHEN `t("nonexistent.key")` is called
- THEN it returns "nonexistent.key" as fallback

### Requirement: Translated Strings Coverage

The system MUST translate all user-facing strings in the Movements page, FiltersBar, MovementsTable, MovementsByCategory, Topbar, and shared components (confirmation dialogs, toasts). This includes but is not limited to: filter labels, table column headers, pagination labels, kind labels, necessary labels, action buttons, dialog messages, toast messages, and summary labels.

#### Scenario: All filter labels are translated

- GIVEN the language is set to English
- WHEN the FiltersBar renders
- THEN all filter labels, option labels, and the clear button show English text

#### Scenario: Table headers and pagination are translated

- GIVEN the language is set to English
- WHEN the MovementsTable renders with data
- THEN column headers, "Rows per page", "Page X of Y", and action labels are in English

#### Scenario: Kind and necessary labels are translated

- GIVEN the language is set to English
- WHEN a movement row renders
- THEN "Ingreso" shows as "Income", "Gasto" as "Expense"
- AND "Sí" shows as "Yes", "No" as "No", "Sin asignar" as "Unassigned"

### Requirement: Language Switcher

The system MUST provide a UI control to switch the language. This control MUST be accessible from a Settings dialog. The switch MUST take effect immediately without a page reload.

#### Scenario: Switch language via settings

- GIVEN the app is in Spanish
- WHEN the user opens Settings and selects English
- THEN all visible UI strings immediately update to English
- AND the preference is saved to localStorage
