# Proposal: Improve Movements Listing

## Intent

Transform the Movements page into a polished, flexible, and fully localized experience. This change covers filter UX polish, a category-grouped alternative view, i18n infrastructure with Spanish as default, a multi-theme system, auto-save with undo, dual pagination with an "all" option, and visual refinements to the table layout.

## Scope

### In Scope

**Filter improvements**
- Reposition labels closer to select triggers.
- Change filter button style when one or more values are active.
- Add "Sin asignar" (`null`) option to the Necessary filter.
- Add a search input inside the Category filter dropdown for quick filtering.

**i18n infrastructure**
- Lightweight React context-based i18n (no external library).
- Spanish (`es`) as default language; English (`en`) as alternative.
- Settings section to switch language.
- Translate all hardcoded strings in MovementsTable, FiltersBar, Topbar, and related components.

**Theme system**
- Define at least 5 distinct CSS-variable-based themes.
- ThemeContext + theme switcher in settings.
- Replace hardcoded `<html class="dark">` with dynamic theme application.

**Category-grouped view**
- Toggle between the existing flat table view and a new category-grouped view.
- Groups are collapsible (closed by default).
- Each group renders a compact table without the category column.
- Sort within groups by clicking column headers (same sort keys, minus category).

**Auto-save + undo**
- Remove the manual "Guardar" button from Topbar.
- Auto-save after every mutation (create, update, delete, batch-delete).
- Show a toast notification with a "Deshacer" action button.
- Confirmation dialog before executing undo.
- Undo reverts the workbook to the state before the last mutation.

**Pagination enhancements**
- Add "Todos" (all) option to page sizes.
- Duplicate pagination controls at the top of the table.

**Table visual polish**
- Reduce excessive whitespace between description and type columns.
- Adjust column widths for better space utilization.
- Refined row styling.

### Out of Scope
- Server-side sorting or pagination.
- Global search beyond existing filters.
- Drag-and-drop reordering.
- Inline cell editing.
- Full i18n for Analytics page (only Movements page + shared components).

## Capabilities

### New Capabilities
- `movement-listing-ui`: Expanded — filters polish, searchable category, necessary null, dual view, table polish, pagination enhancements. (existing, updated)
- `batch-delete`: Unchanged. (existing)
- `i18n`: Language context, Spanish/English translations, settings integration. (new)
- `theming`: Multi-theme CSS variable system, ThemeContext, theme switcher. (new)
- `auto-save-undo`: Auto-save on mutation, undo with confirmation. (new)

## Approach

1. **Filters**: Adjust `FiltersBar` layout (labels closer), add `active` visual state to `MultiSelectFilter`, add `null` option to Necessary, add search `<input>` inside Category dropdown.
2. **i18n**: Create `src/lib/i18n.ts` with translation maps and a `LanguageProvider` context. Wrap app. Add language switcher to a new Settings section.
3. **Themes**: Define 5+ CSS variable sets in `src/themes/`. Create `ThemeProvider` context. Replace static `class="dark"` on `<html>`.
4. **Category-grouped view**: Create `MovementsByCategory` component. Add view toggle in Movements page. Groups are collapsible `<details>`-like sections.
5. **Auto-save + undo**: Remove `Topbar` save button and dirty indicator. Add `autoSave()` call after each mutation in `useWorkbook`. Track previous workbook state for undo. Show toast with "Deshacer" button.
6. **Pagination**: Add "Todos" to `PAGE_SIZE_OPTIONS`. Render pagination both above and below the table.
7. **Table polish**: Adjust `COLUMN_WIDTH` constants and layout for tighter spacing.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/pages/Movements.tsx` | Modified | Add view toggle, wire grouped view |
| `src/components/MovementsTable.tsx` | Modified | Pagination enhancements, i18n, table polish |
| `src/components/FiltersBar.tsx` | Modified | Active state, necessary null, category search, i18n |
| `src/components/Topbar.tsx` | Modified | Remove manual save, add settings access |
| `src/store/workbook.ts` | Modified | Auto-save, undo state tracking |
| `src/lib/types.ts` | Modified | Possibly none |
| `src/lib/i18n.ts` | New | Translation maps, LanguageProvider |
| `src/themes/*.css` | New | Theme CSS variable files |
| `src/components/ThemeProvider.tsx` | New | Theme context + switcher |
| `src/components/MovementsByCategory.tsx` | New | Category-grouped view |
| `src/App.tsx` | Modified | Wrap providers, dynamic theme |
| `src/App.css` | Modified | Theme variable integration |
| `index.html` | Modified | Remove hardcoded `class="dark"` |
| `src/components/SettingsDialog.tsx` | New | Language + theme settings |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Auto-save + undo requires keeping previous workbook state in memory | Med | Store a snapshot of the relevant rows before mutation; limited to one undo step |
| Theme system breaks existing CSS variable assumptions | Low | Keep current `:root`/`.dark` variables as theme "oscuro"; add new themes as additional classes |
| i18n retrofit touches many hardcoded strings | Med | Start with Movements page and shared components; use simple `t()` function pattern |
| Category-grouped view performance with many categories | Low | Categories are typically < 50; render only expanded groups' rows |

## Rollback Plan

1. Revert the i18n and theme wrappers from `App.tsx`.
2. Restore `Topbar` save button.
3. Revert `MovementsTable`, `FiltersBar`, and `MovementsPage`.
4. Remove new files (`i18n.ts`, `MovementsByCategory.tsx`, theme files, settings).

## Dependencies

- None (no external libraries required).

## Success Criteria

- [ ] Filters show active state and include "Sin asignar" + category search.
- [ ] Language can be switched between Spanish and English; all visible strings update.
- [ ] At least 5 themes can be selected; the app re-themes instantly.
- [ ] Movements can be viewed grouped by category with collapsible groups.
- [ ] Mutations auto-save; notification shows with undo option; undo reverts correctly.
- [ ] Pagination offers "Todos" and appears both above and below the table.
- [ ] Table layout has reduced whitespace and improved visual balance.
- [ ] `cargo test` and `npm test` pass.
- [ ] `npm run build` succeeds.
