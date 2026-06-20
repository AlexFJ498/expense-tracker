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
import { useLanguage } from "../lib/i18n";

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
  hideCategory?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;
const PAGE_SIZE_ALL = -1;
const DEFAULT_PAGE_SIZE = 30;

function getSortColumns(hideCategory: boolean) {
  const all = [
    { key: "date" as SortKey, labelKey: "table.date", align: "text-left", width: "w-28" },
    ...(hideCategory ? [] : [{ key: "category" as SortKey, labelKey: "table.category", align: "text-left" as const, width: "w-32" }]),
    { key: "description" as SortKey, labelKey: "table.description", align: "text-left", width: "" },
    { key: "kind" as SortKey, labelKey: "table.kind", align: "text-left", width: "w-20" },
    { key: "amount" as SortKey, labelKey: "table.amount", align: "text-right", width: "w-32" },
    { key: "necessary" as SortKey, labelKey: "table.necessary", align: "text-center", width: "w-24" },
  ];
  return all;
}

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
  const { t } = useLanguage();
  return kind === "ingreso" ? (
    <span className="inline-flex items-center gap-1 text-success text-xs font-medium whitespace-nowrap">
      <ArrowUpRight className="h-3.5 w-3.5" />
      {t("kind.income")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-danger text-xs font-medium whitespace-nowrap">
      <ArrowDownRight className="h-3.5 w-3.5" />
      {t("kind.expense")}
    </span>
  );
}

function PaginationControls({
  page,
  totalPages,
  pageSize,
  onPageSizeChange,
  onPrev,
  onNext,
  pageSizeOptions,
  rowsPerPageLabel,
  pageLabel,
  ofLabel,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  pageSizeOptions: { value: number; label: string }[];
  rowsPerPageLabel: string;
  pageLabel: string;
  ofLabel: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>{rowsPerPageLabel}</span>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange(e.target.value)}
          aria-label="Page size"
        >
          {pageSizeOptions.map(({ value, label }) => (
            <option key={value} value={String(value)}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span>
          {pageLabel} {page} {ofLabel} {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={onPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={onNext}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function MovementsTable({
  movements,
  loading = false,
  emptyText,
  showActions = true,
  sort = true,
  asCard = true,
  onMovementClick,
  enablePagination = true,
  pageSize = DEFAULT_PAGE_SIZE,
  enableSelection = true,
  onBatchDelete,
  hideCategory = false,
}: MovementsTableProps) {
  const { t } = useLanguage();
  const showSelection = sort && enableSelection;
  const showPagination = sort && enablePagination;

  const sortColumns = useMemo(() => getSortColumns(hideCategory), [hideCategory]);

  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const [page, setPage] = useState(() => {
    try {
      const stored = sessionStorage.getItem("movements-page");
      return stored ? Number(stored) : 1;
    } catch {
      return 1;
    }
  });
  const [internalPageSize, setInternalPageSize] = useState(() => {
    try {
      const stored = sessionStorage.getItem("movements-pageSize");
      return stored ? Number(stored) : pageSize;
    } catch {
      return pageSize;
    }
  });

  useEffect(() => {
    sessionStorage.setItem("movements-page", String(page));
  }, [page]);

  useEffect(() => {
    sessionStorage.setItem("movements-pageSize", String(internalPageSize));
  }, [internalPageSize]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const prevMovementsRef = useRef(movements);

  useEffect(() => {
    if (prevMovementsRef.current !== movements) {
      prevMovementsRef.current = movements;
      setPage(1);
    }
  }, [movements]);

  const effectivePageSize = internalPageSize === PAGE_SIZE_ALL ? movements.length : internalPageSize;
  const totalPages = Math.max(1, Math.ceil(movements.length / effectivePageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const isAll = internalPageSize === PAGE_SIZE_ALL;
  const pageSizeOptions = [
    ...PAGE_SIZE_OPTIONS.map((s) => ({ value: s, label: String(s) })),
    { value: PAGE_SIZE_ALL, label: t("table.all") },
  ];

  const sorted = useMemo(
    () => (sort ? sortMovements(movements, sortKey, sortDir) : movements),
    [movements, sort, sortKey, sortDir],
  );

  const showPaginationControls = showPagination && movements.length > internalPageSize && !isAll;

  const paginated = useMemo(() => {
    if (!showPagination) return sorted;
    if (isAll) return sorted;
    const start = (page - 1) * effectivePageSize;
    return sorted.slice(start, start + effectivePageSize);
  }, [sorted, page, effectivePageSize, showPagination, isAll]);

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
        for (const id of currentPageIds) {
          next.delete(id);
        }
      } else {
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

  const columnCount =
    (showSelection ? 1 : 0) +
    sortColumns.length +
    (showActions ? 1 : 0);

  const sortIndicator = (key: SortKey) => {
    if (key !== sortKey) return null;
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  const renderPagination = () => (
    showPaginationControls ? (
      <PaginationControls
        page={page}
        totalPages={totalPages}
        pageSize={internalPageSize}
        onPageSizeChange={handlePageSizeChange}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        pageSizeOptions={pageSizeOptions}
        rowsPerPageLabel={t("table.rowsPerPage")}
        pageLabel={t("table.page")}
        ofLabel={t("table.of")}
      />
    ) : null
  );

  const table = (
    <div className="overflow-x-auto">
      {showSelection && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b">
          <span className="text-sm font-medium">
            {selectedIds.size} {t("table.selected")}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("table.delete")}
          </Button>
        </div>
      )}

      {renderPagination()}

      <table className="w-full text-sm table-fixed">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            {showSelection && (
              <th className="px-3 py-2 w-10">
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
            {sortColumns.map(({ key, labelKey, align, width }) => (
              <th key={key} className={`px-3 py-2 font-medium ${align} ${width}`}>
                {sort ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort(key)}
                    aria-label={t(labelKey)}
                  >
                    {t(labelKey)}
                    {sortIndicator(key)}
                  </button>
                ) : (
                  t(labelKey)
                )}
              </th>
            ))}
            {showActions && <th className="w-8"></th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {loading ? (
            <tr>
              <td colSpan={columnCount} className="text-center py-12 text-muted-foreground">
                {t("table.loading")}
              </td>
            </tr>
          ) : paginated.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="text-center py-12 text-muted-foreground">
                {emptyText ?? t("table.empty")}
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
                    className="px-3 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.has(movement.id)}
                      onCheckedChange={() => handleToggleRow(movement.id)}
                      aria-label={`Select ${movement.description || movement.id}`}
                    />
                  </td>
                )}
                <td className="px-3 py-2 num whitespace-nowrap w-28">
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
                {!hideCategory && (
                  <td className="px-3 py-2 w-32 truncate">{movement.category}</td>
                )}
                <td className="px-3 py-2 max-w-80">
                  {movement.description?.trim() ? (
                    <span className="line-clamp-2">{movement.description}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 w-20">
                  <MovementKindLabel kind={movement.kind} />
                </td>
                <td
                  className={`px-3 py-2 text-right num font-medium w-32 ${
                    movement.kind === "ingreso" ? "text-success" : "text-danger"
                  }`}
                >
                  {movement.kind === "ingreso" ? "+" : "−"}
                  {formatEuro(movement.amount)}
                </td>
                <td className="px-3 py-2 text-center text-xs w-24">
                  {movement.necessary === true ? (
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {t("necessary.yes")}
                    </span>
                  ) : movement.necessary === false ? (
                    <span className="text-muted-foreground">{t("necessary.no")}</span>
                  ) : (
                    <span className="text-muted-foreground/50 italic">{t("necessary.unassigned")}</span>
                  )}
                </td>
                {showActions && (
                  <td className="px-3 py-2 text-right">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {renderPagination()}
    </div>
  );

  const deleteCount = selectedIds.size;
  const confirmDialog = onBatchDelete && (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("dialog.deleteTitle", { count: deleteCount, plural: deleteCount !== 1 ? "s" : "" })}
          </DialogTitle>
          <DialogDescription>
            {t("dialog.deleteDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleDeleteCancel}>
            {t("dialog.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDeleteConfirm}>
            {t("dialog.confirm")}
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
