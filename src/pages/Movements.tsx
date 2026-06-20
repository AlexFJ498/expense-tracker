import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Undo2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FiltersBar } from "../components/FiltersBar";
import { MovementForm } from "../components/MovementForm";
import { MovementsByCategory } from "../components/MovementsByCategory";
import { MovementsTable } from "../components/MovementsTable";
import { useToast } from "../components/ui/use-toast";
import { api } from "../lib/api";
import { useLanguage } from "../lib/i18n";
import type { Category, Movement, MovementFilter } from "../lib/types";
import { formatEuro } from "../lib/utils";
import { useWorkbook } from "../store/workbook";

type ViewMode = "list" | "grouped";

export function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [filter, setFilter] = useState<MovementFilter>(() => {
    try {
      const stored = sessionStorage.getItem("movements-filter");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    sessionStorage.setItem("movements-filter", JSON.stringify(filter));
  }, [filter]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Movement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const save = useWorkbook((s) => s.save);
  const captureUndo = useWorkbook((s) => s.captureUndo);
  const performUndo = useWorkbook((s) => s.performUndo);
  const { t } = useLanguage();
  const { toast } = useToast();
  const defaultYearApplied = useRef(false);
  const allMovementsRef = useRef<Movement[]>([]);

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
      allMovementsRef.current = allMovs;
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

  const captureAllUndo = useCallback(() => {
    if (allMovementsRef.current.length > 0) {
      captureUndo(allMovementsRef.current);
    }
  }, [captureUndo]);

  // Capture undo snapshot when form opens (use ALL movements from last load)
  useEffect(() => {
    if (formOpen) {
      captureAllUndo();
    }
  }, [formOpen]);

  // Auto-save after mutation, notify with undo action
  const autoSaveAndNotify = useCallback(async () => {
    try {
      await save();
      toast({
        title: t("toast.saved"),
        description: t("toast.savedDesc"),
        variant: "success",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUndoDialogOpen(true)}
          >
            <Undo2 className="h-3.5 w-3.5" />
            {t("toast.undo")}
          </Button>
        ),
      });
    } catch (e) {
      toast({
        title: t("toast.errorSaving"),
        description: String(e),
        variant: "destructive",
      });
    }
  }, [save, toast, t]);

  const handleUndoConfirm = useCallback(async () => {
    setUndoDialogOpen(false);
    setUndoing(true);
    try {
      await performUndo();
      await load();
      toast({
        title: t("toast.saved"),
        description: t("movements.changesReverted"),
        variant: "success",
      });
    } catch (e) {
      toast({
        title: t("toast.errorSaving"),
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setUndoing(false);
    }
  }, [performUndo, load, toast, t]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    const dates: number[] = [];
    const months = new Set<string>();
    for (const m of movements) {
      if (m.kind === "ingreso") income += m.amount;
      else expense += m.amount;
      const d = new Date(m.date);
      const t = d.getTime();
      if (!Number.isNaN(t)) {
        dates.push(t);
        months.add(`${d.getFullYear()}-${d.getMonth()}`);
      }
    }
    const balance = income - expense;
    dates.sort((a, b) => a - b);
    const daySpan = dates.length > 0
      ? Math.max(1, (dates[dates.length - 1] - dates[0]) / 86400000 + 1)
      : 1;
    const monthSpan = Math.max(1, months.size);
    return {
      income, expense, balance,
      avgDailyBalance: balance / daySpan,
      avgMonthlyExpense: expense / monthSpan,
      avgMonthlyBalance: balance / monthSpan,
    };
  }, [movements]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (m: Movement) => {
    setEditing(m);
    setFormOpen(true);
  };

  const onSaved = async () => {
    await autoSaveAndNotify();
    await load();
  };

  const onDeleted = async () => {
    await autoSaveAndNotify();
    await load();
  };

  const handleBatchDelete = useCallback(async (ids: string[]) => {
    captureAllUndo();
    await api.backupWorkbook();
    await api.deleteMovements(ids);
    await autoSaveAndNotify();
    await load();
  }, [load, captureAllUndo, autoSaveAndNotify]);

  const hasActiveFilter =
    (filter.years?.length ?? 0) > 0 ||
    (filter.months?.length ?? 0) > 0 ||
    (filter.categories?.length ?? 0) > 0 ||
    (filter.kinds?.length ?? 0) > 0 ||
    (filter.necessary?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("movements.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {movements.length} {t("summary.records")}
            {hasActiveFilter ? ` ${t("summary.filtered")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="list">{t("view.list")}</TabsTrigger>
              <TabsTrigger value="grouped">{t("view.byCategory")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={openCreate}>
            <Plus />
            {t("movements.newMovement")}
          </Button>
        </div>
      </div>

      <FiltersBar
        filter={filter}
        onChange={setFilter}
        categories={categories}
        years={years}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{t("summary.income")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-success num">{formatEuro(totals.income)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{t("summary.expense")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-destructive num">{formatEuro(totals.expense)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{t("summary.balance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-semibold num ${totals.balance >= 0 ? "text-success" : "text-destructive"}`}>
              {formatEuro(totals.balance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{t("summary.avgDailyBalance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-semibold num ${totals.avgDailyBalance >= 0 ? "text-success" : "text-destructive"}`}>
              {formatEuro(totals.avgDailyBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{t("summary.avgMonthlyExpense")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-destructive num">{formatEuro(totals.avgMonthlyExpense)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{t("summary.avgMonthlyBalance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-semibold num ${totals.avgMonthlyBalance >= 0 ? "text-success" : "text-destructive"}`}>
              {formatEuro(totals.avgMonthlyBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === "list" ? (
        <MovementsTable
          movements={movements}
          loading={loading}
          emptyText={t("table.empty")}
          onMovementClick={(movement) => openEdit(movement as Movement)}
          enableSelection
          onBatchDelete={handleBatchDelete}
        />
      ) : (
        <MovementsByCategory
          movements={movements}
          loading={loading}
          onMovementClick={(movement) => openEdit(movement as Movement)}
        />
      )}

      <MovementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        editing={editing}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />

      {/* Undo confirmation dialog */}
      <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.undoTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialog.undoDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUndoDialogOpen(false)}>
              {t("dialog.cancel")}
            </Button>
            <Button variant="default" onClick={handleUndoConfirm} disabled={undoing}>
              {t("dialog.undoConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
