import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileSpreadsheet,
  Loader2,
  Plus,
  Upload,
} from "lucide-react";
import { MovementsTable } from "../components/MovementsTable";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { useToast } from "../components/ui/use-toast";
import { api } from "../lib/api";
import {
  LEAVE_IMPORT_FLOW_EVENT,
  type LeaveImportFlowDetail,
} from "../lib/navigationGuard";
import { cn, formatEuro } from "../lib/utils";
import { useWorkbook } from "../store/workbook";
import type {
  Category,
  ImportDraftRow,
  ImportDuplicate,
  ImportProvider,
  MovementKind,
  ParsedImportRow,
} from "../lib/types";

type WizardStep = "bank" | "file" | "complete" | "review";
type ImportWizardRow = ImportDraftRow & { warnings: string[] };
type LeavePrompt = { message: string; onContinue: () => void };

const validationMessage =
  "Completa fecha, importe y necesario en las filas incluidas.";
const leaveImportMessage =
  "La importación en curso se perderá si sales de esta sección. ¿Continuar?";
const resetStepMessage =
  "Si vuelves a este paso se perderá la importación en curso. ¿Continuar?";

const steps: Array<{ id: WizardStep; label: string }> = [
  { id: "bank", label: "Banco" },
  { id: "file", label: "Archivo" },
  { id: "complete", label: "Completar" },
  { id: "review", label: "Revisar" },
];

function mapParsedRows(rows: ParsedImportRow[]): ImportWizardRow[] {
  return rows.map((row) => ({
    source_row: row.source_row,
    date: row.date ?? "",
    description: row.description,
    kind: row.kind ?? "gasto",
    amount: row.amount ?? 0,
    category: "",
    necessary: null,
    included: true,
    warnings: row.warnings,
  }));
}

function normalizeExtension(extension: string): string {
  return extension.replace(/^\./, "");
}

interface TableSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

function TableSelect({ children, className, ...props }: TableSelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-8 w-full appearance-none rounded-md border border-input bg-background px-2 pr-8 text-sm text-foreground shadow-sm outline-none transition-colors hover:bg-accent/40 focus:border-ring focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function KindTableSelect({
  value,
  onChange,
  ...props
}: Omit<TableSelectProps, "children"> & {
  value: MovementKind;
  onChange: SelectHTMLAttributes<HTMLSelectElement>["onChange"];
}) {
  const isIncome = value === "ingreso";

  return (
    <div className="relative">
      {isIncome ? (
        <ArrowUpRight className="pointer-events-none absolute left-2 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-success" />
      ) : (
        <ArrowDownRight className="pointer-events-none absolute left-2 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-danger" />
      )}
      <TableSelect
        className={cn("pl-7 font-medium", isIncome ? "text-success" : "text-danger")}
        value={value}
        onChange={onChange}
        {...props}
      >
        <option value="gasto">Gasto</option>
        <option value="ingreso">Ingreso</option>
      </TableSelect>
    </div>
  );
}

function toImportDraftRows(rows: ImportWizardRow[]): ImportDraftRow[] {
  return rows.map(({ warnings: _warnings, ...row }) => row);
}

export function ImportDataPage() {
  const [providers, setProviders] = useState<ImportProvider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ImportProvider | null>(null);
  const [step, setStep] = useState<WizardStep>("bank");
  const [draftRows, setDraftRows] = useState<ImportWizardRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [duplicates, setDuplicates] = useState<ImportDuplicate[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showRowValidation, setShowRowValidation] = useState(false);
  const [leavePrompt, setLeavePrompt] = useState<LeavePrompt | null>(null);
  const { toast } = useToast();
  const setDirty = useWorkbook((state) => state.setDirty);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      setLoading(true);
      setError(null);
      try {
        const [loadedProviders, loadedCategories] = await Promise.all([
          api.listImportProviders(),
          api.listCategories(),
        ]);
        if (!active) return;
        setProviders(loadedProviders);
        setCategories(loadedCategories);
      } catch (e) {
        if (!active) return;
        setError("No se pudo cargar la configuración de importación.");
        toast({ title: "Error", description: String(e), variant: "destructive" });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      active = false;
    };
  }, [toast]);

  const hasParsedImport = draftRows.length > 0;
  const hasWizardProgress = selectedProvider !== null || step !== "bank" || hasParsedImport;
  const isWideStep = step === "complete";
  const requestLeaveConfirmation = useCallback(
    (message: string, onContinue: () => void) => {
      setLeavePrompt({ message, onContinue });
    },
    [],
  );

  useEffect(() => {
    if (!hasWizardProgress) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasWizardProgress]);

  useEffect(() => {
    if (!hasWizardProgress) return;

    const handleLeaveRequest = (event: Event) => {
      event.preventDefault();
      const detail = (event as CustomEvent<LeaveImportFlowDetail>).detail;
      requestLeaveConfirmation(leaveImportMessage, detail?.onContinue ?? (() => {}));
    };

    window.addEventListener(LEAVE_IMPORT_FLOW_EVENT, handleLeaveRequest);
    return () => window.removeEventListener(LEAVE_IMPORT_FLOW_EVENT, handleLeaveRequest);
  }, [hasWizardProgress, requestLeaveConfirmation]);

  const includedRows = useMemo(
    () => draftRows.filter((row) => row.included),
    [draftRows],
  );
  const includedTotal = useMemo(
    () => includedRows.reduce((total, row) => total + row.amount, 0),
    [includedRows],
  );
  const usedNewCategories = useMemo(() => {
    const addedByLower = new Map(
      newCategories.map((category) => [category.toLocaleLowerCase(), category]),
    );
    const used = new Map<string, string>();

    includedRows.forEach((row) => {
      const category = row.category.trim();
      const addedCategory = addedByLower.get(category.toLocaleLowerCase());
      if (addedCategory && !used.has(addedCategory.toLocaleLowerCase())) {
        used.set(addedCategory.toLocaleLowerCase(), addedCategory);
      }
    });

    return Array.from(used.values());
  }, [includedRows, newCategories]);

  const previewMovements = useMemo(
    () =>
      includedRows.map((row, index) => ({
        id: `import-${row.source_row}`,
        row: index + 1,
        date: row.date,
        category: row.category.trim(),
        kind: row.kind,
        amount: row.amount,
        necessary: row.necessary === true,
        description: row.description,
        raw_date: null,
        dirty: false,
      })),
    [includedRows],
  );

  const selectProvider = (provider: ImportProvider) => {
    setSelectedProvider(provider);
    setError(null);
  };

  const confirmProvider = () => {
    if (!selectedProvider) return;
    setStep("file");
    setError(null);
  };

  const parseFile = async (path: string) => {
    if (!selectedProvider) return;
    setParsing(true);
    setError(null);
    try {
      const parsedRows = await api.parseImportFile(selectedProvider.id, path);
      setDraftRows(mapParsedRows(parsedRows));
      setSelectedRows(new Set());
      setDuplicates([]);
      setStep("complete");
    } catch (e) {
      setError("No se pudo leer el archivo seleccionado.");
      toast({ title: "Error al importar", description: String(e), variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const chooseFile = async () => {
    if (!selectedProvider) return;
    const path = await open({
      multiple: false,
      filters: [
        {
          name: selectedProvider.name,
          extensions: selectedProvider.accepted_extensions.map(normalizeExtension),
        },
      ],
    });

    if (typeof path === "string") {
      await parseFile(path);
    }
  };

  const updateRow = (sourceRow: number, patch: Partial<ImportDraftRow>) => {
    setDraftRows((current) =>
      current.map((row) => (row.source_row === sourceRow ? { ...row, ...patch } : row)),
    );
  };

  const toggleSelectedRow = (sourceRow: number, checked: boolean) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (checked) next.add(sourceRow);
      else next.delete(sourceRow);
      return next;
    });
  };

  const markSelectedRowsNecessary = (necessary: boolean) => {
    if (selectedRows.size === 0) return;
    setDraftRows((current) =>
      current.map((row) =>
        selectedRows.has(row.source_row) ? { ...row, necessary } : row,
      ),
    );
  };

  const setSelectedRowsIncluded = (included: boolean) => {
    if (selectedRows.size === 0) return;
    setDraftRows((current) =>
      current.map((row) =>
        selectedRows.has(row.source_row) ? { ...row, included } : row,
      ),
    );
  };

  const toggleAllRowsSelection = (checked: boolean) => {
    setSelectedRows(checked ? new Set(draftRows.map((row) => row.source_row)) : new Set());
  };

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const exists = categories.some(
      (category) => category.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    );

    if (!exists) {
      setCategories((current) => [...current, { name: trimmed }]);
      setNewCategories((current) =>
        current.some((name) => name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())
          ? current
          : [...current, trimmed],
      );
    }
    setNewCategory("");
  };

  const reviewImport = async () => {
    const invalid = includedRows.some(
      (row) => !row.date || row.amount <= 0 || row.necessary === null,
    );

    if (invalid) {
      setShowRowValidation(true);
      setError(validationMessage);
      return;
    }

    setShowRowValidation(false);
    setReviewing(true);
    setError(null);
    try {
      const detectedDuplicates = await api.detectImportDuplicates(toImportDraftRows(includedRows));
      setDuplicates(detectedDuplicates);
      setStep("review");
    } catch (e) {
      setError("No se pudo revisar la importación.");
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setReviewing(false);
    }
  };

  const clearDraftImport = () => {
    setDraftRows([]);
    setSelectedRows(new Set());
    setDuplicates([]);
    setNewCategories([]);
    setNewCategory("");
    setError(null);
    setShowRowValidation(false);
  };

  const resetWizard = () => {
    setSelectedProvider(null);
    clearDraftImport();
    setStep("bank");
  };

  const goToStep = (targetStep: WizardStep) => {
    if (targetStep === step) return;

    const currentIndex = steps.findIndex((item) => item.id === step);
    const targetIndex = steps.findIndex((item) => item.id === targetStep);
    if (targetIndex > currentIndex) return;

    const clearsParsedImport = hasParsedImport && ["bank", "file"].includes(targetStep);
    const applyStep = () => {
      if (clearsParsedImport) {
        clearDraftImport();
        if (targetStep === "bank") {
          setSelectedProvider(null);
        }
      }

      setStep(targetStep);
    };

    if (clearsParsedImport) {
      requestLeaveConfirmation(resetStepMessage, applyStep);
      return;
    }

    applyStep();
  };

  const confirmImport = async () => {
    if (!selectedProvider) return;
    setConfirming(true);
    setError(null);
    try {
      const result = await api.confirmImport({
        provider_id: selectedProvider.id,
        rows: toImportDraftRows(includedRows),
        new_categories: usedNewCategories,
      });
      setDirty(true);
      toast({
        title: "Importación completada",
        description: `${result.imported_count} movimientos importados.`,
        variant: "success",
      });
      resetWizard();
    } catch (e) {
      setError("No se pudo confirmar la importación.");
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const cancelLeavePrompt = () => setLeavePrompt(null);

  const confirmLeavePrompt = () => {
    const action = leavePrompt?.onContinue;
    setLeavePrompt(null);
    action?.();
  };

  return (
    <>
    <div className={cn("mx-auto w-full space-y-4", isWideStep ? "max-w-[1500px]" : "max-w-4xl")}>
      <div className="space-y-3">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Importar datos</h1>
          <p className="text-sm text-muted-foreground">
            Completa los movimientos antes de escribirlos en el libro activo.
          </p>
        </div>
        <nav aria-label="Pasos de importación" className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-2">
            {steps.map((item) => {
              const itemIndex = steps.findIndex((candidate) => candidate.id === item.id);
              const currentIndex = steps.findIndex((candidate) => candidate.id === step);
              const isActive = item.id === step;
              const canVisit = itemIndex <= currentIndex;

              return (
                <Button
                  key={item.id}
                  aria-label={`Ir al paso ${item.label}`}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  disabled={!canVisit}
                  onClick={() => goToStep(item.id)}
                >
                  {item.label}
                </Button>
              );
            })}
          </div>
        </nav>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 pt-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando importación...
          </CardContent>
        </Card>
      ) : (
        <>
          {step === "bank" && (
            <Card>
              <CardHeader>
                <CardTitle>Selecciona un banco</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="mx-auto grid w-full max-w-2xl gap-3">
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => selectProvider(provider)}
                      className={`rounded-md border p-4 text-left transition-colors hover:bg-accent ${
                        selectedProvider?.id === provider.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{provider.name}</div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {provider.description}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Formatos: {provider.accepted_extensions.join(", ")}
                          </p>
                        </div>
                        {selectedProvider?.id === provider.id && <Check className="h-4 w-4" />}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mx-auto flex w-full max-w-2xl justify-end">
                  <Button onClick={confirmProvider} disabled={!selectedProvider}>
                    Usar banco
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "file" && selectedProvider && (
            <Card>
              <CardHeader>
                <CardTitle>Selecciona el archivo</CardTitle>
              </CardHeader>
              <CardContent className="mx-auto w-full max-w-2xl space-y-4">
                <p className="text-sm text-muted-foreground">
                  Elige una exportación de {selectedProvider.name} con extensión{" "}
                  {selectedProvider.accepted_extensions.join(", ")}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={chooseFile} disabled={parsing}>
                    {parsing ? <Loader2 className="animate-spin" /> : <Upload />}
                    Seleccionar archivo
                  </Button>
                  {import.meta.env.MODE === "test" && (
                    <Button
                      variant="outline"
                      onClick={() => parseFile("test-import-file.xls")}
                      disabled={parsing}
                    >
                      <FileSpreadsheet />
                      Usar archivo de prueba
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === "complete" && (
            <Card>
              <CardHeader>
                <CardTitle>Completar movimientos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markSelectedRowsNecessary(true)}
                    >
                      Marcar selección como necesario
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markSelectedRowsNecessary(false)}
                    >
                      Marcar selección como no necesario
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRowsIncluded(true)}
                    >
                      Incluir selección
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRowsIncluded(false)}
                    >
                      Excluir selección
                    </Button>
                    <span className="self-center text-xs text-muted-foreground">
                      {selectedRows.size} seleccionadas
                    </span>
                  </div>

                  <div className="flex w-full gap-2 sm:w-auto">
                    <Input
                      aria-label="Nueva categoría"
                      placeholder="Nueva categoría"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.currentTarget.value)}
                    />
                    <Button type="button" variant="outline" onClick={addCategory}>
                      <Plus />
                      Añadir categoría
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[1216px] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[52px]" />
                      <col className="w-[132px]" />
                      <col className="w-[360px]" />
                      <col className="w-[120px]" />
                      <col className="w-[112px]" />
                      <col className="w-[230px]" />
                      <col className="w-[142px]" />
                      <col className="w-[68px]" />
                    </colgroup>
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 text-left">
                          <Checkbox
                            aria-label="Seleccionar o deseleccionar todas las filas"
                            checked={
                              draftRows.length > 0 && selectedRows.size === draftRows.length
                            }
                            onCheckedChange={(checked) =>
                              toggleAllRowsSelection(checked === true)
                            }
                          />
                        </th>
                        <th className="px-2 py-2 text-left">Fecha</th>
                        <th className="px-2 py-2 text-left">Descripción</th>
                        <th className="px-2 py-2 text-left">Tipo</th>
                        <th className="px-2 py-2 text-left">Importe</th>
                        <th className="px-2 py-2 text-left">Categoría</th>
                        <th className="px-2 py-2 text-left">Necesario</th>
                        <th className="px-2 py-2 text-left">Incluir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftRows.map((row) => (
                        <Fragment key={row.source_row}>
                          <tr className="border-t">
                            <td className="px-2 py-2">
                              <Checkbox
                                aria-label={`Seleccionar fila ${row.source_row}`}
                                checked={selectedRows.has(row.source_row)}
                                onCheckedChange={(checked) =>
                                  toggleSelectedRow(row.source_row, checked === true)
                                }
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                className={cn(
                                  "h-8 px-2",
                                  showRowValidation && row.included && !row.date && "border-destructive text-destructive focus-visible:ring-destructive"
                                )}
                                aria-label={`Fecha fila ${row.source_row}`}
                                type="date"
                                value={row.date}
                                onChange={(e) =>
                                  updateRow(row.source_row, { date: e.currentTarget.value })
                                }
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                className="h-8 px-2"
                                aria-label={`Descripción fila ${row.source_row}`}
                                value={row.description}
                                onChange={(e) =>
                                  updateRow(row.source_row, { description: e.currentTarget.value })
                                }
                              />
                            </td>
                            <td className="px-2 py-2">
                              <KindTableSelect
                                aria-label={`Tipo fila ${row.source_row}`}
                                value={row.kind}
                                onChange={(e) =>
                                  updateRow(row.source_row, {
                                    kind: e.currentTarget.value as MovementKind,
                                  })
                                }
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                className={cn(
                                  "h-8 px-2",
                                  showRowValidation && row.included && (!row.amount || row.amount <= 0) && "border-destructive text-destructive focus-visible:ring-destructive"
                                )}
                                aria-label={`Importe fila ${row.source_row}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.amount || ""}
                                onChange={(e) =>
                                  updateRow(row.source_row, {
                                    amount: Number(e.currentTarget.value),
                                  })
                                }
                              />
                            </td>
                            <td className="px-2 py-2">
                              <TableSelect
                                aria-label={`Categoría fila ${row.source_row}`}
                                value={row.category}
                                onChange={(e) =>
                                  updateRow(row.source_row, { category: e.currentTarget.value })
                                }
                              >
                                <option value="">Selecciona</option>
                                {categories.map((category) => (
                                  <option key={category.name} value={category.name}>
                                    {category.name}
                                  </option>
                                ))}
                              </TableSelect>
                            </td>
                            <td className="px-2 py-2">
                              <TableSelect
                                className={cn(
                                  showRowValidation && row.included && row.necessary === null && "border-destructive text-destructive focus-visible:ring-destructive"
                                )}
                                aria-label={`Necesario fila ${row.source_row}`}
                                value={row.necessary === null ? "" : String(row.necessary)}
                                onChange={(e) =>
                                  updateRow(row.source_row, {
                                    necessary:
                                      e.currentTarget.value === ""
                                        ? null
                                        : e.currentTarget.value === "true",
                                  })
                                }
                              >
                                <option value="">Pendiente</option>
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                              </TableSelect>
                            </td>
                            <td className="px-2 py-2">
                              <Checkbox
                                aria-label={`Incluir fila ${row.source_row}`}
                                checked={row.included}
                                onCheckedChange={(checked) =>
                                  updateRow(row.source_row, { included: checked === true })
                                }
                              />
                            </td>
                          </tr>
                          {row.warnings.length > 0 && (
                            <tr className="border-t bg-amber-500/10">
                              <td colSpan={8} className="px-3 py-2 text-xs text-amber-300">
                                <span className="font-medium">Avisos fila {row.source_row}</span>
                                <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                  {row.warnings.map((warning) => (
                                    <li key={warning}>{warning}</li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <Button onClick={reviewImport} disabled={reviewing || includedRows.length === 0}>
                    {reviewing && <Loader2 className="animate-spin" />}
                    Revisar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "review" && selectedProvider && (
            <Card>
              <CardHeader>
                <CardTitle>Revisar importación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Movimientos incluidos</p>
                    <p className="text-lg font-semibold">{includedRows.length}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Total importado</p>
                    <p className="text-lg font-semibold">{formatEuro(includedTotal)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Posibles duplicados</p>
                    <p className="text-lg font-semibold">{duplicates.length}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Categorías nuevas</p>
                    <p className="text-lg font-semibold">{usedNewCategories.length}</p>
                  </div>
                </div>

                {duplicates.length > 0 && (
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Duplicados detectados</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {duplicates.map((duplicate) => (
                        <li key={`${duplicate.source_row}-${duplicate.movement_id}`}>
                          Fila {duplicate.source_row}: {duplicate.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <MovementsTable
                  movements={previewMovements}
                  emptyText="No hay movimientos incluidos."
                  showActions={false}
                  sort={false}
                  asCard={false}
                />

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep("complete")}>
                    Volver
                  </Button>
                  <Button onClick={confirmImport} disabled={confirming}>
                    {confirming && <Loader2 className="animate-spin" />}
                    Confirmar importación
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
    <Dialog open={leavePrompt !== null} onOpenChange={(open) => !open && cancelLeavePrompt()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Descartar importación</DialogTitle>
          <DialogDescription>{leavePrompt?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={cancelLeavePrompt}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmLeavePrompt}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
