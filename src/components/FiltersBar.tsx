import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useLanguage } from "../lib/i18n";
import type { Category, MovementFilter, MovementKind } from "../lib/types";
import { MONTHS, cn } from "../lib/utils";

type FilterValue = string | number | boolean | null;

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
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsText?: string;
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
    const found = options.find((option) => option.value === values[0]);
    return found ? found.label : String(values[0]);
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
  searchable = false,
  searchPlaceholder = "Buscar…",
  noResultsText = "Sin resultados",
}: MultiSelectFilterProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const summary = selectedSummary(values, options, emptyLabel);
  const active = values.length > 0;

  const filtered = searchable && search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    const closeWhenClickingOutside = (event: PointerEvent) => {
      setTimeout(() => {
        if (!containerRef.current) return;
        const target = event.target as Node;
        if (
          document.contains(target) &&
          !containerRef.current.contains(target)
        ) {
          setOpen(false);
        }
      }, 0);
    };

    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () => document.removeEventListener("pointerdown", closeWhenClickingOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Label className="text-xs text-muted-foreground mb-0.5 block">{label}</Label>
      <Button
        type="button"
        variant="outline"
        aria-label={`${label}: ${summary}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "h-8 justify-between px-2.5 font-normal text-sm",
          active && "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
          className,
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
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
          {searchable && (
            <div className="px-1 pb-1">
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">{noResultsText}</div>
          ) : (
            filtered.map((option) => {
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
  const { t } = useLanguage();
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
    <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5 p-3 rounded-lg border bg-card/40">
      <MultiSelectFilter
        label={t("filter.year")}
        emptyLabel={t("filter.all")}
        className="w-40"
        values={selectedYears}
        options={years.map((year) => ({ value: year, label: year.toString() }))}
        onValuesChange={(values) => onChange({ ...filter, years: withoutEmpty(values) })}
      />

      <MultiSelectFilter
        label={t("filter.month")}
        emptyLabel={t("filter.all")}
        className="w-44"
        values={selectedMonths}
        options={MONTHS.map((month, index) => ({ value: index + 1, label: month }))}
        onValuesChange={(values) => onChange({ ...filter, months: withoutEmpty(values) })}
      />

      <MultiSelectFilter
        label={t("filter.category")}
        emptyLabel={t("filter.allF")}
        className="w-56"
        values={selectedCategories}
        searchable
        searchPlaceholder={t("filter.search")}
        noResultsText={t("filter.noResults")}
        options={[
          { value: "" as FilterValue, label: t("filter.noCategory") },
          ...categories.map((category) => ({ value: category.name as FilterValue, label: category.name })),
        ]}
        onValuesChange={(values) => onChange({ ...filter, categories: withoutEmpty(values) as string[] | undefined })}
      />

      {showKind && (
        <MultiSelectFilter<MovementKind>
          label={t("filter.kind")}
          emptyLabel={t("filter.all")}
          className="w-40"
          values={selectedKinds}
          options={[
            { value: "ingreso", label: t("filter.income") },
            { value: "gasto", label: t("filter.expense") },
          ]}
          onValuesChange={(values) => onChange({ ...filter, kinds: withoutEmpty(values) })}
        />
      )}

      <MultiSelectFilter
        label={t("filter.necessary")}
        emptyLabel={t("filter.all")}
        className="w-44"
        values={selectedNecessary}
        options={[
          { value: true, label: t("filter.yes") },
          { value: false, label: t("filter.no") },
          { value: null, label: t("filter.unassigned") },
        ]}
        onValuesChange={(values) => onChange({ ...filter, necessary: withoutEmpty(values) })}
      />

      {!empty && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="h-9"
        >
          <X />
          {t("filter.clear")}
        </Button>
      )}
    </div>
  );
}
