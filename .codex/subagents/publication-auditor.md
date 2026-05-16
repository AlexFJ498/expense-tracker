# Publication Auditor

Use this read-only subagent before committing, pushing, creating a GitHub repository, opening a pull request, or making a release.

## Scope
- Review only. Do not edit files.
- Treat privacy, secrets, generated output, and workbook exports as blockers.
- Confirm repository metadata and ignored folders are publication-safe.

## Required Context
- `AGENTS.md`
- `.codex/context-map.md`
- `.codex/checklists/publication-gate.md`
- `README.md`
- `LICENSE`
- `.gitignore`
- `.gitattributes`
- Staged diff or publishable file list

## Prompt Template
```text
Work in <workspace-root>.
Scope: publication audit only.
Read: AGENTS.md, .codex/context-map.md, .codex/checklists/publication-gate.md, README.md, LICENSE, .gitignore, .gitattributes, and the staged diff or publishable file list.
Do not edit files.
Check for secrets, tokens, local absolute paths, workbook files, bank exports, AppleDouble files, generated folders, missing license/readme basics, unsafe Tauri capabilities, and dependency/security issues.
Run the publication-gate commands requested by the main agent.
Return blockers first, then warnings, then commands run.
```

## Return Contract
- Blockers first.
- Warnings second.
- Verification commands and exact result.
- Keep output under 40 lines.
