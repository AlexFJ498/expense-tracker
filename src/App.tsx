import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SettingsDialog } from "./components/SettingsDialog";
import { Sidebar } from "./components/Sidebar";
import { ThemeProvider } from "./components/ThemeProvider";
import { Topbar } from "./components/Topbar";
import { Toaster } from "./components/ui/use-toast";
import { LanguageProvider } from "./lib/i18n";
import { OnboardingPage } from "./pages/Onboarding";
import { useWorkbook } from "./store/workbook";

const DashboardPage = lazy(() =>
  import("./pages/Dashboard").then(({ DashboardPage }) => ({ default: DashboardPage })),
);
const MovementsPage = lazy(() =>
  import("./pages/Movements").then(({ MovementsPage }) => ({ default: MovementsPage })),
);
const AnalyticsPage = lazy(() =>
  import("./pages/Analytics").then(({ AnalyticsPage }) => ({ default: AnalyticsPage })),
);
const CategoriesPage = lazy(() =>
  import("./pages/Categories").then(({ CategoriesPage }) => ({ default: CategoriesPage })),
);
const ImportDataPage = lazy(() =>
  import("./pages/ImportData").then(({ ImportDataPage }) => ({ default: ImportDataPage })),
);
const ImportRulesPage = lazy(() =>
  import("./pages/ImportRules").then(({ ImportRulesPage }) => ({ default: ImportRulesPage })),
);

function RouteLoading() {
  return <div className="text-sm text-muted-foreground">Cargando…</div>;
}

function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="fixed inset-0 flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onOpenSettings={() => setSettingsOpen(true)} />
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/movimientos" element={<MovementsPage />} />
              <Route path="/analisis" element={<AnalyticsPage />} />
              <Route path="/categorias" element={<CategoriesPage />} />
              <Route path="/import-data" element={<ImportDataPage />} />
              <Route path="/import-rules" element={<ImportRulesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function App() {
  const state = useWorkbook((s) => s.state);
  const loading = useWorkbook((s) => s.loading);
  const refresh = useWorkbook((s) => s.refresh);
  const zoomRef = useRef(1.0);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Ctrl + / Ctrl - / Ctrl 0 → app zoom
  useEffect(() => {
    const ZOOM_STEP = 0.1;
    const MIN = 0.5;
    const MAX = 2.0;
    const STORAGE_KEY = "app-zoom";

    const applyZoom = (z: number) => {
      document.documentElement.style.zoom = String(z);
    };

    // Prevent browser scrollbar — app uses fixed inset-0, no body scroll needed
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      zoomRef.current = Math.min(MAX, Math.max(MIN, parseFloat(saved)));
    }
    applyZoom(zoomRef.current);

    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (["input", "textarea", "select"].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomRef.current = Math.min(MAX, zoomRef.current + ZOOM_STEP);
      } else if (e.key === "-") {
        e.preventDefault();
        zoomRef.current = Math.max(MIN, zoomRef.current - ZOOM_STEP);
      } else if (e.key === "0") {
        e.preventDefault();
        zoomRef.current = 1.0;
      } else {
        return;
      }
      applyZoom(zoomRef.current);
      localStorage.setItem(STORAGE_KEY, String(zoomRef.current));
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading && !state) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <Toaster>
          {state?.path ? <AppShell /> : <OnboardingPage />}
        </Toaster>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
