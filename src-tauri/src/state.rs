use crate::config::AppConfig;
use crate::error::{AppError, AppResult};
use crate::excel::Workbook;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};

pub struct AppState {
    pub inner: Mutex<Inner>,
}

pub struct Inner {
    pub workbook: Option<Workbook>,
    pub config: AppConfig,
    pub dirty: bool,
}

impl AppState {
    pub fn new() -> Self {
        let config = AppConfig::load().unwrap_or_default();
        Self {
            inner: Mutex::new(Inner {
                workbook: None,
                config,
                dirty: false,
            }),
        }
    }

    pub fn lock_inner(&self) -> AppResult<MutexGuard<'_, Inner>> {
        self.inner.lock().map_err(|_| AppError::StateUnavailable)
    }
}

impl Inner {
    pub fn open_from_config(&mut self) -> crate::error::AppResult<()> {
        if let Some(ref path) = self.config.active_path {
            let p = PathBuf::from(path);
            if p.exists() {
                match Workbook::open(&p) {
                    Ok(wb) => {
                        self.workbook = Some(wb);
                        self.dirty = false;
                    }
                    Err(e) => {
                        // Remove broken recent
                        self.config.active_path = None;
                        let _ = self.config.save();
                        return Err(e);
                    }
                }
            } else {
                self.config.active_path = None;
                let _ = self.config.save();
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::AppConfig;
    use std::panic::{catch_unwind, AssertUnwindSafe};

    fn test_state() -> AppState {
        AppState {
            inner: Mutex::new(Inner {
                workbook: None,
                config: AppConfig::default(),
                dirty: false,
            }),
        }
    }

    #[test]
    fn lock_inner_maps_poisoned_mutex_to_app_error() {
        let state = test_state();

        let _ = catch_unwind(AssertUnwindSafe(|| {
            let _guard = state.inner.lock().unwrap();
            panic!("poison app state");
        }));

        let err = match state.lock_inner() {
            Ok(_) => panic!("poisoned mutex should become a recoverable app error"),
            Err(err) => err,
        };
        assert!(err.to_string().contains("estado interno"));
    }
}
