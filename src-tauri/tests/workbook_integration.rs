use control_de_gastos_lib as lib;

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
            necessary: true,
            description: String::new(),
        },
        lib::__internal::MovementInput {
            date: "2026-04-21".into(),
            category: "COMIDA".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 42.75,
            necessary: true,
            description: "SUPERMERCADO".into(),
        },
        lib::__internal::MovementInput {
            date: "2026-04-22".into(),
            category: "ENTRETENIMIENTO".into(),
            kind: lib::__internal::MovementKind::Gasto,
            amount: 18.5,
            necessary: false,
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
            necessary: false,
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
                necessary: true,
                description: "COMPRA ACTUALIZADA".into(),
            },
        )
        .expect("update");
    assert_eq!(updated.amount, 20.00);
    assert!(updated.necessary);
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
        necessary: vec![true, false],
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
                necessary: true,
                description: "SUPERMERCADO".into(),
            },
            lib::__internal::MovementInput {
                date: "2026-05-02".into(),
                category: "BANCO NUEVO".into(),
                kind: lib::__internal::MovementKind::Ingreso,
                amount: 1200.0,
                necessary: false,
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
            necessary: false,
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
        necessary: true,
        description: "SUPERMERCADO".into(),
    })
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
        necessary: false,
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
