# AGENTS.md

## Mission
Build features for Expense Tracker with a small, reliable context footprint. Prefer a vertical slice: typed contract, Rust/Tauri behavior, React UI, focused tests, then verification.

## Agentic Operating Loop
- Start every task by reading `AGENTS.md`, `.codex/context-map.md`, and the relevant `.codex/skills/*/SKILL.md`.
- For changed behavior, create or update one active spec before implementation; keep decisions as short bullets.
- Work in the smallest vertical slice that proves user value. Avoid broad refactors unless the slice needs them.
- Use subagents only for independent scopes with disjoint write sets. Keep shared contract files owned by one agent.
- Before final claims, run the verification matrix that matches the touched surface and report exact commands.
- Before any publication or commit, run `.codex/checklists/publication-gate.md`.

## Hard Rules
- Do not access external repositories from this project unless the user approves it first.
- Do not commit without explicit user confirmation.
- If this copy is inside a git repo, do not modify `develop` directly and never touch `master`.
- Do not revert unrelated files. If reverting is needed, list exact files and ask first.
- Do not edit config files unless the task explicitly requires it.
- Keep generated/build folders and private data out of context: `node_modules`, `dist`, `src-tauri/target`, `src-tauri/gen`, workbook exports.

## Context Budget
- Always read this file plus `.codex/context-map.md`.
- For a feature, create or update one active spec from `.codex/specs/feature-spec-template.md`.
- Read at most 8-12 source files before pausing to summarize what matters.
- For large files, read only the relevant section first: `src-tauri/src/excel/workbook.rs`, `src/pages/Analytics.tsx`, `src/pages/Movements.tsx`, `src/components/MovementForm.tsx`.
- Prefer targeted searches:
  - `rg "term" src src-tauri/src src-tauri/tests`
  - `find src src-tauri/src src-tauri/tests -type f`
- Never paste large source files into plans. Reference paths and small snippets only.

## Project Shape
- Frontend: React 19, Vite, TypeScript, Tailwind, Radix UI, lucide icons.
- Desktop/backend: Tauri 2 with Rust.
- State: workbook lifecycle lives in `src/store/workbook.ts`; most page data stays local to pages.
- Tauri bridge: `src/lib/api.ts` mirrors `src-tauri/src/commands.rs` and `src-tauri/src/models.rs`.
- Domain terms: `Workbook`, `Movement`, `Category`, `MovementFilter`, `Analytics`, and the current serialized movement kind literals.
- Excel workbook is the source of truth. Do not commit real workbooks or bank exports; Rust tests should generate temporary workbooks.

## Feature Workflow
1. Read `.codex/context-map.md` and the active spec.
2. If the behavior is new or changed, write a failing test first.
3. Keep changes by slice:
   - Contract/types: `src/lib/types.ts`, `src/lib/api.ts`, `src-tauri/src/models.rs`.
   - Backend command: `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`.
   - Workbook/Excel: `src-tauri/src/excel/*`.
   - Analytics: `src-tauri/src/analytics.rs`, `src/pages/Analytics.tsx`.
   - UI: `src/pages/*`, `src/components/*`, `src/components/ui/*`.
4. Use subagents only for independent scopes with disjoint write sets. See `.codex/subagents/README.md`.
5. Update the active spec/plan with decisions as short bullets.

## Project Skills
Read the relevant local skill before acting:
- `.codex/skills/feature-slice/SKILL.md` for new features or behavior changes.
- `.codex/skills/frontend-ui/SKILL.md` for React/Tailwind page or component work.
- `.codex/skills/tauri-workbook/SKILL.md` for Rust, Tauri commands, Excel, workbook, or analytics work.

## Commands
- Install: `npm ci`
- Web dev: `npm run dev` (Vite strict port `1420`)
- Tauri dev: `npm run tauri dev`
- Frontend tests: `npm test`
- Frontend build/typecheck: `npm run build`
- Rust tests: run `cargo test` from `src-tauri`
- Tauri build: `npm run tauri build`

## Verification Matrix
- TS utilities/components/pages: `npm test`, then `npm run build`.
- Rust workbook/analytics/commands: `cargo test` from `src-tauri`; add `npm run build` if contracts changed.
- End-to-end Tauri behavior: `npm run tauri dev` for manual check; `npm run tauri build` before release-sensitive changes.
- If a verification command cannot run, report the exact reason.

## UI Standards
- Follow existing compact app UI. This is an operational finance app, not a landing page.
- Use existing Radix primitives and `lucide-react` icons.
- Prefer reusable components in `src/components`; keep route pages focused on loading/orchestration.
- Keep product copy in English and consistent with the app.
- Avoid decorative churn, nested cards, and broad palette rewrites unless the feature asks for it.

## Review Checklist
- Does the change preserve the TypeScript/Rust API contract?
- Are workbook dirty/save semantics correct?
- Are Excel files only created in temp paths and kept out of the repository?
- Are errors shown instead of leaving pages in loading states?
- Did tests cover the behavior before implementation when behavior changed?
