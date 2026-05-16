use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("No hay un Excel activo")]
    NoActiveWorkbook,
    #[error("El archivo está siendo usado por otra aplicación. Ciérralo y reintenta.")]
    FileBusy,
    #[error("El Excel no contiene la estructura esperada: {0}")]
    InvalidWorkbook(String),
    #[error("Categoría no encontrada: {0}")]
    CategoryNotFound(String),
    #[error("La categoría '{0}' tiene movimientos asociados y no se puede eliminar")]
    CategoryInUse(String),
    #[error("Movimiento no encontrado: {0}")]
    MovementNotFound(String),
    #[error("Ya existe una categoría con ese nombre")]
    DuplicateCategory,
    #[error("Datos inválidos: {0}")]
    Invalid(String),
    #[error("El estado interno de la aplicación no está disponible. Reinicia la aplicación.")]
    StateUnavailable,
    #[error("Error de Excel: {0}")]
    Excel(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
