use expense_tracker_lib as lib;

fn synthetic_workbook_with_movements() -> (tempfile::TempDir, lib::__internal::Workbook) {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("synthetic.xlsx");
    let mut wb = lib::__internal::Workbook::create(&path).expect("create synthetic workbook");

    wb.create_movements_batch(&[
        lib::__internal::MovementInput {
            date: "2026-04-20".into(),
            category: "SALARIO".into(),
            kind: lib::__internal::MovementKind::Ingreso,
            amount: 2400.0,
            necessary: Some(true),
            description: String::new(),
        },
        lib::__internal::MovementInput {
            date: "2026-04-21".into(),
            category: "COMIDA".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 42.75,
            necessary: Some(true),
            description: "SUPERMERCADO".into(),
        },
        lib::__internal::MovementInput {
            date: "2026-04-22".into(),
            category: "ENTRETENIMIENTO".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 18.5,
            necessary: Some(false),
            description: String::new(),
        },
    ])
    .expect("seed synthetic movements");

    (dir, wb)
}

#[test]
fn created_workbook_reads_seeded_movements() {
    let (_dir, wb) = synthetic_workbook_with_movements();
    let movs = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .expect("list");
    assert_eq!(movs.len(), 3);
    assert!(movs
        .iter()
        .any(|m| matches!(m.kind, lib::__internal::MovementKind::Ingreso)));
    assert!(movs
        .iter()
        .any(|m| matches!(m.kind, lib::__internal::MovementKind::Gasto)));
    let cats = wb.list_categories().expect("categories");
    assert!(!cats.is_empty());
}

#[test]
fn create_and_save_new_workbook_roundtrip() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("new.xlsx");
    let wb = lib::__internal::Workbook::create(&path).expect("create");
    let cats = wb.list_categories().expect("cats");
    assert!(cats.len() >= 10);
    wb.save_atomic().expect("save");
    assert!(path.exists());
}

#[test]
fn add_update_delete_movement_on_synthetic_workbook() {
    let (_dir, mut wb) = synthetic_workbook_with_movements();
    let before = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap()
        .len();
    let created = wb
        .create_movement(&lib::__internal::MovementInput {
            date: "2026-04-22".into(),
            category: "COMIDA".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 12.34,
            necessary: Some(false),
            description: "COMPRA INICIAL".into(),
        })
        .expect("create");
    let after = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap()
        .len();
    assert_eq!(after, before + 1);

    let updated = wb
        .update_movement(
            &created.id,
            &lib::__internal::MovementInput {
                date: "2026-04-23".into(),
                category: "COMIDA".into(),
                kind: lib::__internal::MovementKind::Gasto,
                amount: 20.00,
                necessary: Some(true),
                description: "COMPRA ACTUALIZADA".into(),
            },
        )
        .expect("update");
    assert_eq!(updated.amount, 20.00);
    assert_eq!(updated.necessary, Some(true));
    assert_eq!(updated.description, "COMPRA ACTUALIZADA");

    wb.delete_movement(&created.id).expect("delete");
    let final_count = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap()
        .len();
    assert_eq!(final_count, before);

    wb.save_atomic().expect("save");
}

#[test]
fn listing_and_analytics_totals_stay_consistent() {
    let (_dir, wb) = synthetic_workbook_with_movements();
    let movs = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    assert_eq!(movs.len(), 3);
    let a = lib::__internal::compute(&movs, &lib::__internal::MovementFilter::default());
    let sum_income: f64 = movs
        .iter()
        .filter(|m| matches!(m.kind, lib::__internal::MovementKind::Ingreso))
        .map(|m| m.amount)
        .sum();
    let sum_expense: f64 = movs
        .iter()
        .filter(|m| matches!(m.kind, lib::__internal::MovementKind::Gasto))
        .map(|m| m.amount)
        .sum();
    assert!(
        (a.summary.income_total - sum_income).abs() < 0.01,
        "analytics income drifts from listing sum"
    );
    assert!(
        (a.summary.expense_total - sum_expense).abs() < 0.01,
        "analytics expense drifts from listing sum"
    );
    assert_eq!(a.summary.count, movs.len());
    assert!(a.summary.expense_total > 0.0);
    assert!(a.summary.income_total > 0.0);
}

#[test]
fn movement_filter_matches_multiple_values_per_field() {
    let (_dir, wb) = synthetic_workbook_with_movements();
    let filter = lib::__internal::MovementFilter {
        categories: vec!["COMIDA".into(), "ENTRETENIMIENTO".into()],
        kinds: vec![lib::__internal::MovementKind::Gasto],
        ..Default::default()
    };

    let movs = wb.list_movements(&filter).expect("filtered movements");

    assert_eq!(movs.len(), 2);
    assert!(movs.iter().all(|m| matches!(
        m.kind,
        lib::__internal::MovementKind::Gasto
    )));
    assert!(movs.iter().any(|m| m.category == "COMIDA"));
    assert!(movs.iter().any(|m| m.category == "ENTRETENIMIENTO"));
}

#[test]
fn analytics_filter_matches_multiple_values_per_field() {
    let (_dir, wb) = synthetic_workbook_with_movements();
    let movs = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    let filter = lib::__internal::MovementFilter {
        months: vec![4],
        categories: vec!["COMIDA".into(), "ENTRETENIMIENTO".into()],
        necessary: vec![Some(true), Some(false)],
        ..Default::default()
    };

    let analytics = lib::__internal::compute(&movs, &filter);

    assert_eq!(analytics.summary.count, 2);
    assert!((analytics.summary.expense_total - 61.25).abs() < 0.01);
    assert_eq!(analytics.summary.income_total, 0.0);
}

#[test]
fn category_crud() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("cat_test.xlsx");
    let mut wb = lib::__internal::Workbook::create(&path).unwrap();
    let initial = wb.list_categories().unwrap().len();

    wb.create_category("CAFÉ").expect("add");
    assert_eq!(wb.list_categories().unwrap().len(), initial + 1);

    // duplicate guard
    let dup = wb.create_category("CAFÉ");
    assert!(dup.is_err());

    wb.delete_category("CAFÉ").expect("delete");
    assert_eq!(wb.list_categories().unwrap().len(), initial);
}

#[test]
fn ensure_categories_rejects_empty_without_partial_mutation() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("ensure_categories_no_partial.xlsx");
    let mut wb = lib::__internal::Workbook::create(&path).unwrap();
    let initial_categories = wb.list_categories().unwrap();
    let initial_count = initial_categories.len();

    let result = wb.ensure_categories(&["NUEVA".into(), " ".into()]);

    assert!(result.is_err());
    let categories = wb.list_categories().unwrap();
    assert_eq!(categories.len(), initial_count);
    assert!(!categories
        .iter()
        .any(|category| category.name.eq_ignore_ascii_case("NUEVA")));
}

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

    let imported = wb
        .create_movements_batch(&[
            lib::__internal::MovementInput {
                date: "2026-05-01".into(),
                category: "BANCO NUEVO".into(),
                kind: lib::__internal::MovementKind::Gasto,
                amount: 12.34,
                necessary: Some(true),
                description: "SUPERMERCADO".into(),
            },
            lib::__internal::MovementInput {
                date: "2026-05-02".into(),
                category: "BANCO NUEVO".into(),
                kind: lib::__internal::MovementKind::Ingreso,
                amount: 1200.0,
                necessary: Some(false),
                description: "NOMINA".into(),
            },
        ])
        .expect("batch import");

    assert_eq!(imported.len(), 2);

    let movements = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    let tail = &movements[movements.len() - 2..];
    assert_eq!(tail[0].date, "2026-05-01");
    assert_eq!(tail[0].description, "SUPERMERCADO");
    assert!(matches!(tail[0].kind, lib::__internal::MovementKind::Gasto));
    assert_eq!(tail[1].date, "2026-05-02");
    assert_eq!(tail[1].description, "NOMINA");
    assert!(matches!(
        tail[1].kind,
        lib::__internal::MovementKind::Ingreso
    ));
}

#[test]
fn import_batch_allows_empty_category() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("import_empty_category.xlsx");
    let mut wb = lib::__internal::Workbook::create(&path).unwrap();

    let imported = wb
        .create_movements_batch(&[lib::__internal::MovementInput {
            date: "2026-05-01".into(),
            category: "".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 12.34,
            necessary: Some(false),
            description: String::new(),
        }])
        .expect("batch import without category");

    assert_eq!(imported.len(), 1);
    assert_eq!(imported[0].category, "");
}

#[test]
fn import_duplicate_detection_matches_completed_rows() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("import_duplicates.xlsx");
    let mut wb = lib::__internal::Workbook::create(&path).unwrap();

    wb.create_movement(&lib::__internal::MovementInput {
        date: "2026-05-01".into(),
        category: "COMIDA".into(),
        kind: lib::__internal::MovementKind::Gasto,
        amount: 12.34,
        necessary: Some(true),
        description: "SUPERMERCADO".into(),    })
    .unwrap();

    let duplicates = wb
        .detect_import_duplicates(&[lib::__internal::ImportDraftRow {
            source_row: 2,
            date: "2026-05-01".into(),
            description: "SUPERMERCADO".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 12.34,
            category: "COMIDA".into(),
            necessary: Some(true),
            included: true,
        }])
        .expect("duplicates");

    assert_eq!(duplicates.len(), 1);
    assert_eq!(duplicates[0].source_row, 2);
    assert!(duplicates[0]
        .reason
        .contains("fecha, tipo, importe y categoría"));
}

#[test]
fn import_duplicate_detection_ignores_rows_without_category() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("import_duplicates_empty_category.xlsx");
    let mut wb = lib::__internal::Workbook::create(&path).unwrap();

    wb.create_movements_batch(&[lib::__internal::MovementInput {
        date: "2026-05-01".into(),
        category: "".into(),
        kind: lib::__internal::MovementKind::Gasto,
        amount: 12.34,
        necessary: Some(false),
        description: "SUPERMERCADO".into(),
    }])
    .unwrap();

    let duplicates = wb
        .detect_import_duplicates(&[lib::__internal::ImportDraftRow {
            source_row: 2,
            date: "2026-05-01".into(),
            description: "SUPERMERCADO".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 12.34,
            category: "".into(),
            necessary: Some(false),
            included: true,
        }])
        .expect("duplicates");

    assert!(duplicates.is_empty());
}

#[test]
fn delete_movement_keeps_descriptions_aligned_with_their_rows() {
    // This test proves that when a movement is deleted, the descriptions
    // of the remaining rows stay aligned with their dates and amounts.
    // Before the fix, COL_DESCRIPCION (column 9) was not shifted during
    // delete, causing descriptions to desync from their row data.
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("delete_alignment.xlsx");
    let mut wb = lib::__internal::Workbook::create(&path).unwrap();

    // Seed 4 movements, each with a distinct description
    let inputs = [
        lib::__internal::MovementInput {
            date: "2026-05-01".into(),
            category: "COMIDA".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 12.34,
            necessary: Some(true),
            description: "SUPERMERCADO DIA 1".into(),
        },
        lib::__internal::MovementInput {
            date: "2026-05-02".into(),
            category: "TRANSPORTE".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 5.50,
            necessary: Some(true),
            description: "BUS DIA 2".into(),
        },
        lib::__internal::MovementInput {
            date: "2026-05-03".into(),
            category: "COMIDA".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 25.00,
            necessary: Some(false),
            description: "RESTAURANTE DIA 3".into(),
        },
        lib::__internal::MovementInput {
            date: "2026-05-04".into(),
            category: "ENTRETENIMIENTO".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 18.50,
            necessary: Some(false),
            description: "CINE DIA 4".into(),
        },
    ];
    let created = wb.create_movements_batch(&inputs).unwrap();
    assert_eq!(created.len(), 4);

    // Delete the SECOND movement (BUS DIA 2, row 11 in the sheet)
    let second_id = &created[1].id;
    wb.delete_movement(second_id).unwrap();

    // Read remaining movements and verify descriptions are aligned
    let remaining = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    assert_eq!(remaining.len(), 3, "should have 3 movements after delete");

    // After delete, the original rows 10,12,13 (0-indexed: 0,2,3)
    // become positions 1,2,3. Each must keep its own description.
    let by_date_desc: Vec<(&str, &str, f64)> = remaining
        .iter()
        .map(|m| (m.date.as_str(), m.description.as_str(), m.amount))
        .collect();

    // Row that stayed at top (row 10, first data row is 10)
    assert!(
        by_date_desc.contains(&("2026-05-01", "SUPERMERCADO DIA 1", 12.34)),
        "SUPERMERCADO DIA 1 should survive with its date and amount intact"
    );

    // Row that shifted up: originally 12 → now at position 11 (second visible row)
    assert!(
        by_date_desc.contains(&("2026-05-03", "RESTAURANTE DIA 3", 25.00)),
        "RESTAURANTE DIA 3 should keep its original description after shift"
    );

    // Last row: originally row 13 → now at position 12
    assert!(
        by_date_desc.contains(&("2026-05-04", "CINE DIA 4", 18.50)),
        "CINE DIA 4 should keep its original description after shift"
    );

    // Crucially: the deleted description must NOT leak into any remaining row
    let has_bus_description = remaining
        .iter()
        .any(|m| m.description.contains("BUS DIA 2"));
    assert!(
        !has_bus_description,
        "Deleted description 'BUS DIA 2' must not appear in any remaining movement"
    );

    // Verify list order is consistent (sorted by row, oldest first after synthetic create)
    // Assertions below assume the default list order (by row).
    // Row 10 (SUPERMERCADO) should now describe itself, not BUS.
    let first = &remaining[0];
    assert_eq!(
        first.description, "SUPERMERCADO DIA 1",
        "first remaining row should still describe SUPERMERCADO"
    );

    wb.save_atomic().unwrap();
}

// ── Batch delete tests ──

#[test]
fn delete_movements_removes_multiple_and_rebuilds_index() {
    let (_dir, mut wb) = synthetic_workbook_with_movements();
    let movs = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    assert_eq!(movs.len(), 3);

    // Delete first and third movements, keep middle
    let ids_to_delete: Vec<String> = vec![movs[0].id.clone(), movs[2].id.clone()];
    let count = wb.delete_movements(&ids_to_delete).expect("batch delete");

    assert_eq!(count, 2, "should delete 2 movements");
    let remaining = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    assert_eq!(remaining.len(), 1, "should have 1 movement left");
    assert_eq!(remaining[0].category, "COMIDA");
}

#[test]
fn delete_movements_with_partial_invalid_ids() {
    let (_dir, mut wb) = synthetic_workbook_with_movements();
    let movs = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();

    // Delete one valid and one invalid ID
    let ids = vec![movs[0].id.clone(), "nonexistent-id".to_string()];
    let count = wb.delete_movements(&ids).expect("batch delete partial");

    assert_eq!(count, 1, "should only delete the valid ID");
    let remaining = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    assert_eq!(remaining.len(), 2);
}

#[test]
fn delete_movements_all_invalid_ids() {
    let (_dir, mut wb) = synthetic_workbook_with_movements();

    let ids = vec!["nonexistent-1".to_string(), "nonexistent-2".to_string()];
    let count = wb.delete_movements(&ids).expect("batch delete all invalid");

    assert_eq!(count, 0, "should delete 0 movements");
    let remaining = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    assert_eq!(remaining.len(), 3, "all 3 original movements stay");
}

#[test]
fn delete_movements_empty_list() {
    let (_dir, mut wb) = synthetic_workbook_with_movements();

    let count = wb.delete_movements(&[]).expect("batch delete empty");

    assert_eq!(count, 0);
    let remaining = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    assert_eq!(remaining.len(), 3, "nothing deleted");
}

#[test]
fn delete_movements_all_movements() {
    let (_dir, mut wb) = synthetic_workbook_with_movements();
    let movs = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();

    let ids: Vec<String> = movs.iter().map(|m| m.id.clone()).collect();
    let count = wb.delete_movements(&ids).expect("batch delete all");

    assert_eq!(count, 3, "should delete all 3");
    let remaining = wb
        .list_movements(&lib::__internal::MovementFilter::default())
        .unwrap();
    assert_eq!(remaining.len(), 0, "should have 0 movements left");
}
