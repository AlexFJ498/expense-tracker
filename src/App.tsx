import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Toaster } from "./components/ui/use-toast";
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

function RouteLoading() {
  return <div className="text-sm text-muted-foreground">Cargando…</div>;
}

function AppShell() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/movimientos" element={<MovementsPage />} />
              <Route path="/analisis" element={<AnalyticsPage />} />
              <Route path="/categorias" element={<CategoriesPage />} />
              <Route path="/import-data" element={<ImportDataPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function App() {
  const state = useWorkbook((s) => s.state);
  const loading = useWorkbook((s) => s.loading);
  const refresh = useWorkbook((s) => s.refresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading && !state) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <Toaster>
      {state?.path ? <AppShell /> : <OnboardingPage />}
    </Toaster>
  );
}

export default App;
