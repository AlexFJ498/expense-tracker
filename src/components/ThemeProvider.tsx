import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export const THEMES = [
  { id: "oscuro", label: "Oscuro" },
  { id: "claro", label: "Claro" },
  { id: "oceano", label: "Océano" },
  { id: "bosque", label: "Bosque" },
  { id: "atardecer", label: "Atardecer" },
  { id: "contraste", label: "Contraste" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "app-theme";
const THEME_CLASS_PREFIX = "theme-";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.some((t) => t.id === saved)) return saved as ThemeId;
    return "oscuro";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    const root = document.documentElement;
    // Remove all theme classes
    for (const t of THEMES) {
      root.classList.remove(`${THEME_CLASS_PREFIX}${t.id}`);
    }
    // Add current theme class
    root.classList.add(`${THEME_CLASS_PREFIX}${theme}`);
  }, [theme]);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
