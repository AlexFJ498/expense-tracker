mod analytics;
mod commands;
mod config;
mod error;
mod excel;
mod imports;
mod models;
mod state;

use state::AppState;

#[doc(hidden)]
pub mod __internal {
    pub use crate::analytics::compute;
    pub use crate::excel::Workbook;
    pub use crate::models::{
        ImportDraftRow, ImportDuplicate, MovementFilter, MovementInput, MovementKind,
    };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_workbook_state,
            commands::create_workbook,
            commands::import_workbook,
            commands::close_workbook,
            commands::save_workbook,
            commands::list_import_providers,
            commands::parse_import_file,
            commands::detect_import_duplicates,
            commands::confirm_import,
            commands::list_movements,
            commands::create_movement,
            commands::update_movement,
            commands::delete_movement,
            commands::list_categories,
            commands::create_category,
            commands::delete_category,
            commands::get_analytics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
