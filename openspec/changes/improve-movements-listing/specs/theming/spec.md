# Theming Specification

## Purpose

Defines the multi-theme system that allows selecting from at least 5 distinct color palettes, replacing the hardcoded dark-only theme.

## Requirements

### Requirement: Theme Context

The system MUST provide a React context (`ThemeProvider`) that holds the current theme identifier and applies the corresponding CSS class to the `<html>` element. The theme MUST default to `"oscuro"` (the existing dark theme). The theme preference MUST be persisted to `localStorage` under the key `"app-theme"` and restored on mount.

#### Scenario: Default theme is "oscuro"

- GIVEN the app is loaded for the first time
- WHEN the app renders
- THEN the `<html>` element has class `theme-oscuro`
- AND the visual appearance matches the current dark theme

#### Scenario: Theme preference persists

- GIVEN the user switches theme to "claro"
- WHEN the app is reloaded
- THEN the theme is still "claro"

#### Scenario: Theme switch updates HTML class immediately

- GIVEN the current theme is "oscuro"
- WHEN the user selects "oceano"
- THEN the `<html>` element class changes from `theme-oscuro` to `theme-oceano`
- AND all colors update without a page reload

### Requirement: Available Themes

The system MUST provide at least 5 distinct themes. Each theme MUST define the full set of CSS custom properties used by the application (background, foreground, primary, secondary, muted, accent, destructive, card, popover, border, input, ring, success, danger, and chart colors). Themes MUST be implemented as CSS files with a class selector (e.g., `.theme-oscuro`).

#### Scenario: All themes are selectable

- GIVEN the Settings dialog is open
- WHEN the user views the theme options
- THEN at least 5 themes are listed by name
- AND selecting any theme applies it correctly

#### Scenario: Theme provides complete color coverage

- GIVEN the user switches to each available theme
- WHEN viewing different parts of the app (Movements, Analytics, Import)
- THEN all UI elements render with the theme's colors
- AND no elements appear unstyled or with fallback browser defaults

### Requirement: Theme Switcher

The system MUST provide a UI control to select the theme. This control MUST be accessible from a Settings dialog, triggered via a gear icon in the Topbar. The theme list MUST display each theme's name.

#### Scenario: Open settings and change theme

- GIVEN the user clicks the gear icon in the Topbar
- WHEN the Settings dialog opens and the user selects a different theme
- THEN the theme applies immediately
- AND the preference is saved to localStorage

### Themes Specification

1. **Oscuro** (default): Dark background, light text — existing dark theme preserved.
2. **Claro**: Light background, dark text — existing `:root` light variables made active.
3. **Océano**: Blue-tinted dark theme with ocean blues for primary/secondary.
4. **Bosque**: Green-tinted dark theme with forest greens.
5. **Atardecer**: Warm amber/orange-tinted dark theme.
6. **Contraste**: High-contrast black background with pure white text and bright accents.
