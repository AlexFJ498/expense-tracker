use chrono::{Datelike, NaiveDate};

const EXCEL_EPOCH_YEAR: i32 = 1899;
const EXCEL_EPOCH_MONTH: u32 = 12;
const EXCEL_EPOCH_DAY: u32 = 30;

pub fn excel_epoch() -> NaiveDate {
    NaiveDate::from_ymd_opt(EXCEL_EPOCH_YEAR, EXCEL_EPOCH_MONTH, EXCEL_EPOCH_DAY).unwrap()
}

pub fn date_to_serial(d: NaiveDate) -> f64 {
    (d - excel_epoch()).num_days() as f64
}

pub fn serial_to_date(serial: f64) -> Option<NaiveDate> {
    let days = serial.floor() as i64;
    excel_epoch().checked_add_signed(chrono::Duration::days(days))
}

/// Parse a "dirty" date string from a user-edited xlsx.
/// Tries common European and ISO formats.
pub fn parse_loose_date(s: &str) -> Option<NaiveDate> {
    let t = s.trim();
    if t.is_empty() {
        return None;
    }
    // Try common formats
    for fmt in &["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%m/%d/%Y"] {
        if let Ok(d) = NaiveDate::parse_from_str(t, fmt) {
            return Some(d);
        }
    }
    // Handle 2-digit years
    for fmt in &["%d/%m/%y", "%m/%d/%y"] {
        if let Ok(d) = NaiveDate::parse_from_str(t, fmt) {
            return Some(d);
        }
    }
    // Maybe it's a serial number in string form
    if let Ok(n) = t.parse::<f64>() {
        return serial_to_date(n);
    }
    None
}

pub fn iso_date(d: NaiveDate) -> String {
    format!("{:04}-{:02}-{:02}", d.year(), d.month(), d.day())
}
