import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import type { Category, MovementFilter, MovementKind } from "../lib/types";
import { MONTHS, cn } from "../lib/utils";

type FilterValue = string | number | boolean;

interface Option<T extends FilterValue> {
  value: T;
  label: string;
}

interface MultiSelectFilterProps<T extends FilterValue> {
  label: string;
  emptyLabel: string;
  options: Option<T>[];
  values: T[];
  onValuesChange: (values: T[]) => void;
  className?: string;
}

interface Props {
  filter: MovementFilter;
  onChange: (f: MovementFilter) => void;
  categories: Category[];
  years: number[];
  showKind?: boolean;
}

function withoutEmpty<T extends FilterValue>(values: T[]): T[] | undefined {
  return values.length > 0 ? values : undefined;
}

function toggleValue<T extends FilterValue>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

function selectedSummary<T extends FilterValue>(
  values: T[],
  options: Option<T>[],
  emptyLabel: string,
) {
  if (values.length === 0) return emptyLabel;
  if (values.length === 1) {
    return options.find((option) => option.value === values[0])?.label ?? String(values[0]);
  }
  return `${values.length} seleccionados`;
}

function MultiSelectFilter<T extends FilterValue>({
  label,
  emptyLabel,
  options,
  values,
  onValuesChange,
  className,
}: MultiSelectFilterProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const summary = selectedSummary(values, options, emptyLabel);

  useEffect(() => {
    if (!open) return;

    const closeWhenClickingOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () => document.removeEventListener("pointerdown", closeWhenClickingOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative space-y-1">
      <Label>{label}</Label>
      <Button
        type="button"
        variant="outline"
        aria-label={`${label}: ${summary}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn("h-9 justify-between px-3 font-normal", className)}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className={cn(
            "absolute z-20 mt-1 max-h-72 min-w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            className,
          )}
        >
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">Sin opciones</div>
          ) : (
            options.map((option) => {
              const optionId = `filter-${label}-${String(option.value)}`;
              return (
                <Label
                  key={String(option.value)}
                  htmlFor={optionId}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-accent"
                >
                  <Checkbox
                    id={optionId}
                    checked={values.includes(option.value)}
                    onCheckedChange={() => onValuesChange(toggleValue(values, option.value))}
                  />
                  <span className="truncate">{option.label}</span>
                </Label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function FiltersBar({
  filter,
  onChange,
  categories,
  years,
  showKind = true,
}: Props) {
  const selectedYears = filter.years ?? [];
  const selectedMonths = filter.months ?? [];
  const selectedCategories = filter.categories ?? [];
  const selectedKinds = filter.kinds ?? [];
  const selectedNecessary = filter.necessary ?? [];
  const empty =
    selectedYears.length === 0 &&
    selectedMonths.length === 0 &&
    selectedCategories.length === 0 &&
    selectedKinds.length === 0 &&
    selectedNecessary.length === 0;

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-card/40">
      <MultiSelectFilter
        label="Año"
        emptyLabel="Todos"
        className="w-32"
        values={selectedYears}
        options={years.map((year) => ({ value: year, label: year.toString() }))}
        onValuesChange={(values) => onChange({ ...filter, years: withoutEmpty(values) })}
      />

      <MultiSelectFilter
        label="Mes"
        emptyLabel="Todos"
        className="w-40"
        values={selectedMonths}
        options={MONTHS.map((month, index) => ({ value: index + 1, label: month }))}
        onValuesChange={(values) => onChange({ ...filter, months: withoutEmpty(values) })}
      />

      <MultiSelectFilter
        label="Categoría"
        emptyLabel="Todas"
        className="w-52"
        values={selectedCategories}
        options={categories.map((category) => ({ value: category.name, label: category.name }))}
        onValuesChange={(values) => onChange({ ...filter, categories: withoutEmpty(values) })}
      />

      {showKind && (
        <MultiSelectFilter<MovementKind>
          label="Tipo"
          emptyLabel="Todos"
          className="w-36"
          values={selectedKinds}
          options={[
            { value: "ingreso", label: "Ingresos" },
            { value: "gasto", label: "Gastos" },
          ]}
          onValuesChange={(values) => onChange({ ...filter, kinds: withoutEmpty(values) })}
        />
      )}

      <MultiSelectFilter
        label="Necesario"
        emptyLabel="Todos"
        className="w-36"
        values={selectedNecessary}
        options={[
          { value: true, label: "Sí" },
          { value: false, label: "No" },
        ]}
        onValuesChange={(values) => onChange({ ...filter, necessary: withoutEmpty(values) })}
      />

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
