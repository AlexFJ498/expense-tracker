# Expense Tracker

Desktop app for managing movements, categories, bank imports, and personal analytics with an Excel workbook as the source of truth.

## Stack

- React 19, Vite, TypeScript, and Tailwind.
- Tauri 2 with a Rust backend.
- Excel workbook persistence.
- Frontend tests with Vitest and Testing Library.
- Rust tests in `src-tauri/tests`.

## Requirements

- Node.js 22 or compatible.
- npm 10 or compatible.
- Stable Rust with Cargo.

## Development

```bash
npm ci
npm run dev
```

To run the desktop app:

```bash
npm run tauri dev
```

## Verification

```bash
npm test
npm run build
cd src-tauri
cargo test
```

## Data Privacy

The repository must not contain real workbooks, bank exports, or fixtures with personal data. `*.xlsx`, `*.xls`, and `*.csv` files are deliberately ignored; tests that need Excel generate temporary workbooks.
