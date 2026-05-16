# Context Map

Use this as the first project capsule after `AGENTS.md`. Keep new discoveries as short bullets.

## Architecture
- `src/main.tsx`: mounts React with `BrowserRouter`.
- `src/App.tsx`: loads workbook state, shows onboarding if there is no active path, otherwise renders the shell and lazy routes.
- `src/components/Sidebar.tsx`: navigation entries.
- `src/components/Topbar.tsx`: workbook save/close actions and status.
- `src/store/workbook.ts`: Zustand store for active workbook, loading/saving/error, dirty state.
- `src/lib/api.ts`: typed frontend wrapper around Tauri `invoke`.
- `src/lib/types.ts`: TypeScript mirror of Rust serializable models.
- `src-tauri/src/lib.rs`: Tauri builder, plugins, command registration.
- `src-tauri/src/commands.rs`: command boundary and dirty-state changes.
- `src-tauri/src/models.rs`: Rust data contracts serialized to the frontend.
- `src-tauri/src/excel/workbook.rs`: Excel source of truth for movements/categories.
- `src-tauri/src/analytics.rs`: derived metrics from movements.

## Feature Folders
- Route pages: `src/pages`.
- Shared app components: `src/components`.
- Low-level UI primitives: `src/components/ui`.
- Frontend tests: colocated `*.test.ts` or `*.test.tsx` under `src`.
- Rust integration tests: `src-tauri/tests`.
- Agent workflow docs: `.codex/agentic-workflow.md`, `.codex/checklists/publication-gate.md`.

## Data Flow
1. React page/component calls `api.*` from `src/lib/api.ts`.
2. `api.*` invokes a command in `src-tauri/src/commands.rs`.
3. Command reads or mutates `Workbook` through `AppState`.
4. Rust returns serializable models from `src-tauri/src/models.rs`.
5. TypeScript models in `src/lib/types.ts` must stay in sync.

## Read Sets
- New route/page: `src/App.tsx`, `src/components/Sidebar.tsx`, relevant `src/pages/*`, `src/lib/api.ts`, `src/lib/types.ts`.
- Movement form/list changes: `src/pages/Movements.tsx`, `src/components/MovementForm.tsx`, `src/components/FiltersBar.tsx`, `src/lib/types.ts`.
- Categories: `src/pages/Categories.tsx`, `src-tauri/src/excel/workbook.rs`, `src-tauri/tests/workbook_integration.rs`.
- Analytics: `src-tauri/src/analytics.rs`, `src/pages/Analytics.tsx`, `src/pages/Dashboard.tsx`, `src/lib/types.ts`.
- Workbook lifecycle: `src/store/workbook.ts`, `src/components/Topbar.tsx`, `src/pages/Onboarding.tsx`, `src-tauri/src/state.rs`, `src-tauri/src/config.rs`.

## Ignore Zones
- `node_modules`
- `dist`
- `src-tauri/target`
- `src-tauri/gen`
- Workbook files and bank exports (`*.xlsx`, `*.xls`, `*.csv`). Tests should generate temporary workbooks instead of committing fixtures.

## Current Test Surface
- `src/lib/utils.test.ts`: formatting helpers and Tailwind class merge.
- `src/pages/load-error.test.tsx`: dashboard/analytics load failures.
- `src-tauri/tests/workbook_integration.rs`: workbook create/movement/category/analytics sanity with temporary synthetic workbooks.

## Publication Gate
- Run the security gate on the publishable tree.
- Confirm no workbook exports or AppleDouble files exist.
- Run `npm test`, `npm run build`, `cargo test` from `src-tauri`, and `npm run tauri build` before release-sensitive publishing.
- Keep generated output in ignored folders: `dist`, `src-tauri/target`, `src-tauri/gen`, `node_modules`.

## Command Notes
- `npm run dev` uses strict port `1420`.
- `npm test` runs `vitest run`.
- `npm run build` runs `tsc && vite build`.
- Run Rust tests from `src-tauri` with `cargo test`.
- There is no lint script in `package.json`.

## Context Discipline
- Start with this map, active spec, then exact files for the slice.
- If a task grows beyond 12 source files, split the plan or dispatch subagents.
- Summaries should name decisions and file paths, not copy long code.
