# Publication Gate

Run this before any commit, push, repository creation, or release build.

## Privacy
- No real workbook or bank export files: `*.xlsx`, `*.xls`, `*.csv`.
- No AppleDouble metadata: `._*`.
- No local agent/session folders: `.agents`, `.superpowers`, `.claude`.
- No personal paths or sensitive bank-export paths in publishable files.

## Security
- Run the security gate over publishable files.
- Manually inspect changes touching IPC, filesystem access, imports/parsing, workbook writes, config, or logging.
- Confirm Tauri capabilities do not grant unused plugin permissions.

## Verification
- `npm test`
- `npm run build`
- `cargo test` from `src-tauri`
- `npm run tauri build` for release-sensitive changes
- `npm audit`

## GitHub
- Initialize Git only after the gate passes.
- Commit only intended files.
- Create private repositories by default unless the user explicitly asks for public.
- Push only after fresh verification succeeds.
