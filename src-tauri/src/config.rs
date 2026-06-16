use crate::error::AppResult;
use crate::models::{ImportRule, WorkbookState};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub active_path: Option<String>,
    #[serde(default)]
    pub last_saved: Option<String>,
    #[serde(default)]
    pub recents: Vec<String>,
    #[serde(default)]
    pub import_rules: Vec<ImportRule>,
}

impl AppConfig {
    pub fn config_path() -> AppResult<PathBuf> {
        let dirs = ProjectDirs::from("com", "alejandrofuerte", "controldegastos")
            .ok_or_else(|| std::io::Error::other("no project dir"))?;
        let cfg = dirs.config_dir().to_path_buf();
        fs::create_dir_all(&cfg)?;
        Ok(cfg.join("config.json"))
    }

    pub fn load() -> AppResult<Self> {
        let p = Self::config_path()?;
        if !p.exists() {
            return Ok(Self::default());
        }
        let s = fs::read_to_string(&p)?;
        let cfg: AppConfig = serde_json::from_str(&s).unwrap_or_default();
        Ok(cfg)
    }

    pub fn save(&self) -> AppResult<()> {
        let p = Self::config_path()?;
        let s = serde_json::to_string_pretty(self).unwrap_or_default();
        fs::write(&p, s)?;
        Ok(())
    }

    pub fn push_recent(&mut self, path: &str) {
        self.recents.retain(|x| x != path);
        self.recents.insert(0, path.to_string());
        self.recents.truncate(10);
    }

    pub fn to_workbook_state(&self, dirty: bool) -> WorkbookState {
        WorkbookState {
            path: self.active_path.clone(),
            dirty,
            last_saved: self.last_saved.clone(),
            recents: self.recents.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_deserializes_without_import_rules_backward_compat() {
        // RED: AppConfig must deserialize an old config JSON that has no import_rules field,
        // defaulting to an empty Vec.
        let json = r#"{"active_path":"/tmp/test.xlsx","last_saved":null,"recents":[]}"#;
        let cfg: AppConfig = serde_json::from_str(json).expect("should deserialize old config");
        assert!(cfg.import_rules.is_empty(), "import_rules should default to empty vec for backward compat");
    }

    #[test]
    fn config_deserializes_with_import_rules_roundtrip() {
        // Triangulation: verify that a config WITH import_rules roundtrips correctly.
        let json = r#"{"active_path":"/tmp/test.xlsx","last_saved":null,"recents":[],"import_rules":[{"id":"abc","name":"Groceries","description":"Food rule","field":"concept","operator":"contains","values":["mercadona"],"combinator":"or","category":"Food","necessary":true}]}"#;
        let cfg: AppConfig = serde_json::from_str(json).expect("should deserialize config with rules");
        assert_eq!(cfg.import_rules.len(), 1);
        assert_eq!(cfg.import_rules[0].name, "Groceries");
        assert_eq!(cfg.import_rules[0].operator.to_string(), "Contains");

        // Roundtrip: serialize back and deserialize again
        let serialized = serde_json::to_string(&cfg).expect("should serialize");
        let cfg2: AppConfig = serde_json::from_str(&serialized).expect("should roundtrip");
        assert_eq!(cfg2.import_rules.len(), 1);
        assert_eq!(cfg2.import_rules[0].id, "abc");
    }

    #[test]
    fn config_deserializes_old_single_value_into_values_array() {
        // Old format with "value": "string" → should become values: ["string"]
        let json = r#"{"active_path":"/tmp/test.xlsx","last_saved":null,"recents":[],"import_rules":[{"id":"old","name":"Rent","field":"concept","operator":"contains","value":"alquiler","category":"Housing","necessary":true}]}"#;
        let cfg: AppConfig = serde_json::from_str(json).expect("should deserialize old format");
        assert_eq!(cfg.import_rules.len(), 1);
        assert_eq!(cfg.import_rules[0].values, vec!["alquiler"]);
        assert!(matches!(cfg.import_rules[0].combinator, crate::models::RuleCombinator::Or));
    }
}
