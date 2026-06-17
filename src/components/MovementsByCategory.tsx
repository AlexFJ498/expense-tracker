import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MovementsTable, type MovementTableItem } from "./MovementsTable";
import { cn, formatEuro } from "../lib/utils";
import { useLanguage } from "../lib/i18n";

interface MovementsByCategoryProps {
  movements: MovementTableItem[];
  onMovementClick?: (movement: MovementTableItem) => void;
  loading?: boolean;
}

export function MovementsByCategory({ movements, onMovementClick, loading }: MovementsByCategoryProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, MovementTableItem[]>();
    for (const m of movements) {
      const key = m.category || t("filter.noCategory");
      const list = map.get(key);
      if (list) {
        list.push(m);
      } else {
        map.set(key, [m]);
      }
    }
    const noCat = t("filter.noCategory");
    return [...map.entries()].sort(([a], [b]) => {
      if (a === noCat) return 1;
      if (b === noCat) return -1;
      return a.localeCompare(b);
    });
  }, [movements, t]);

  const toggleGroup = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {t("table.loading")}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {t("table.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map(([category, items]) => {
        const isExpanded = expanded.has(category);
        const income = items
          .filter((m) => m.kind === "ingreso")
          .reduce((sum, m) => sum + m.amount, 0);
        const expense = items
          .filter((m) => m.kind === "gasto")
          .reduce((sum, m) => sum + m.amount, 0);
        const balance = income - expense;
        return (
          <div
            key={category}
            className="rounded-md border bg-card text-card-foreground overflow-hidden"
          >
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-accent/40 transition-colors",
              )}
              onClick={() => toggleGroup(category)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span>{category}</span>
              <span className="text-muted-foreground font-normal">
                ({items.length})
              </span>
              <span className="flex-1" />
              <span className={cn("text-sm font-medium num", balance >= 0 ? "text-success" : "text-danger")}>
                {formatEuro(balance)}
              </span>
            </button>
            {isExpanded && (
              <div className="border-t">
                <MovementsTable
                  movements={items}
                  loading={false}
                  sort
                  asCard={false}
                  showActions={!!onMovementClick}
                  enablePagination={items.length > 30}
                  enableSelection={false}
                  hideCategory
                  onMovementClick={onMovementClick}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
