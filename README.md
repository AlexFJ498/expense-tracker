# Control de Gastos

Aplicacion de escritorio para gestionar movimientos, categorias, importaciones bancarias y analitica personal usando un libro Excel como fuente de verdad.

## Stack

- React 19, Vite, TypeScript y Tailwind.
- Tauri 2 con backend Rust.
- Persistencia en workbook Excel.
- Tests frontend con Vitest y Testing Library.
- Tests Rust en `src-tauri/tests`.

## Requisitos

- Node.js 22 o compatible.
- npm 10 o compatible.
- Rust estable con Cargo.

## Desarrollo

```bash
npm ci
npm run dev
```

Para ejecutar la app de escritorio:

```bash
npm run tauri dev
```

## Verificacion

```bash
npm test
npm run build
cd src-tauri
cargo test
```

## Privacidad De Datos

El repositorio no debe contener workbooks reales, exports bancarios ni fixtures con datos personales. Los archivos `*.xlsx`, `*.xls` y `*.csv` estan ignorados deliberadamente; las pruebas que necesitan Excel generan workbooks temporales.
