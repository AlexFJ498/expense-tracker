import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListOrdered,
  BarChart3,
  Tags,
  Upload,
  Wallet,
} from "lucide-react";
import { cn } from "../lib/utils";
import { requestImportFlowLeave } from "../lib/navigationGuard";
import { useWorkbook } from "../store/workbook";

interface Item {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const items: Item[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/movimientos", label: "Movimientos", icon: ListOrdered },
  { to: "/analisis", label: "Análisis", icon: BarChart3 },
  { to: "/categorias", label: "Categorías", icon: Tags },
  { to: "/import-data", label: "Importar datos", icon: Upload },
];

export function Sidebar() {
  const state = useWorkbook((s) => s.state);
  const location = useLocation();
  const navigate = useNavigate();
  const fileName = state?.path?.split("/").pop() ?? "Sin archivo";

  return (
    <aside className="w-60 shrink-0 border-r bg-card flex flex-col">
      <div className="h-14 border-b flex items-center gap-2.5 px-4">
        <div className="h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center">
          <Wallet className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Control de Gastos</div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[10rem]" title={state?.path ?? ""}>
            {fileName}
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            onClick={(event) => {
              if (location.pathname === it.to) return;

              if (!requestImportFlowLeave(() => navigate(it.to))) {
                event.preventDefault();
              }
            }}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )
            }
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 text-[11px] text-muted-foreground border-t">
        <div>v0.1.0</div>
      </div>
    </aside>
  );
}
