import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { FiltersBar } from "../components/FiltersBar";
import { MovementForm } from "../components/MovementForm";
import { MovementsTable } from "../components/MovementsTable";
import { api } from "../lib/api";
import type { Category, Movement, MovementFilter } from "../lib/types";
import { formatEuro } from "../lib/utils";
import { useWorkbook } from "../store/workbook";

export function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [filter, setFilter] = useState<MovementFilter>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Movement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const setDirty = useWorkbook((s) => s.setDirty);
  const defaultYearApplied = useRef(false);

  const yearsFromMovements = useCallback((movs: Movement[]) => {
    const s = new Set<number>();
    for (const m of movs) {
      const d = new Date(m.date);
      if (!Number.isNaN(d.getTime())) s.add(d.getFullYear());
    }
    return [...s].sort((a, b) => b - a);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [movs, cats, allMovs] = await Promise.all([
        api.listMovements(filter),
        api.listCategories(),
        api.listMovements({}),
      ]);
      setMovements(movs);
      setCategories(cats);
      setYears(yearsFromMovements(allMovs));
    } finally {
      setLoading(false);
    }
  }, [filter, yearsFromMovements]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-select most recent year on mount (only once)
  useEffect(() => {
    if (!defaultYearApplied.current && years.length > 0 && (!filter.years || filter.years.length === 0)) {
      defaultYearApplied.current = true;
      setFilter((prev) => ({ ...prev, years: [Math.max(...years)] }));
    }
  }, [years, filter.years]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const m of movements) {
      if (m.kind === "ingreso") income += m.amount;
      else expense += m.amount;
    }
    return { income, expense, balance: income - expense };
  }, [movements]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (m: Movement) => {
    setEditing(m);
    setFormOpen(true);
  };

  const onSaved = () => {
    setDirty(true);
    load();
  };

  const handleBatchDelete = useCallback(async (ids: string[]) => {
    await api.deleteMovements(ids);
    setDirty(true);
    await load();
  }, [load, setDirty]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-sm text-muted-foreground">
            {movements.length} registros
            {filter.years?.length ||
            filter.months?.length ||
            filter.categories?.length ||
            filter.kinds?.length ||
            filter.necessary?.length
              ? " (filtrado)"
              : ""}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Nuevo movimiento
        </Button>
      </div>

      <FiltersBar
        filter={filter}
        onChange={setFilter}
        categories={categories}
        years={years}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Ingresos del filtro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-success num">{formatEuro(totals.income)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Gastos del filtro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-danger num">{formatEuro(totals.expense)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-lg font-semibold num ${
                totals.balance >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {formatEuro(totals.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <MovementsTable
        movements={movements}
        loading={loading}
        emptyText="Sin movimientos para este filtro."
        onMovementClick={(movement) => openEdit(movement as Movement)}
        enableSelection
        onBatchDelete={handleBatchDelete}
      />

      <MovementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        editing={editing}
        onSaved={onSaved}
        onDeleted={onSaved}
      />
    </div>
  );
}
