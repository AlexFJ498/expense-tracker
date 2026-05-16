use crate::error::{AppError, AppResult};
use crate::models::{ImportProvider, ParsedImportRow};
use std::path::Path;

mod kutxabank;

pub const KUTXABANK_PROVIDER_ID: &str = "kutxabank";

pub fn providers() -> Vec<ImportProvider> {
    vec![ImportProvider {
        id: KUTXABANK_PROVIDER_ID.to_string(),
        name: "Kutxabank".to_string(),
        description: "Movimientos exportados desde Kutxabank en formato Excel .xls".to_string(),
        accepted_extensions: vec!["xls".to_string()],
    }]
}

pub fn ensure_provider(provider_id: &str) -> AppResult<()> {
    if provider_id == KUTXABANK_PROVIDER_ID {
        Ok(())
    } else {
        Err(AppError::Invalid(format!(
            "Proveedor de importación no soportado: {provider_id}"
        )))
    }
}

pub fn parse_import_file(provider_id: &str, path: &Path) -> AppResult<Vec<ParsedImportRow>> {
    ensure_provider(provider_id)?;
    match provider_id {
        KUTXABANK_PROVIDER_ID => kutxabank::parse_file(path),
        _ => unreachable!("ensure_provider rejects unsupported providers"),
    }
}

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

        assert!(err
            .to_string()
            .contains("Proveedor de importación no soportado"));
    }
}
