import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import type { MovementKind } from "../lib/types";
import { formatDate, formatEuro } from "../lib/utils";

export type SortKey = "date" | "amount" | "category" | "kind" | "necessary" | "description";
export type SortDirection = "asc" | "desc";

export interface MovementTableItem {
  id: string;
  row: number;
  date: string;
  category: string;
  description?: string;
  kind: MovementKind;
  amount: number;
  necessary: boolean | null;
  raw_date?: string | null;
  dirty?: boolean;
}

interface MovementsTableProps {
  movements: MovementTableItem[];
  loading?: boolean;
  emptyText?: string;
  showActions?: boolean;
  sort?: boolean;
  asCard?: boolean;
  onMovementClick?: (movement: MovementTableItem) => void;
  enablePagination?: boolean;
  pageSize?: number;
  enableSelection?: boolean;
  onBatchDelete?: (ids: string[]) => Promise<void>;
}

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 30;

const COLUMN_WIDTH: Record<SortKey, string> = {
  date: "w-32",
  category: "w-36",
  description: "",
  kind: "w-24",
  amount: "w-36",
  necessary: "w-28",
};

const SORT_COLUMNS: { key: SortKey; label: string; align: string; width: string }[] = [
  { key: "date", label: "Fecha", align: "text-left", width: COLUMN_WIDTH.date },
  { key: "category", label: "Categoría", align: "text-left", width: COLUMN_WIDTH.category },
  { key: "description", label: "Descripción", align: "text-left", width: COLUMN_WIDTH.description },
  { key: "kind", label: "Tipo", align: "text-left", width: COLUMN_WIDTH.kind },
  { key: "amount", label: "Importe", align: "text-right", width: COLUMN_WIDTH.amount },
  { key: "necessary", label: "Necesario", align: "text-center", width: COLUMN_WIDTH.necessary },
];

function sortMovements(
  items: MovementTableItem[],
  key: SortKey,
  direction: SortDirection,
): MovementTableItem[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "date":
        cmp = a.date.localeCompare(b.date);
        break;
      case "amount":
        cmp =
          (a.kind === "ingreso" ? a.amount : -a.amount) -
          (b.kind === "ingreso" ? b.amount : -b.amount);
        break;
      case "category":
        cmp = a.category.localeCompare(b.category);
        break;
      case "description":
        cmp = (a.description ?? "").localeCompare(b.description ?? "");
        break;
      case "kind":
        cmp = a.kind.localeCompare(b.kind);
        break;
      case "necessary":
        cmp = (a.necessary === true ? 1 : a.necessary === false ? 0 : -1) - (b.necessary === true ? 1 : b.necessary === false ? 0 : -1);
        break;
    }
    return cmp * multiplier || b.row - a.row;
  });
}

export function MovementKindLabel({ kind }: { kind: MovementKind }) {
  return kind === "ingreso" ? (
    <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
      <ArrowUpRight className="h-3.5 w-3.5" />
      Ingreso
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-danger text-xs font-medium">
      <ArrowDownRight className="h-3.5 w-3.5" />
      Gasto
    </span>
  );
}

export function MovementsTable({
  movements,
  loading = false,
  emptyText = "Sin movimientos.",
  showActions = true,
  sort = true,
  asCard = true,
  onMovementClick,
  enablePagination = true,
  pageSize = DEFAULT_PAGE_SIZE,
  enableSelection = true,
  onBatchDelete,
}: MovementsTableProps) {
  // When sort=false (preview mode), disable interactive features
  const showSelection = sort && enableSelection;
  const showPagination = sort && enablePagination;

  // ─── Sort state ────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // ─── Pagination state ──────────────────────────────
  const [page, setPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(pageSize);

  // ─── Selection state ────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ─── Page reset on filter change ──────────────────
  const prevMovementsRef = useRef(movements);

  useEffect(() => {
    if (prevMovementsRef.current !== movements) {
      prevMovementsRef.current = movements;
      setPage(1);
    }
  }, [movements]);

  // ─── Clamp page when total pages shrink ────────────
  const totalPages = Math.max(1, Math.ceil(movements.length / internalPageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // ─── Derived data ──────────────────────────────────
  const sorted = useMemo(
    () => (sort ? sortMovements(movements, sortKey, sortDir) : movements),
    [movements, sort, sortKey, sortDir],
  );

  const showPaginationControls = showPagination && movements.length > internalPageSize;

  const paginated = useMemo(() => {
    if (!showPagination) return sorted;
    const start = (page - 1) * internalPageSize;
    return sorted.slice(start, start + internalPageSize);
  }, [sorted, page, internalPageSize, showPagination]);

  // ─── Handlers ───────────────────────────────────────
  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey],
  );

  const handlePageSizeChange = useCallback((value: string) => {
    setInternalPageSize(Number(value));
    setPage(1);
  }, []);

  const currentPageIds = useMemo(
    () => new Set(paginated.map((m) => m.id)),
    [paginated],
  );

  const allCurrentPageSelected =
    paginated.length > 0 &&
    paginated.every((m) => selectedIds.has(m.id));

  const someCurrentPageSelected =
    paginated.some((m) => selectedIds.has(m.id)) && !allCurrentPageSelected;

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allCurrentPageSelected) {
        // Deselect all on current page
        for (const id of currentPageIds) {
          next.delete(id);
        }
      } else {
        // Select all on current page
        for (const id of currentPageIds) {
          next.add(id);
        }
      }
      return next;
    });
  }, [allCurrentPageSelected, currentPageIds]);

  const handleToggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (onBatchDelete && selectedIds.size > 0) {
      try {
        await onBatchDelete([...selectedIds]);
        setSelectedIds(new Set());
      } finally {
        setDeleteDialogOpen(false);
      }
    }
  }, [onBatchDelete, selectedIds]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  // ─── Column count ───────────────────────────────────
  const columnCount =
    (showSelection ? 1 : 0) +
    SORT_COLUMNS.length +
    (showActions ? 1 : 0);

  // ─── Render ─────────────────────────────────────────
  const sortIndicator = (key: SortKey) => {
    if (key !== sortKey) return null;
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  const table = (
    <div className="overflow-x-auto">
      {/* Selection toolbar */}
      {showSelection && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}

      <table className="w-full text-sm table-fixed">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            {showSelection && (
              <th className="px-4 py-2.5 w-10">
                <Checkbox
                  checked={
                    allCurrentPageSelected
                      ? true
                      : someCurrentPageSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={handleToggleAll}
                  aria-label="Select all on page"
                />
              </th>
            )}
            {SORT_COLUMNS.map(({ key, label, align, width }) => (
              <th key={key} className={`px-4 py-2.5 font-medium ${align} ${width}`}>
                {sort ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort(key)}
                    aria-label={label}
                  >
                    {label}
                    {sortIndicator(key)}
                  </button>
                ) : (
                  label
                )}
              </th>
            ))}
            {showActions && <th className="w-10"></th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {loading ? (
            <tr>
              <td colSpan={columnCount} className="text-center py-12 text-muted-foreground">
                Cargando…
              </td>
            </tr>
          ) : paginated.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="text-center py-12 text-muted-foreground">
                {emptyText}
              </td>
            </tr>
          ) : (
            paginated.map((movement) => (
              <tr
                key={movement.id}
                className={`hover:bg-accent/40 cursor-pointer transition-colors${
                  selectedIds.has(movement.id) ? " bg-accent/20" : ""
                }`}
                onClick={() => onMovementClick?.(movement)}
              >
                {showSelection && (
                  <td
                    className="px-4 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.has(movement.id)}
                      onCheckedChange={() => handleToggleRow(movement.id)}
                      aria-label={`Select ${movement.description || movement.id}`}
                    />
                  </td>
                )}
                <td className="px-4 py-2.5 num whitespace-nowrap w-32">
                  {movement.dirty ? (
                    <span
                      className="inline-flex items-center gap-1.5 text-amber-400"
                      title={`Fecha original: ${movement.raw_date ?? "?"}`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {movement.raw_date ?? "?"}
                    </span>
                  ) : (
                    formatDate(movement.date)
                  )}
                </td>
                <td className="px-4 py-2.5 w-36">{movement.category}</td>
                <td className="px-4 py-2.5 max-w-80">
                  {movement.description?.trim() ? (
                    <span className="line-clamp-2">{movement.description}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 w-24">
                  <MovementKindLabel kind={movement.kind} />
                </td>
                <td
                  className={`px-4 py-2.5 text-right num font-medium w-36 ${
                    movement.kind === "ingreso" ? "text-success" : "text-danger"
                  }`}
                >
                  {movement.kind === "ingreso" ? "+" : "−"}
                  {formatEuro(movement.amount)}
                </td>
                <td className="px-4 py-2.5 text-center text-xs w-28">
                  {movement.necessary === true ? (
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      Sí
                    </span>
                  ) : movement.necessary === false ? (
                    <span className="text-muted-foreground">No</span>
                  ) : (
                    <span className="text-muted-foreground/50 italic">Sin asignar</span>
                  )}
                </td>
                {showActions && (
                  <td className="px-4 py-2.5 text-right">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination controls */}
      {showPaginationControls && (
        <div className="flex items-center justify-between px-4 py-2 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={String(internalPageSize)}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              aria-label="Page size"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={String(size)}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Confirmation dialog
  const confirmDialog = onBatchDelete && (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {selectedIds.size} movement{selectedIds.size !== 1 ? "s" : ""}?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteConfirm} aria-label="Confirm delete">
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!asCard) {
    return (
      <div className="rounded-md border bg-card text-card-foreground">
        {table}
        {confirmDialog}
      </div>
    );
  }

  return (
    <Card>
      {table}
      {confirmDialog}
    </Card>
  );
}