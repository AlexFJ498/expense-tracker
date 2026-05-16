# Import Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Project rule override: do not commit unless the user explicitly confirms.

**Goal:** Build the first `Import Data` slice so users can import Kutxabank `.xls` movements into the active workbook through a compact review wizard.

**Architecture:** Rust owns provider registration, `.xls` parsing, duplicate detection, and final workbook mutation. React owns the in-memory wizard draft, row editing, bulk completion controls, and final review. The active workbook remains the source of truth; parsing and duplicate checks are read-only, while confirmation appends rows and marks the workbook dirty.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, Radix primitives, lucide-react, Tauri 2, Rust, umya-spreadsheet for workbook writes, calamine for bank export reads.

---

## Read First
- `AGENTS.md`
- `.codex/context-map.md`
- `.codex/specs/2026-05-08-import-data.md`
- `.codex/skills/feature-slice/SKILL.md`
- `.codex/skills/frontend-ui/SKILL.md`
- `.codex/skills/tauri-workbook/SKILL.md`

## File Ownership
- Frontend:
  - Modify `src/App.tsx` for `/import-data`.
  - Modify `src/components/Sidebar.tsx` for the `Import Data` entry.
  - Create `src/pages/ImportData.tsx` for the wizard.
  - Create `src/pages/ImportData.test.tsx` for page behavior.
- Frontend contract:
  - Modify `src/lib/types.ts`.
  - Modify `src/lib/api.ts`.
- Backend contract:
  - Modify `src-tauri/src/models.rs`.
  - Modify `src-tauri/src/commands.rs`.
  - Modify `src-tauri/src/lib.rs`.
- Imports/workbook:
  - Create `src-tauri/src/imports/mod.rs`.
  - Create `src-tauri/src/imports/kutxabank.rs`.
  - Modify `src-tauri/src/excel/workbook.rs`.
  - Modify `src-tauri/Cargo.toml`; `src-tauri/Cargo.lock` will update when Cargo resolves `calamine`.
- Tests:
  - Modify `src-tauri/tests/workbook_integration.rs`.
  - Add unit tests inside `src-tauri/src/imports/mod.rs` and `src-tauri/src/imports/kutxabank.rs`.

## Task 1: Backend Contract And Provider Registry

**Files:**
- Create: `src-tauri/src/imports/mod.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write the failing provider registry test**

Create `src-tauri/src/imports/mod.rs` with this test-first skeleton:

```rust
use crate::error::{AppError, AppResult};
use crate::models::ImportProvider;

pub const KUTXABANK_PROVIDER_ID: &str = "kutxabank";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_kutxabank_provider() {
        let providers = providers();

        assert_eq!(providers.len(), 1);
        assert_eq!(providers[0].id, KUTXABANK_PROVIDER_ID);
        assert_eq!(providers[0].name, "Kutxabank");
        assert_eq!(providers[0].accepted_extensions, vec!["xls".to_string()]);
    }

    #[test]
    fn rejects_unknown_provider() {
        let err = ensure_provider("unknown-bank").expect_err("provider should be rejected");

        assert!(err.to_string().contains("Unsupported import provider"));
    }
}
```

Also add `mod imports;` near the other modules in `src-tauri/src/lib.rs` so the module compiles during tests.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd src-tauri
cargo test imports::tests::lists_kutxabank_provider
```

Expected: FAIL because `ImportProvider`, `providers`, and `ensure_provider` are not implemented yet.

- [ ] **Step 3: Add import models and provider implementation**

Add these structs to `src-tauri/src/models.rs` after `MovementInput`:

```rust
#[derive(Debug, Clone, Serialize)]
pub struct ImportProvider {
    pub id: String,
    pub name: String,
    pub description: String,
    pub accepted_extensions: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ParsedImportRow {
    pub source_row: u32,
    pub date: Option<String>,
    pub concept: String,
    pub kind: Option<MovementKind>,
    pub amount: Option<f64>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportDraftRow {
    pub source_row: u32,
    pub date: String,
    pub concept: String,
    pub kind: MovementKind,
    pub amount: f64,
    pub category: String,
    pub necessary: Option<bool>,
    pub included: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportDuplicate {
    pub source_row: u32,
    pub movement_id: String,
    pub reason: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConfirmImportInput {
    pub provider_id: String,
    pub rows: Vec<ImportDraftRow>,
    pub new_categories: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportResult {
    pub amountd_count: usize,
    pub created_categories: Vec<String>,
    pub skipped_count: usize,
}
```

Replace the top of `src-tauri/src/imports/mod.rs` with the provider implementation while keeping the tests:

```rust
use crate::error::{AppError, AppResult};
use crate::models::ImportProvider;

pub const KUTXABANK_PROVIDER_ID: &str = "kutxabank";

pub fn providers() -> Vec<ImportProvider> {
    vec![ImportProvider {
        id: KUTXABANK_PROVIDER_ID.to_string(),
        name: "Kutxabank".to_string(),
        description: "Movements exportados desde Kutxabank en formato Excel .xls".to_string(),
        accepted_extensions: vec!["xls".to_string()],
    }]
}

pub fn ensure_provider(provider_id: &str) -> AppResult<()> {
    if provider_id == KUTXABANK_PROVIDER_ID {
        Ok(())
    } else {
        Err(AppError::Invalid(format!(
            "Unsupported import provider: {provider_id}"
        )))
    }
}
```

- [ ] **Step 4: Run provider tests**

Run:

```bash
cd src-tauri
cargo test imports::tests
```

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Do not commit unless the user has explicitly authorized commits in this session. Record changed files in the handoff instead.

## Task 2: Kutxabank Parser

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/imports/mod.rs`
- Create: `src-tauri/src/imports/kutxabank.rs`

- [ ] **Step 1: Write failing parser tests using an in-memory range**

Append `mod kutxabank;` to `src-tauri/src/imports/mod.rs`.

Create `src-tauri/src/imports/kutxabank.rs` with tests first:

```rust
use crate::error::{AppError, AppResult};
use crate::excel::dates::{iso_date, parse_loose_date, serial_to_date};
use crate::models::{MovementKind, ParsedImportRow};
use std::path::Path;

#[cfg(test)]
mod tests {
    use super::*;
    use calamine::{Data, Range};

    fn sample_range() -> Range<Data> {
        let mut range = Range::new((0, 0), (3, 4));
        range.set_value((0, 0), Data::String("date".to_string()));
        range.set_value((0, 1), Data::String("concept".to_string()));
        range.set_value((0, 2), Data::String("value date".to_string()));
        range.set_value((0, 3), Data::String("amount".to_string()));
        range.set_value((0, 4), Data::String("balance".to_string()));
        range.set_value((1, 0), Data::String("01/05/2026".to_string()));
        range.set_value((1, 1), Data::String("SUPERMERCADO".to_string()));
        range.set_value((1, 3), Data::Float(-12.34));
        range.set_value((2, 0), Data::String("02/05/2026".to_string()));
        range.set_value((2, 1), Data::String("NOMINA".to_string()));
        range.set_value((2, 3), Data::Float(1200.0));
        range.set_value((3, 0), Data::String("sin date".to_string()));
        range.set_value((3, 1), Data::String("FILA RARA".to_string()));
        range.set_value((3, 3), Data::String("8,50".to_string()));
        range
    }

    #[test]
    fn parses_kutxabank_rows_from_range() {
        let rows = parse_range(&sample_range()).expect("parse range");

        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0].source_row, 2);
        assert_eq!(rows[0].date.as_deref(), Some("2026-05-01"));
        assert_eq!(rows[0].concept, "SUPERMERCADO");
        assert_eq!(rows[0].kind, Some(MovementKind::Expense));
        assert_eq!(rows[0].amount, Some(12.34));
        assert_eq!(rows[1].kind, Some(MovementKind::Ingreso));
        assert_eq!(rows[1].amount, Some(1200.0));
        assert_eq!(rows[2].date, None);
        assert!(rows[2].warnings.iter().any(|w| w.contains("Invalid date")));
    }

    #[test]
    fn fails_when_required_headers_are_missing() {
        let mut range = Range::new((0, 0), (1, 1));
        range.set_value((0, 0), Data::String("date".to_string()));
        range.set_value((0, 1), Data::String("concept".to_string()));

        let err = parse_range(&range).expect_err("missing amount should fail");

        assert!(err.to_string().contains("Faltan columnas obligatorias"));
    }
}
```

- [ ] **Step 2: Run parser tests to verify they fail**

Run:

```bash
cd src-tauri
cargo test imports::kutxabank::tests
```

Expected: FAIL because `calamine` is missing and `parse_range` is not implemented.

- [ ] **Step 3: Add calamine and parser implementation**

Add the dependency to `src-tauri/Cargo.toml`:

```toml
calamine = "0.34"
```

Replace `src-tauri/src/imports/kutxabank.rs` with this implementation and keep the tests at the bottom:

```rust
use crate::error::{AppError, AppResult};
use crate::excel::dates::{iso_date, parse_loose_date, serial_to_date};
use crate::models::{MovementKind, ParsedImportRow};
use calamine::{open_workbook_auto, Data, Range, Reader};
use std::path::Path;

#[derive(Debug, Clone, Copy)]
struct HeaderIndexes {
    date: usize,
    concept: usize,
    amount: usize,
}

pub fn parse_file(path: &Path) -> AppResult<Vec<ParsedImportRow>> {
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if extension != "xls" {
        return Err(AppError::Invalid(
            "Kutxabank only supports .xls files".to_string(),
        ));
    }

    let mut workbook = open_workbook_auto(path)
        .map_err(|e| AppError::Excel(format!("Could not open the Kutxabank file: {e}")))?;
    let sheet_name = workbook
        .sheet_names()
        .first()
        .cloned()
        .ok_or_else(|| AppError::InvalidWorkbook("The file does not contain sheets".to_string()))?;
    let range = workbook
        .worksheet_range(&sheet_name)
        .map_err(|e| AppError::Excel(format!("No se pudo leer la hoja '{sheet_name}': {e}")))?;

    parse_range(&range)
}

pub fn parse_range(range: &Range<Data>) -> AppResult<Vec<ParsedImportRow>> {
    let (header_idx, headers) = find_header_row(range)?;
    let mut out = Vec::new();

    for (relative_idx, row) in range.rows().enumerate().skip(header_idx + 1) {
        if row.iter().all(|cell| cell_to_string(cell).trim().is_empty()) {
            continue;
        }

        let source_row = (relative_idx + 1) as u32;
        let mut warnings = Vec::new();
        let date = cell_to_iso(row.get(headers.date));
        if date.is_none() {
            warnings.push("Invalid or empty date".to_string());
        }

        let concept = row
            .get(headers.concept)
            .map(cell_to_string)
            .unwrap_or_default()
            .trim()
            .to_string();

        let signed_amount = cell_to_amount(row.get(headers.amount));
        if signed_amount.is_none() {
            warnings.push("Invalid or empty amount".to_string());
        }

        let (kind, amount) = match signed_amount {
            Some(value) if value < 0.0 => (Some(MovementKind::Expense), Some(value.abs())),
            Some(value) => (Some(MovementKind::Ingreso), Some(value)),
            None => (None, None),
        };

        out.push(ParsedImportRow {
            source_row,
            date,
            concept,
            kind,
            amount,
            warnings,
        });
    }

    Ok(out)
}

fn find_header_row(range: &Range<Data>) -> AppResult<(usize, HeaderIndexes)> {
    for (idx, row) in range.rows().enumerate() {
        let normalized: Vec<String> = row.iter().map(|cell| normalize_header(&cell_to_string(cell))).collect();
        let date = normalized.iter().position(|h| h == "date");
        let concept = normalized.iter().position(|h| h == "concept");
        let amount = normalized.iter().position(|h| h == "amount");

        if let (Some(date), Some(concept), Some(amount)) = (date, concept, amount) {
            return Ok((idx, HeaderIndexes { date, concept, amount }));
        }
    }

    Err(AppError::InvalidWorkbook(
        "Faltan columnas obligatorias de Kutxabank: date, concept, amount".to_string(),
    ))
}

fn normalize_header(value: &str) -> String {
    value
        .trim()
        .to_ascii_lowercase()
        .replace(' ', "")
        .replace('\u{00E1}', "a")
        .replace('\u{00E9}', "e")
        .replace('\u{00ED}', "i")
        .replace('\u{00F3}', "o")
        .replace('\u{00FA}', "u")
        .replace('ü', "u")
}

fn cell_to_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::String(value) => value.clone(),
        other => other.to_string(),
    }
}

fn cell_to_iso(cell: Option<&Data>) -> Option<String> {
    let cell = cell?;
    match cell {
        Data::Float(value) => serial_to_date(*value).map(iso_date),
        Data::Int(value) => serial_to_date(*value as f64).map(iso_date),
        Data::String(value) => parse_loose_date(value).map(iso_date),
        other => parse_loose_date(&other.to_string()).map(iso_date),
    }
}

fn cell_to_amount(cell: Option<&Data>) -> Option<f64> {
    let cell = cell?;
    match cell {
        Data::Float(value) => Some(*value),
        Data::Int(value) => Some(*value as f64),
        Data::String(value) => parse_amount(value),
        other => parse_amount(&other.to_string()),
    }
}

fn parse_amount(value: &str) -> Option<f64> {
    let cleaned = value
        .trim()
        .replace("€", "")
        .replace('.', "")
        .replace(',', ".");
    cleaned.parse::<f64>().ok()
}
```

At the end of `src-tauri/src/imports/mod.rs`, add a dispatch helper:

```rust
mod kutxabank;

use crate::models::ParsedImportRow;
use std::path::Path;

pub fn parse_import_file(provider_id: &str, path: &Path) -> AppResult<Vec<ParsedImportRow>> {
    ensure_provider(provider_id)?;
    match provider_id {
        KUTXABANK_PROVIDER_ID => kutxabank::parse_file(path),
        _ => unreachable!("ensure_provider rejects unsupported providers"),
    }
}
```

- [ ] **Step 4: Run parser tests**

Run:

```bash
cd src-tauri
cargo test imports::kutxabank::tests
```

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Do not commit unless the user explicitly authorizes it.

## Task 3: Workbook Batch Append And Duplicate Detection

**Files:**
- Modify: `src-tauri/src/excel/workbook.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tests/workbook_integration.rs`

- [ ] **Step 1: Write failing workbook integration tests**

In `src-tauri/src/lib.rs`, extend `__internal` exports:

```rust
pub use crate::models::{ImportDraftRow, ImportDuplicate};
```

Append these tests to `src-tauri/tests/workbook_integration.rs`:

```rust
#[test]
fn import_batch_appends_rows_in_order_and_creates_categories() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("import_batch.xlsx");
    let mut wb = lib::__internal::Workbook::create(&path).unwrap();

    let created_categories = wb
        .ensure_categories(&["BANCO NUEVO".to_string()])
        .expect("create categories");
    assert_eq!(created_categories.len(), 1);
    assert_eq!(created_categories[0].name, "BANCO NUEVO");

    let amountd = wb
        .create_movements_batch(&[
            lib::__internal::MovementInput {
                date: "2026-05-01".into(),
                category: "BANCO NUEVO".into(),
                kind: lib::__internal::MovementKind::Expense,
                amount: 12.34,
                necessary: true,
            },
            lib::__internal::MovementInput {
                date: "2026-05-02".into(),
                category: "BANCO NUEVO".into(),
                kind: lib::__internal::MovementKind::Ingreso,
                amount: 1200.0,
                necessary: false,
            },
        ])
        .expect("batch import");

    assert_eq!(amountd.len(), 2);

    let movements = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    let tail = &movements[movements.len() - 2..];
    assert_eq!(tail[0].date, "2026-05-01");
    assert!(matches!(tail[0].kind, lib::__internal::MovementKind::Expense));
    assert_eq!(tail[1].date, "2026-05-02");
    assert!(matches!(tail[1].kind, lib::__internal::MovementKind::Ingreso));
}

#[test]
fn import_duplicate_detection_matches_completed_rows() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("import_duplicates.xlsx");
    let mut wb = lib::__internal::Workbook::create(&path).unwrap();

    wb.create_movement(&lib::__internal::MovementInput {
        date: "2026-05-01".into(),
        category: "COMIDA".into(),
        kind: lib::__internal::MovementKind::Expense,
        amount: 12.34,
        necessary: true,
    })
    .unwrap();

    let duplicates = wb
        .detect_import_duplicates(&[lib::__internal::ImportDraftRow {
            source_row: 2,
            date: "2026-05-01".into(),
            concept: "SUPERMERCADO".into(),
            kind: lib::__internal::MovementKind::Expense,
            amount: 12.34,
            category: "COMIDA".into(),
            necessary: Some(true),
            included: true,
        }])
        .expect("duplicates");

    assert_eq!(duplicates.len(), 1);
    assert_eq!(duplicates[0].source_row, 2);
    assert!(duplicates[0].reason.contains("date, kind, amount, and category"));
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd src-tauri
cargo test import_batch_appends_rows_in_order_and_creates_categories
cargo test import_duplicate_detection_matches_completed_rows
```

Expected: FAIL because workbook import helper methods do not exist.

- [ ] **Step 3: Add workbook helper methods**

In `src-tauri/src/excel/workbook.rs`, extend the models import:

```rust
use crate::models::{
    Category, ImportDraftRow, ImportDuplicate, Movement, MovementFilter, MovementInput,
    MovementKind,
};
```

Add these methods inside `impl Workbook` after `create_category`:

```rust
pub fn ensure_categories(&mut self, names: &[String]) -> AppResult<Vec<Category>> {
    let existing = self.list_categories()?;
    let mut known: Vec<String> = existing.iter().map(|c| c.name.to_ascii_lowercase()).collect();
    let mut created = Vec::new();

    for raw in names {
        let name = raw.trim();
        if name.is_empty() {
            return Err(AppError::Invalid("Category cannot be empty".into()));
        }
        let key = name.to_ascii_lowercase();
        if known.iter().any(|current| current == &key) {
            continue;
        }
        let category = self.create_category(name)?;
        known.push(key);
        created.push(category);
    }

    Ok(created)
}

pub fn create_movements_batch(&mut self, inputs: &[MovementInput]) -> AppResult<Vec<Movement>> {
    for input in inputs {
        if input.category.trim().is_empty() {
            return Err(AppError::Invalid("Category is required".into()));
        }
        if input.amount <= 0.0 {
            return Err(AppError::Invalid("Amount must be positive".into()));
        }
        parse_loose_date(&input.date).ok_or_else(|| AppError::Invalid("Invalid date".into()))?;
    }

    let mut created = Vec::with_capacity(inputs.len());
    for input in inputs {
        created.push(self.create_movement(input)?);
    }
    Ok(created)
}

pub fn detect_import_duplicates(&self, rows: &[ImportDraftRow]) -> AppResult<Vec<ImportDuplicate>> {
    let movements = self.list_movements(&MovementFilter::default())?;
    let mut duplicates = Vec::new();

    for row in rows.iter().filter(|row| row.included) {
        if row.category.trim().is_empty() || row.date.trim().is_empty() || row.amount <= 0.0 {
            continue;
        }
        let row_amount = amount_cents(row.amount);
        if let Some(existing) = movements.iter().find(|movement| {
            movement.date == row.date
                && movement.kind == row.kind
                && amount_cents(movement.amount) == row_amount
                && movement.category.eq_ignore_ascii_case(&row.category)
        }) {
            duplicates.push(ImportDuplicate {
                source_row: row.source_row,
                movement_id: existing.id.clone(),
                reason: "Coincide en date, kind, amount, and category".to_string(),
            });
        }
    }

    Ok(duplicates)
}
```

Add this helper near `filter_matches`:

```rust
fn amount_cents(amount: f64) -> i64 {
    (amount * 100.0).round() as i64
}
```

- [ ] **Step 4: Run workbook import tests**

Run:

```bash
cd src-tauri
cargo test import_batch_appends_rows_in_order_and_creates_categories
cargo test import_duplicate_detection_matches_completed_rows
```

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Do not commit unless the user explicitly authorizes it.

## Task 4: Tauri Commands And TypeScript API

**Files:**
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Write a failing contract compile check**

Add API wrappers to `src/lib/api.ts` before implementation so TypeScript expects the new types:

```ts
// Import data
listImportProviders: () => invoke<ImportProvider[]>("list_import_providers"),
parseImportFile: (providerId: string, path: string) =>
  invoke<ParsedImportRow[]>("parse_import_file", { providerId, path }),
detectImportDuplicates: (rows: ImportDraftRow[]) =>
  invoke<ImportDuplicate[]>("detect_import_duplicates", { rows }),
confirmImport: (input: ConfirmImportInput) =>
  invoke<ImportResult>("confirm_import", { input }),
```

Run:

```bash
npm run build
```

Expected: FAIL because import types are not defined/amountd.

- [ ] **Step 2: Add TypeScript import types**

Add to `src/lib/types.ts` after `MovementInput`:

```ts
export interface ImportProvider {
  id: string;
  name: string;
  description: string;
  accepted_extensions: string[];
}

export interface ParsedImportRow {
  source_row: number;
  date: string | null;
  concept: string;
  kind: MovementKind | null;
  amount: number | null;
  warnings: string[];
}

export interface ImportDraftRow {
  source_row: number;
  date: string;
  concept: string;
  kind: MovementKind;
  amount: number;
  category: string;
  necessary: boolean | null;
  included: boolean;
}

export interface ImportDuplicate {
  source_row: number;
  movement_id: string;
  reason: string;
}

export interface ConfirmImportInput {
  provider_id: string;
  rows: ImportDraftRow[];
  new_categories: string[];
}

export interface ImportResult {
  amountd_count: number;
  created_categories: string[];
  skipped_count: number;
}
```

Update the type import list in `src/lib/api.ts`:

```ts
import type {
  Analytics,
  Category,
  ConfirmImportInput,
  ImportDraftRow,
  ImportDuplicate,
  ImportProvider,
  ImportResult,
  Movement,
  MovementFilter,
  MovementInput,
  ParsedImportRow,
  WorkbookState,
} from "./types";
```

- [ ] **Step 3: Implement Tauri commands**

In `src-tauri/src/commands.rs`, extend imports:

```rust
use crate::excel::dates::parse_loose_date;
use crate::imports;
use crate::models::{
    Analytics, Category, ConfirmImportInput, ImportDraftRow, ImportDuplicate, ImportProvider,
    ImportResult, Movement, MovementFilter, MovementInput, WorkbookState,
};
```

Add commands after workbook lifecycle commands:

```rust
#[tauri::command]
pub fn list_import_providers() -> AppResult<Vec<ImportProvider>> {
    Ok(imports::providers())
}

#[tauri::command]
pub fn parse_import_file(
    provider_id: String,
    path: String,
) -> AppResult<Vec<crate::models::ParsedImportRow>> {
    imports::parse_import_file(&provider_id, &PathBuf::from(path))
}

#[tauri::command]
pub fn detect_import_duplicates(
    rows: Vec<ImportDraftRow>,
    state: State<AppState>,
) -> AppResult<Vec<ImportDuplicate>> {
    let inner = state.lock_inner()?;
    let wb = inner.workbook.as_ref().ok_or(AppError::NoActiveWorkbook)?;
    wb.detect_import_duplicates(&rows)
}

#[tauri::command]
pub fn confirm_import(
    input: ConfirmImportInput,
    state: State<AppState>,
) -> AppResult<ImportResult> {
    imports::ensure_provider(&input.provider_id)?;

    let mut inner = state.lock_inner()?;
    let wb = inner.workbook.as_mut().ok_or(AppError::NoActiveWorkbook)?;

    let total_count = input.rows.len();
    let included: Vec<_> = input.rows.into_iter().filter(|row| row.included).collect();
    let skipped_count = total_count.saturating_sub(included.len());
    let mut category_names = input.new_categories;
    let movement_inputs = included
        .iter()
        .map(|row| {
            let necessary = row.necessary.ok_or_else(|| {
                AppError::Invalid(format!(
                    "Row {} does not have its necessary flag set",
                    row.source_row
                ))
            })?;
            Ok(MovementInput {
                date: row.date.clone(),
                category: row.category.clone(),
                kind: row.kind,
                amount: row.amount,
                necessary,
            })
        })
        .collect::<AppResult<Vec<_>>>()?;

    for movement in &movement_inputs {
        if movement.amount <= 0.0 {
            return Err(AppError::Invalid("Amount must be positive".into()));
        }
        parse_loose_date(&movement.date)
            .ok_or_else(|| AppError::Invalid("Invalid date".into()))?;
    }

    for row in &included {
        if row.category.trim().is_empty() {
            return Err(AppError::Invalid(format!(
                "Row {} has no category",
                row.source_row
            )));
        }
        if !category_names
            .iter()
            .any(|name| name.eq_ignore_ascii_case(&row.category))
        {
            category_names.push(row.category.clone());
        }
    }

    let created_categories = wb
        .ensure_categories(&category_names)?
        .into_iter()
        .map(|category| category.name)
        .collect::<Vec<_>>();

    let amountd = wb.create_movements_batch(&movement_inputs)?;
    inner.dirty = true;

    Ok(ImportResult {
        amountd_count: amountd.len(),
        created_categories,
        skipped_count,
    })
}
```

- [ ] **Step 4: Register commands**

In `src-tauri/src/lib.rs`, add to `invoke_handler`:

```rust
commands::list_import_providers,
commands::parse_import_file,
commands::detect_import_duplicates,
commands::confirm_import,
```

- [ ] **Step 5: Run backend and frontend compile checks**

Run:

```bash
cd src-tauri
cargo test imports::tests
cargo test imports::kutxabank::tests
cargo test import_batch_appends_rows_in_order_and_creates_categories
cargo test import_duplicate_detection_matches_completed_rows
```

Expected: PASS.

Run:

```bash
npm run build
```

Expected: PASS or only fail on unrelated pre-existing issues. If it fails on the new API/types, fix before moving on.

- [ ] **Step 6: Checkpoint**

Do not commit unless the user explicitly authorizes it.

## Task 5: Frontend Wizard Tests

**Files:**
- Create: `src/pages/ImportData.test.tsx`
- Create: `src/pages/ImportData.tsx`

- [ ] **Step 1: Write failing wizard tests**

Create `src/pages/ImportData.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { ImportDataPage } from "./ImportData";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  api: {
    listImportProviders: vi.fn(),
    listCategories: vi.fn(),
    parseImportFile: vi.fn(),
    detectImportDuplicates: vi.fn(),
    confirmImport: vi.fn(),
  },
}));

vi.mock("../store/workbook", () => ({
  useWorkbook: (selector: (state: { setDirty: (dirty: boolean) => void }) => unknown) =>
    selector({ setDirty: vi.fn() }),
}));

const listImportProviders = vi.mocked(api.listImportProviders);
const listCategories = vi.mocked(api.listCategories);
const parseImportFile = vi.mocked(api.parseImportFile);
const detectImportDuplicates = vi.mocked(api.detectImportDuplicates);
const confirmImport = vi.mocked(api.confirmImport);

describe("ImportDataPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listImportProviders.mockResolvedValue([
      {
        id: "kutxabank",
        name: "Kutxabank",
        description: "Movements exportados desde Kutxabank en formato Excel .xls",
        accepted_extensions: ["xls"],
      },
    ]);
    listCategories.mockResolvedValue([{ name: "COMIDA" }, { name: "SALARIO" }]);
    parseImportFile.mockResolvedValue([
      {
        source_row: 2,
        date: "2026-05-01",
        concept: "SUPERMERCADO",
        kind: "expense",
        amount: 12.34,
        warnings: [],
      },
    ]);
    detectImportDuplicates.mockResolvedValue([]);
    confirmImport.mockResolvedValue({
      amountd_count: 1,
      created_categories: [],
      skipped_count: 0,
    });
  });

  it("loads providers and shows the first wizard step", async () => {
    render(<ImportDataPage />);

    expect(await screen.findByText("Kutxabank")).toBeTruthy();
    expect(screen.getByText("Select a bank")).toBeTruthy();
  });

  it("requires category and necessary before review", async () => {
    render(<ImportDataPage />);

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: /use bank/i }));

    await screen.findByText("Select the file");
    fireEvent.click(screen.getByRole("button", { name: /use test file/i }));

    await screen.findByText("SUPERMERCADO");
    fireEvent.click(screen.getByRole("button", { name: /revisar/i }));

    expect(screen.getByText("Complete category and necessary status for included rows.")).toBeTruthy();
    expect(detectImportDuplicates).not.toHaveBeenCalled();
  });

  it("supports bulk necessary selection and confirms only included rows", async () => {
    render(<ImportDataPage />);

    fireEvent.click(await screen.findByText("Kutxabank"));
    fireEvent.click(screen.getByRole("button", { name: /use bank/i }));
    fireEvent.click(await screen.findByRole("button", { name: /use test file/i }));

    const row = await screen.findByRole("row", { name: /SUPERMERCADO/i });
    fireEvent.change(within(row).getByLabelText("Category"), { target: { value: "COMIDA" } });
    fireEvent.click(within(row).getByLabelText("Select row 2"));
    fireEvent.click(screen.getByRole("button", { name: /mark selection as necessary/i }));
    fireEvent.click(screen.getByRole("button", { name: /revisar/i }));

    expect(await screen.findByText("Review import")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /confirm import/i }));

    expect(confirmImport).toHaveBeenCalledWith({
      provider_id: "kutxabank",
      rows: [
        expect.objectContaining({
          source_row: 2,
          category: "COMIDA",
          necessary: true,
          included: true,
        }),
      ],
      new_categories: [],
    });
  });
});
```

The test uses a temporary `Use test file` button that should only render under `import.meta.env.DEV` or when `import.meta.env.MODE === "test"`. This keeps file-dialog behavior testable without requiring a real local path.

- [ ] **Step 2: Run frontend tests to verify they fail**

Run:

```bash
npm test -- src/pages/ImportData.test.tsx
```

Expected: FAIL because `ImportDataPage` does not exist.

- [ ] **Step 3: Create a minimal page shell**

Create `src/pages/ImportData.tsx` with enough structure to make the first test pass:

```tsx
import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Check, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useToast } from "../components/ui/use-toast";
import { api } from "../lib/api";
import type {
  Category,
  ImportDraftRow,
  ImportDuplicate,
  ImportProvider,
  ParsedImportRow,
} from "../lib/types";
import { formatEuro } from "../lib/utils";
import { useWorkbook } from "../store/workbook";

type Step = "bank" | "file" | "complete" | "review";

export function ImportDataPage() {
  const [step, setStep] = useState<Step>("bank");
  const [providers, setProviders] = useState<ImportProvider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [provider, setProvider] = useState<ImportProvider | null>(null);
  const [rows, setRows] = useState<ImportDraftRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [duplicates, setDuplicates] = useState<ImportDuplicate[]>([]);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setDirty = useWorkbook((s) => s.setDirty);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([api.listImportProviders(), api.listCategories()])
      .then(([nextProviders, nextCategories]) => {
        setProviders(nextProviders);
        setCategories(nextCategories);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const selectedCount = selectedRows.size;
  const includedRows = rows.filter((row) => row.included);
  const totals = useMemo(
    () =>
      includedRows.reduce(
        (acc, row) => {
          if (row.kind === "income") acc.income += row.amount;
          else acc.expense += row.amount;
          return acc;
        },
        { income: 0, expense: 0 },
      ),
    [includedRows],
  );

  const chooseProvider = () => {
    if (!provider) return;
    setStep("file");
  };

  const parseRows = async (path: string) => {
    if (!provider) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = await api.parseImportFile(provider.id, path);
      setRows(parsed.map(toDraftRow));
      setSelectedRows(new Set(parsed.map((row) => row.source_row)));
      setStep("complete");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async () => {
    if (!provider) return;
    const path = await open({
      multiple: false,
      filters: [{ name: provider.name, extensions: provider.accepted_extensions }],
    });
    if (path) await parseRows(path as string);
  };

  const updateRow = (sourceRow: number, patch: Partial<ImportDraftRow>) => {
    setRows((current) =>
      current.map((row) => (row.source_row === sourceRow ? { ...row, ...patch } : row)),
    );
  };

  const markSelectedNecessary = (necessary: boolean) => {
    setRows((current) =>
      current.map((row) =>
        selectedRows.has(row.source_row) ? { ...row, necessary } : row,
      ),
    );
  };

  const review = async () => {
    const invalid = rows.some(
      (row) =>
        row.included &&
        (!row.date || !row.category || row.amount <= 0 || row.necessary === null),
    );
    if (invalid) {
      setError("Complete category and necessary status for included rows.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const nextDuplicates = await api.detectImportDuplicates(rows);
      setDuplicates(nextDuplicates);
      setStep("review");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!provider) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.confirmImport({
        provider_id: provider.id,
        rows,
        new_categories: newCategories,
      });
      setDirty(true);
      toast({
        title: "Import completed",
        description: `${result.amountd_count} movements amountd.`,
        variant: "success",
      });
      setStep("bank");
      setRows([]);
      setProvider(null);
      setSelectedRows(new Set());
      setDuplicates([]);
      setNewCategories([]);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import Data</h1>
        <p className="text-sm text-muted-foreground">
          Import bank movements and review fields before writing to Excel.
        </p>
      </div>

      {error && <div className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">{error}</div>}

      {step === "bank" && (
        <Card>
          <CardHeader>
            <CardTitle>Select a bank</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {providers.map((it) => (
              <button
                key={it.id}
                className={`rounded-md border p-4 text-left transition-colors ${provider?.id === it.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"}`}
                onClick={() => setProvider(it)}
              >
                <div className="font-medium">{it.name}</div>
                <div className="text-sm text-muted-foreground">{it.description}</div>
              </button>
            ))}
            <Button onClick={chooseProvider} disabled={!provider}>
              <Check />
              Use bank
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "file" && (
        <Card>
          <CardHeader>
            <CardTitle>Select the file</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={chooseFile} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload />}
              Select file
            </Button>
            {import.meta.env.MODE === "test" && (
              <Button variant="secondary" onClick={() => parseRows("/tmp/kutxabank-test.xls")}>
                <FileSpreadsheet />
                Use test file
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <CompletionTable
          rows={rows}
          categories={categories}
          selectedRows={selectedRows}
          selectedCount={selectedCount}
          onToggleSelected={(sourceRow) =>
            setSelectedRows((current) => {
              const next = new Set(current);
              if (next.has(sourceRow)) next.delete(sourceRow);
              else next.add(sourceRow);
              return next;
            })
          }
          onSelectAll={() => setSelectedRows(new Set(rows.map((row) => row.source_row)))}
          onMarkNecessary={markSelectedNecessary}
          onUpdateRow={updateRow}
          onReview={review}
          onAddCategory={(name) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            if (!categories.some((category) => category.name.toLowerCase() === trimmed.toLowerCase())) {
              setCategories((current) => [...current, { name: trimmed }]);
            }
            if (!newCategories.some((category) => category.toLowerCase() === trimmed.toLowerCase())) {
              setNewCategories((current) => [...current, trimmed]);
            }
          }}
        />
      )}

      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Review import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <Summary label="Incluidos" value={String(includedRows.length)} />
              <Summary label="Duplicados" value={String(duplicates.length)} />
              <Summary label="Income" value={formatEuro(totals.income)} />
              <Summary label="Expenses" value={formatEuro(totals.expense)} />
            </div>
            <Button onClick={confirm} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />}
              Confirm import
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

This shell intentionally references `CompletionTable`, `Summary`, and `toDraftRow`, which are implemented in the next step.

- [ ] **Step 4: Implement table helpers and fix the category case check**

Append the helper components/functions to `src/pages/ImportData.tsx`.

```tsx
function toDraftRow(row: ParsedImportRow): ImportDraftRow {
  return {
    source_row: row.source_row,
    date: row.date ?? "",
    concept: row.concept,
    kind: row.kind ?? "expense",
    amount: row.amount ?? 0,
    category: "",
    necessary: null,
    included: true,
  };
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold num">{value}</div>
    </div>
  );
}

interface CompletionTableProps {
  rows: ImportDraftRow[];
  categories: Category[];
  selectedRows: Set<number>;
  selectedCount: number;
  onToggleSelected: (sourceRow: number) => void;
  onSelectAll: () => void;
  onMarkNecessary: (necessary: boolean) => void;
  onUpdateRow: (sourceRow: number, patch: Partial<ImportDraftRow>) => void;
  onReview: () => void;
  onAddCategory: (name: string) => void;
}

function CompletionTable({
  rows,
  categories,
  selectedRows,
  selectedCount,
  onToggleSelected,
  onSelectAll,
  onMarkNecessary,
  onUpdateRow,
  onReview,
  onAddCategory,
}: CompletionTableProps) {
  const [categoryDraft, setCategoryDraft] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete movements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onSelectAll}>Selectr todas</Button>
          <Button variant="secondary" onClick={() => onMarkNecessary(true)} disabled={selectedCount === 0}>
            Mark selection as necessary
          </Button>
          <Button variant="secondary" onClick={() => onMarkNecessary(false)} disabled={selectedCount === 0}>
            Mark selection as not necessary
          </Button>
          <div className="flex gap-2">
            <Input
              aria-label="Nueva category"
              placeholder="Nueva category"
              value={categoryDraft}
              onChange={(event) => setCategoryDraft(event.currentTarget.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                onAddCategory(categoryDraft);
                setCategoryDraft("");
              }}
            >
              Add category
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Sel.</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Concepto</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Necesario</th>
                <th className="px-3 py-2 text-left">Incluir</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.source_row}>
                  <td className="px-3 py-2">
                    <Checkbox
                      aria-label={`Select row ${row.source_row}`}
                      checked={selectedRows.has(row.source_row)}
                      onCheckedChange={() => onToggleSelected(row.source_row)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label="Date"
                      type="date"
                      value={row.date}
                      onChange={(event) => onUpdateRow(row.source_row, { date: event.currentTarget.value })}
                    />
                  </td>
                  <td className="px-3 py-2 min-w-56">
                    <Input
                      aria-label="Concepto"
                      value={row.concept}
                      onChange={(event) => onUpdateRow(row.source_row, { concept: event.currentTarget.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select value={row.kind} onValueChange={(value) => onUpdateRow(row.source_row, { kind: value as ImportDraftRow["kind"] })}>
                      <SelectTrigger aria-label="Tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Ingreso</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label="Amount"
                      inputMode="decimal"
                      value={String(row.amount).replace(".", ",")}
                      onChange={(event) => {
                        const amount = parseFloat(event.currentTarget.value.replace(",", "."));
                        onUpdateRow(row.source_row, { amount: Number.isNaN(amount) ? 0 : amount });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label="Category"
                      className="h-9 rounded-md border bg-background px-2"
                      value={row.category}
                      onChange={(event) => onUpdateRow(row.source_row, { category: event.currentTarget.value })}
                    >
                      <option value="">Select</option>
                      {categories.map((category) => (
                        <option key={category.name} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label="Necesario"
                      className="h-9 rounded-md border bg-background px-2"
                      value={row.necessary === null ? "" : row.necessary ? "true" : "false"}
                      onChange={(event) => onUpdateRow(row.source_row, { necessary: event.currentTarget.value === "true" })}
                    >
                      <option value="">Select</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox
                      aria-label={`Include row ${row.source_row}`}
                      checked={row.included}
                      onCheckedChange={(checked) => onUpdateRow(row.source_row, { included: checked === true })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <Button onClick={onReview}>Review</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Run wizard tests**

Run:

```bash
npm test -- src/pages/ImportData.test.tsx
```

Expected: PASS. If accessible names differ because Radix renders select triggers differently, update the test to query visible text or labels that actually render.

- [ ] **Step 6: Checkpoint**

Do not commit unless the user explicitly authorizes it.

## Task 6: Route, Navigation, Polish, And Full Verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/pages/ImportData.tsx`

- [ ] **Step 1: Add route and sidebar entry**

In `src/App.tsx`, add the lazy page:

```tsx
const ImportDataPage = lazy(() =>
  import("./pages/ImportData").then(({ ImportDataPage }) => ({ default: ImportDataPage })),
);
```

Add the route:

```tsx
<Route path="/import-data" element={<ImportDataPage />} />
```

In `src/components/Sidebar.tsx`, import a lucide icon:

```tsx
Upload
```

Add the nav item:

```tsx
{ to: "/import-data", label: "Import Data", icon: Upload },
```

- [ ] **Step 2: Polish ImportData page behavior**

Review `src/pages/ImportData.tsx` and make these concrete fixes:

```tsx
// Disable review when there are no included rows.
<Button onClick={onReview} disabled={!rows.some((row) => row.included)}>
  Review
</Button>
```

```tsx
// Exclude selected rows action.
<Button
  variant="secondary"
  onClick={() =>
    rows.forEach((row) => {
      if (selectedRows.has(row.source_row)) onUpdateRow(row.source_row, { included: false });
    })
  }
  disabled={selectedCount === 0}
>
  Exclude selection
</Button>
```

```tsx
// Include selected rows action.
<Button
  variant="secondary"
  onClick={() =>
    rows.forEach((row) => {
      if (selectedRows.has(row.source_row)) onUpdateRow(row.source_row, { included: true });
    })
  }
  disabled={selectedCount === 0}
>
  Include selection
</Button>
```

Show duplicate warnings in the review step:

```tsx
{duplicates.length > 0 && (
  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
    Hay {duplicates.length} posibles duplicados. Puedes volver y excluirlos antes de confirmar.
  </div>
)}
```

- [ ] **Step 3: Run all frontend tests and build**

Run:

```bash
npm test
```

Expected: PASS.

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run all Rust tests**

Run:

```bash
cd src-tauri
cargo test
```

Expected: PASS.

- [ ] **Step 5: Manual local check with the sensitive Kutxabank export**

Only use the file in place from `<local-sensitive-bank-export-outside-repo>`. Do not copy it into the repo.

Run the app:

```bash
npm run dev
```

Open the Tauri app only if needed:

```bash
npm run tauri dev
```

Manual checks:
- `Import Data` appears in the sidebar.
- Kutxabank provider appears.
- Selecting `<local-sensitive-bank-export-outside-repo>` parses rows.
- Date, concept, type, positive amount, category, necessary, and include controls render.
- Bulk necessary and select-all controls work.
- Review shows totals and possible duplicates.
- Confirm appends rows to the active workbook and marks it dirty.
- The sensitive file is not present under project folders.

- [ ] **Step 6: Final verification scan**

Run:

```bash
find . -name 'movements.xls' -o -name '*kutxabank*.xls'
```

Expected: no sensitive real export copied into the repo. A synthetic generated test artifact under a temp directory is acceptable only if it is not committed.

Inspect the touched route and page files:
- `src/App.tsx` uses `/import-data`.
- `src/components/Sidebar.tsx` points to `/import-data`.
- `src/pages/ImportData.tsx` uses lowercase string comparison for category names.

## Self-Review
- Spec coverage:
  - `/import-data` route and English sidebar label are covered in Task 6.
  - Backend provider registry, parser, duplicate detection, and confirmation are covered in Tasks 1-4.
  - Kutxabank mapping and `.xls` parsing are covered in Task 2.
  - Batch append, category creation, order preservation, and duplicate heuristic are covered in Task 3.
  - Wizard UI, editable rows, bulk actions, required completion, review, and confirmation are covered in Tasks 5-6.
  - Verification and sensitive file handling are covered in Task 6.
- Placeholder scan:
  - No placeholder markers or intentionally vague implementation steps remain.
- Type consistency:
  - Rust and TypeScript model names match the approved spec.
  - Tauri commands use camelCase JS args where Rust parameters are snake_case.
  - `necessary` is nullable in drafts and converted to a required bool only at confirmation.

## Handoff Summary
- Changed files:
  - `.codex/specs/2026-05-08-import-data.md`
  - `.codex/specs/2026-05-08-import-data-plan.md`
  - Implementation files listed above when the plan is executed.
- Behavior to ship:
  - Kutxabank `.xls` import wizard with in-memory review and final append to workbook.
- Tests to add/update:
  - Rust parser/provider/workbook tests.
  - Frontend wizard tests.
- Known risks:
  - Exact real Kutxabank exports can vary; validate manually with the local sensitive file without copying it.
  - Adding `calamine` requires Cargo dependency resolution.
  - `confirm_import` must validate before mutating so user-visible failures do not leave partial imports.
