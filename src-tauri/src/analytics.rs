use crate::models::{
    Analytics, CategoryBreakdownItem, MonthlySeriesPoint, Movement, MovementFilter, MovementKind,
    NecessarySplit, Summary, YearComparisonPoint,
};
use chrono::{Datelike, NaiveDate};
use std::collections::{BTreeMap, HashMap};

const MESES: [&str; 12] = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
];

pub fn compute(movs: &[Movement], filter: &MovementFilter) -> Analytics {
    let filtered: Vec<&Movement> = movs.iter().filter(|m| matches_filter(m, filter)).collect();

    let summary = compute_summary(&filtered);
    let monthly = compute_monthly(&filtered);
    let categories = compute_categories(&filtered);
    let year_comparison = compute_year_comparison(&filtered);
    let necessary_split = compute_necessary_split(&filtered);

    let mut years_set: Vec<i32> = movs
        .iter()
        .filter_map(|m| NaiveDate::parse_from_str(&m.date, "%Y-%m-%d").ok())
        .map(|d| d.year())
        .collect();
    years_set.sort_unstable();
    years_set.dedup();

    Analytics {
        summary,
        monthly,
        categories,
        year_comparison,
        necessary_split,
        years: years_set,
    }
}

fn matches_filter(m: &Movement, f: &MovementFilter) -> bool {
    let Ok(d) = NaiveDate::parse_from_str(&m.date, "%Y-%m-%d") else {
        return false;
    };
    if !f.years.is_empty() && !f.years.contains(&d.year()) {
        return false;
    }
    if !f.months.is_empty() && !f.months.contains(&d.month()) {
        return false;
    }
    if !f.categories.is_empty()
        && !f
            .categories
            .iter()
            .any(|category| m.category.eq_ignore_ascii_case(category))
    {
        return false;
    }
    if !f.kinds.is_empty() && !f.kinds.contains(&m.kind) {
        return false;
    }
    if !f.necessary.is_empty() && !f.necessary.iter().any(|n| n == &m.necessary) {
        return false;
    }
    true
}

fn compute_summary(movs: &[&Movement]) -> Summary {
    let mut income_total = 0.0;
    let mut expense_total = 0.0;
    let mut necessary_total = 0.0;
    let mut max_expense = 0.0;
    let mut max_expense_cat: Option<String> = None;
    let mut dates: Vec<NaiveDate> = Vec::new();

    for m in movs {
        if let Ok(d) = NaiveDate::parse_from_str(&m.date, "%Y-%m-%d") {
            dates.push(d);
        }
        match m.kind {
            MovementKind::Ingreso => income_total += m.amount,
            MovementKind::Gasto => {
                expense_total += m.amount;
                if m.necessary.unwrap_or(false) {
                    necessary_total += m.amount;
                }
                if m.amount > max_expense {
                    max_expense = m.amount;
                    max_expense_cat = Some(m.category.clone());
                }
            }
        }
    }

    let balance = income_total - expense_total;
    dates.sort();
    let day_span = match (dates.first(), dates.last()) {
        (Some(a), Some(b)) => ((*b - *a).num_days().max(0) + 1) as f64,
        _ => 1.0,
    };
    let avg_daily_expense = if dates.is_empty() {
        0.0
    } else {
        expense_total / day_span
    };
    let necessary_ratio = if expense_total > 0.0 {
        necessary_total / expense_total
    } else {
        0.0
    };

    Summary {
        income_total,
        expense_total,
        balance,
        count: movs.len(),
        avg_daily_expense,
        max_expense,
        max_expense_category: max_expense_cat,
        necessary_ratio,
    }
}

fn compute_monthly(movs: &[&Movement]) -> Vec<MonthlySeriesPoint> {
    let mut map: BTreeMap<(i32, u32), (f64, f64)> = BTreeMap::new();
    for m in movs {
        let Ok(d) = NaiveDate::parse_from_str(&m.date, "%Y-%m-%d") else {
            continue;
        };
        let entry = map.entry((d.year(), d.month())).or_insert((0.0, 0.0));
        match m.kind {
            MovementKind::Ingreso => entry.0 += m.amount,
            MovementKind::Gasto => entry.1 += m.amount,
        }
    }
    map.into_iter()
        .map(|((y, mo), (inc, exp))| MonthlySeriesPoint {
            year: y,
            month: mo,
            label: format!("{} {}", MESES[(mo - 1) as usize], y),
            income: inc,
            expense: exp,
            balance: inc - exp,
        })
        .collect()
}

fn compute_categories(movs: &[&Movement]) -> Vec<CategoryBreakdownItem> {
    let mut map: HashMap<String, (f64, f64, usize)> = HashMap::new();
    for m in movs {
        let entry = map.entry(m.category.clone()).or_insert((0.0, 0.0, 0));
        match m.kind {
            MovementKind::Ingreso => entry.0 += m.amount,
            MovementKind::Gasto => entry.1 += m.amount,
        }
        entry.2 += 1;
    }
    let mut out: Vec<_> = map
        .into_iter()
        .map(|(cat, (inc, exp, count))| CategoryBreakdownItem {
            category: cat,
            income: inc,
            expense: exp,
            count,
        })
        .collect();
    out.sort_by(|a, b| {
        b.expense
            .partial_cmp(&a.expense)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    out
}

fn compute_year_comparison(movs: &[&Movement]) -> Vec<YearComparisonPoint> {
    let mut map: BTreeMap<u32, BTreeMap<String, f64>> = BTreeMap::new();
    for m in movs {
        let Ok(d) = NaiveDate::parse_from_str(&m.date, "%Y-%m-%d") else {
            continue;
        };
        if matches!(m.kind, MovementKind::Gasto) {
            let year_key = d.year().to_string();
            let entry = map.entry(d.month()).or_default();
            *entry.entry(year_key).or_insert(0.0) += m.amount;
        }
    }
    (1u32..=12)
        .map(|mo| YearComparisonPoint {
            month: mo,
            label: MESES[(mo - 1) as usize].to_string(),
            values: map.get(&mo).cloned().unwrap_or_default(),
        })
        .collect()
}

fn compute_necessary_split(movs: &[&Movement]) -> NecessarySplit {
    let mut necessary = 0.0;
    let mut discretionary = 0.0;
    for m in movs {
        if matches!(m.kind, MovementKind::Gasto) {
            if m.necessary.unwrap_or(false) {
                necessary += m.amount;
            } else {
                discretionary += m.amount;
            }
        }
    }
    NecessarySplit {
        necessary,
        discretionary,
    }
}
