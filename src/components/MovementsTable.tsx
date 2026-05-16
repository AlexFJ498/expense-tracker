import { AlertTriangle, ArrowDownRight, ArrowUpRight, Pencil } from "lucide-react";
import { Card } from "./ui/card";
import type { MovementKind } from "../lib/types";
import { formatDate, formatEuro } from "../lib/utils";

export interface MovementTableItem {
  id: string;
  row: number;
  date: string;
  category: string;
  kind: MovementKind;
  amount: number;
  necessary: boolean;
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
}: MovementsTableProps) {
  const visibleMovements = sort
    ? [...movements].sort((a, b) =>
        a.date > b.date ? -1 : a.date < b.date ? 1 : b.row - a.row,
      )
    : movements;
  const columnCount = showActions ? 6 : 5;

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
            <th className="text-left px-4 py-2.5 font-medium">Categoría</th>
            <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
            <th className="text-right px-4 py-2.5 font-medium">Importe</th>
            <th className="text-center px-4 py-2.5 font-medium">Necesario</th>
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
          ) : visibleMovements.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="text-center py-12 text-muted-foreground">
                {emptyText}
              </td>
            </tr>
          ) : (
            visibleMovements.map((movement) => (
              <tr
                key={movement.id}
                className="hover:bg-accent/40 cursor-pointer transition-colors"
                onClick={() => onMovementClick?.(movement)}
              >
                <td className="px-4 py-2.5 num whitespace-nowrap">
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
                <td className="px-4 py-2.5">{movement.category}</td>
                <td className="px-4 py-2.5">
                  <MovementKindLabel kind={movement.kind} />
                </td>
                <td
                  className={`px-4 py-2.5 text-right num font-medium ${
                    movement.kind === "ingreso" ? "text-success" : "text-danger"
                  }`}
                >
                  {movement.kind === "ingreso" ? "+" : "−"}
                  {formatEuro(movement.amount)}
                </td>
                <td className="px-4 py-2.5 text-center text-xs">
                  {movement.necessary ? (
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      Sí
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
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
    </div>
  );

  if (!asCard) {
    return <div className="rounded-md border bg-card text-card-foreground">{table}</div>;
  }

  return <Card>{table}</Card>;
}
