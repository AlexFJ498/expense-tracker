use crate::error::AppResult;
use crate::models::WorkbookState;
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
