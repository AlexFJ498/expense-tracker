---
name: frontend-ui
description: Use when changing React pages, shared components, filters, forms, charts, or app shell UI in Expense Tracker
---

# Expense Frontend UI

## Read First
- `AGENTS.md`
- `.codex/context-map.md`
- Active feature spec
- Target page/component
- `src/lib/types.ts` and `src/lib/api.ts` when data shape or commands are involved

## Patterns
- Pages in `src/pages` load data and orchestrate workflows.
- Shared reusable UI belongs in `src/components`.
- Primitive Radix/Tailwind wrappers live in `src/components/ui`; avoid changing them for one feature.
- Use `lucide-react` icons already used by the app.
- Keep product copy in English, direct, and consistent.

## State
- Use `useWorkbook` only for workbook lifecycle, dirty/save status, and active path.
- Keep page-specific lists, filters, and dialogs local unless multiple routes need them.

## UI Quality
- This is a compact finance tool. Favor dense, scannable controls over marketing-style layouts.
- Provide loading, empty, and error states for async data.
- Do not create nested cards or broad visual rewrites unless requested.
- Keep numeric amounts formatted through `src/lib/utils.ts`.

## Tests
- Utilities: colocated `*.test.ts`.
- Components/pages: Testing Library with `// @vitest-environment jsdom`.
- Mock `src/lib/api.ts` for page load tests.
- Run `npm test`; run `npm run build` when types/routes changed.
