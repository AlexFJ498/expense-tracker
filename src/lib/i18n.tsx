import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

interface Translations {
  [key: string]: string;
}

const es: Translations = {
  "filter.year": "Año",
  "filter.month": "Mes",
  "filter.category": "Categoría",
  "filter.kind": "Tipo",
  "filter.necessary": "Necesario",
  "filter.all": "Todos",
  "filter.allF": "Todas",
  "filter.income": "Ingresos",
  "filter.expense": "Gastos",
  "filter.yes": "Sí",
  "filter.no": "No",
  "filter.unassigned": "Sin asignar",
  "filter.noCategory": "(sin categoría)",
  "filter.clear": "Limpiar",
  "filter.search": "Buscar categoría…",
  "filter.noResults": "Sin resultados",
  "filter.selected": "seleccionados",
  "table.date": "Fecha",
  "table.category": "Categoría",
  "table.description": "Descripción",
  "table.kind": "Tipo",
  "table.amount": "Importe",
  "table.necessary": "Necesario",
  "table.rowsPerPage": "Filas por página:",
  "table.page": "Página",
  "table.of": "de",
  "table.all": "Todos",
  "table.selected": "seleccionados",
  "table.delete": "Eliminar",
  "table.loading": "Cargando…",
  "table.empty": "Sin movimientos.",
  "kind.income": "Ingreso",
  "kind.expense": "Gasto",
  "kind.incomePlural": "Ingresos",
  "kind.expensePlural": "Gastos",
  "necessary.yes": "Sí",
  "necessary.no": "No",
  "necessary.unassigned": "Sin asignar",
  "dialog.deleteTitle": "¿Eliminar {count} movimiento{plural}?",
  "dialog.deleteDescription": "Esta acción no se puede deshacer.",
  "dialog.cancel": "Cancelar",
  "dialog.confirm": "Confirmar",
  "dialog.undoTitle": "¿Deshacer el último cambio?",
  "dialog.undoDescription": "Se restaurará el estado anterior a la última modificación.",
  "dialog.undoConfirm": "Deshacer",
  "toast.saved": "Guardado",
  "toast.savedDesc": "Cambios escritos en el Excel.",
  "toast.undo": "Deshacer",
  "toast.errorSaving": "Error al guardar",
  "view.list": "Lista",
  "view.byCategory": "Por categoría",
  "settings.title": "Ajustes",
  "settings.language": "Idioma",
  "settings.theme": "Tema",
  "settings.close": "Cerrar",
  "summary.income": "Ingresos",
  "summary.expense": "Gastos",
  "summary.balance": "Balance",
  "summary.filtered": "(filtrado)",
  "summary.records": "registros",
  "topbar.settings": "Ajustes",
  "topbar.changeExcel": "Cambiar Excel",
};

const en: Translations = {
  "filter.year": "Year",
  "filter.month": "Month",
  "filter.category": "Category",
  "filter.kind": "Kind",
  "filter.necessary": "Necessary",
  "filter.all": "All",
  "filter.allF": "All",
  "filter.income": "Income",
  "filter.expense": "Expense",
  "filter.yes": "Yes",
  "filter.no": "No",
  "filter.unassigned": "Unassigned",
  "filter.noCategory": "(no category)",
  "filter.clear": "Clear",
  "filter.search": "Search category…",
  "filter.noResults": "No results",
  "filter.selected": "selected",
  "table.date": "Date",
  "table.category": "Category",
  "table.description": "Description",
  "table.kind": "Kind",
  "table.amount": "Amount",
  "table.necessary": "Necessary",
  "table.rowsPerPage": "Rows per page:",
  "table.page": "Page",
  "table.of": "of",
  "table.all": "All",
  "table.selected": "selected",
  "table.delete": "Delete",
  "table.loading": "Loading…",
  "table.empty": "No movements.",
  "kind.income": "Income",
  "kind.expense": "Expense",
  "kind.incomePlural": "Income",
  "kind.expensePlural": "Expense",
  "necessary.yes": "Yes",
  "necessary.no": "No",
  "necessary.unassigned": "Unassigned",
  "dialog.deleteTitle": "Delete {count} movement{plural}?",
  "dialog.deleteDescription": "This action cannot be undone.",
  "dialog.cancel": "Cancel",
  "dialog.confirm": "Confirm",
  "dialog.undoTitle": "Undo last change?",
  "dialog.undoDescription": "This will restore the state before the last modification.",
  "dialog.undoConfirm": "Undo",
  "toast.saved": "Saved",
  "toast.savedDesc": "Changes written to Excel.",
  "toast.undo": "Undo",
  "toast.errorSaving": "Error saving",
  "view.list": "List",
  "view.byCategory": "By category",
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.theme": "Theme",
  "settings.close": "Close",
  "summary.income": "Income",
  "summary.expense": "Expense",
  "summary.balance": "Balance",
  "summary.filtered": "(filtered)",
  "summary.records": "records",
  "topbar.settings": "Settings",
  "topbar.changeExcel": "Change Excel",
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "app-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") return saved;
    return "es";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const map = lang === "en" ? en : es;
      let value = map[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v));
        }
      }
      return value;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
