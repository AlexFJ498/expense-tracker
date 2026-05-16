import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { Category, MovementFilter, MovementKind } from "../lib/types";
import { MONTHS } from "../lib/utils";

interface Props {
  filter: MovementFilter;
  onChange: (f: MovementFilter) => void;
  categories: Category[];
  years: number[];
  showKind?: boolean;
}

export function FiltersBar({
  filter,
  onChange,
  categories,
  years,
  showKind = true,
}: Props) {
  const empty =
    filter.year == null &&
    filter.month == null &&
    filter.category == null &&
    filter.kind == null &&
    filter.necessary == null;

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-card/40">
      <div className="space-y-1">
        <Label>Año</Label>
        <Select
          value={filter.year?.toString() ?? "all"}
          onValueChange={(v) =>
            onChange({ ...filter, year: v === "all" ? null : parseInt(v, 10) })
          }
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Mes</Label>
        <Select
          value={filter.month?.toString() ?? "all"}
          onValueChange={(v) =>
            onChange({ ...filter, month: v === "all" ? null : parseInt(v, 10) })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={(i + 1).toString()}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Categoría</Label>
        <Select
          value={filter.category ?? "all"}
          onValueChange={(v) =>
            onChange({ ...filter, category: v === "all" ? null : v })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showKind && (
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select
            value={filter.kind ?? "all"}
            onValueChange={(v) =>
              onChange({ ...filter, kind: v === "all" ? null : (v as MovementKind) })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ingreso">Ingresos</SelectItem>
              <SelectItem value="gasto">Gastos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label>Necesario</Label>
        <Select
          value={filter.necessary == null ? "all" : filter.necessary ? "yes" : "no"}
          onValueChange={(v) =>
            onChange({
              ...filter,
              necessary: v === "all" ? null : v === "yes",
            })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="yes">Sí</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!empty && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="self-end h-9"
        >
          <X />
          Limpiar
        </Button>
      )}
    </div>
  );
}
