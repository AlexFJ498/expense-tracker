# Design: Improve Movements Listing

## Technical Approach

Client-side sort + pagination keeps the backend lean. New capabilities are purely frontend: i18n context, CSS-variable theming, a category-grouped view component, auto-save with undo tracking, and filter UX polish. No backend changes beyond the existing batch-delete command.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| i18n approach | i18next vs custom context | **Custom React context** | Zero dependencies; ~80 translatable strings; simple `t()` lookup |
| Theme system | CSS-in-JS vs CSS variables | **CSS variables + class on `<html>`** | Already using this pattern; add 5+ theme classes; zero runtime cost |
| Undo mechanism | Full history stack vs single-step | **Single-step snapshot** | Keep memory low; save workbook state vector before mutation; one undo |
| Auto-save trigger | After every mutation vs debounced | **After every mutation** | Immediate persistence; undo covers mistakes; simple mental model |
| Category view | Reuse MovementsTable vs dedicated component | **Dedicated `MovementsByCategory`** | Different column set (no category), collapsible groups; cleaner separation |
| Settings location | New page vs dialog | **Dialog triggered from Topbar** | Lightweight; no route needed; follows existing Dialog pattern |
| View toggle | Segmented control vs tabs | **Tabs (Radix)** | Already have `Tabs` component; clear visual distinction |

## Data Flow

### i18n
```
App mount
 → LanguageProvider reads localStorage("app-lang") → defaults to "es"
 → t(key) looks up translations[lang][key]
 → All components use t() for user-facing strings
 → SettingsDialog dispatches setLang() → persists + re-renders
```

### Theme
```
App mount
 → ThemeProvider reads localStorage("app-theme") → defaults to "oscuro"
 → Sets document.documentElement.className = theme
 → CSS :root / .theme-{name} variables apply
 → SettingsDialog dispatches setTheme() → persists + updates <html> class
```

### Undo
```
Mutation (create/update/delete/batch-delete)
 → Before mutation: snapshot = get_workbook_state_vector()
 → Execute mutation
 → autoSave() → api.saveWorkbook()
 → Toast: "Cambios guardados" + "Deshacer" button
 → Undo clicked → confirm dialog → restore snapshot → save
```

### Category-grouped view
```
MovementsPage
 → View toggle (Tabs): "Lista" | "Por categoría"
 → "Lista" → existing MovementsTable
 → "Por categoría" → MovementsByCategory
   → groupBy(movements, "category")
   → For each group: collapsible section (closed default)
   → Inside: compact table (date, description, kind, amount, necessary)
   → Sort within group by column click
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/i18n.ts` | **New** | Translation maps + LanguageProvider context |
| `src/themes/oscuro.css` | **New** | Extract existing dark theme |
| `src/themes/claro.css` | **New** | Light theme |
| `src/themes/oceano.css` | **New** | Blue-tinted theme |
| `src/themes/bosque.css` | **New** | Green-tinted theme |
| `src/themes/atardecer.css` | **New** | Warm/orange-tinted theme |
| `src/themes/contraste.css` | **New** | High-contrast theme |
| `src/components/ThemeProvider.tsx` | **New** | Theme context + persistence |
| `src/components/MovementsByCategory.tsx` | **New** | Category-grouped collapsible view |
| `src/components/SettingsDialog.tsx` | **New** | Language + theme picker dialog |
| `src/components/FiltersBar.tsx` | **Modify** | Active state, necessary null, category search, i18n |
| `src/components/MovementsTable.tsx` | **Modify** | i18n, top pagination, "Todos" option, table polish |
| `src/components/Topbar.tsx` | **Modify** | Remove save, add settings gear icon |
| `src/pages/Movements.tsx` | **Modify** | View toggle, wire grouped view, i18n |
| `src/store/workbook.ts` | **Modify** | Auto-save on mutation, undo snapshot |
| `src/App.tsx` | **Modify** | Wrap LanguageProvider + ThemeProvider |
| `src/App.css` | **Modify** | Remove hardcoded themes, import theme files |
| `index.html` | **Modify** | Remove `class="dark"` |

## Interfaces / Contracts

### i18n — Translation map shape
```typescript
// src/lib/i18n.ts
type Lang = "es" | "en";

interface Translations {
  "filter.year": string;
  "filter.month": string;
  "filter.category": string;
  "filter.kind": string;
  "filter.necessary": string;
  "filter.all": string;
  "filter.none": string;
  "filter.unassigned": string;
  "filter.clear": string;
  "filter.search": string;
  "table.date": string;
  "table.category": string;
  "table.description": string;
  "table.kind": string;
  "table.amount": string;
  "table.necessary": string;
  "table.rowsPerPage": string;
  "table.page": string;
  "table.of": string;
  "table.all": string;
  "table.selected": string;
  "table.delete": string;
  "table.loading": string;
  "table.empty": string;
  "kind.income": string;
  "kind.expense": string;
  "necessary.yes": string;
  "necessary.no": string;
  "necessary.unassigned": string;
  "dialog.deleteTitle": string;
  "dialog.deleteDescription": string;
  "dialog.cancel": string;
  "dialog.confirm": string;
  "dialog.undoTitle": string;
  "dialog.undoDescription": string;
  "toast.saved": string;
  "toast.savedDesc": string;
  "toast.undo": string;
  "view.list": string;
  "view.byCategory": string;
  "settings.language": string;
  "settings.theme": string;
  "summary.income": string;
  "summary.expense": string;
  "summary.balance": string;
  "summary.filtered": string;
}

const translations: Record<Lang, Translations> = { ... };
```

### Theme — CSS variable contract
```css
.theme-oscuro {
  --background: 224 10% 10%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  /* ... all existing shadcn tokens ... */
}
```

### Undo — Workbook state snapshot
```typescript
interface UndoSnapshot {
  // Serialized row data before the last mutation
  rows: Array<{ row: number; cells: Record<string, string> }>;
  // Or simply: save the workbook path and rely on disk revert
  // Simpler approach: call the backend to save a temp copy before mutation
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (TS) | i18n `t()` returns correct string per lang | Vitest: render with provider, assert strings |
| Unit (TS) | Theme switch updates `<html>` class | Vitest: render ThemeProvider, call setTheme |
| Unit (TS) | Category grouping produces correct groups | Vitest: test groupBy logic |
| Unit (TS) | Filters show active state, necessary null, search | Vitest: render FiltersBar, interact |
| Unit (TS) | Pagination "Todos" shows all rows, top pagination renders | Vitest: render MovementsTable with pageSize="all" |
| Integration | Auto-save called after mutation | Vitest + mock store |
| E2E | Full flow: filter → switch view → delete → undo | Manual |

## Migration / Rollout

No data migration. Theme and language preferences are stored in `localStorage`. The `<html>` class goes from static `"dark"` to dynamic theme class. Existing CSS variables are preserved in the "oscuro" theme.
