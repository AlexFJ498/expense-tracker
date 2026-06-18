# Expense Tracker

Desktop app to track income and expenses, categorize movements, import bank statements, and explore personal finance analytics — all backed by an Excel workbook you own.

## Features

- **Movements** — list, filter (by year, month, category, kind, necessity), paginate, and bulk delete.
- **Categories** — create and manage custom categories.
- **Bank imports** — parse Kutxabank XLS exports with duplicate detection.
- **Import rules** — auto-categorize imported rows by matching descriptions.
- **Analytics** — summary cards, monthly income/expense charts, category breakdown, year-over-year comparison, necessity split.
- **Themes** — dark, light, ocean, forest, sunset, and high-contrast.
- **i18n** — Spanish UI.
- **Excel-native** — the `.xlsx` workbook is the source of truth. Open it in Excel anytime.

## Download

Get the latest installer from [Releases](https://github.com/AlexFJ498/expense-tracker/releases).

| Platform | File |
|----------|------|
| Windows  | `.exe` (NSIS installer) or `.msi` |
| Linux    | `.AppImage` or `.deb` |
| macOS    | `.dmg` (Apple Silicon) |

## Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind, Radix UI, Recharts, Zustand.
- **Backend**: Tauri 2 (Rust), calamine + umya-spreadsheet for Excel I/O.
- **Tests**: Vitest + Testing Library (frontend), `cargo test` (Rust).

## Development

### Requirements

- Node.js 22+
- npm 10+
- Stable Rust with Cargo

### Setup

```bash
npm ci
```

### Web-only (Vite dev server)

```bash
npm run dev
```

### Desktop (Tauri)

```bash
npm run tauri dev
```

### Verify

```bash
npm test
npm run build
cd src-tauri && cargo test
```

## License

MIT — see [LICENSE](./LICENSE).

## Privacy

This repository contains no real financial data. `*.xlsx`, `*.xls`, and `*.csv` are git-ignored. Tests generate temporary workbooks.
