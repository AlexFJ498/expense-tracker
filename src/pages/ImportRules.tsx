import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  FileSearch,
  Loader2,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { api } from "../lib/api";
import type { Category, ImportRule, RuleCombinator, RuleOperator } from "../lib/types";
import { useToast } from "../components/ui/use-toast";
import { cn } from "../lib/utils";

const MAX_RULES = 50;

const EMPTY_RULE: Omit<ImportRule, "id"> = {
  name: "",
  description: "",
  field: "concept" as const,
  operator: "contains" as RuleOperator,
  values: [""],
  combinator: "or" as RuleCombinator,
  category: "",
  necessary: null,
};

function CategoryInput({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(value.toLowerCase()),
  );

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setOpen(true);
        e.preventDefault();
        return;
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        select(filtered[highlightIndex].name);
      } else {
        setOpen(false);
        setHighlightIndex(-1);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < filtered.length - 1 ? prev + 1 : 0,
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filtered.length - 1,
      );
      return;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id="rule-category"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar o escribir categoría"
          autoComplete="off"
        />
        <ChevronDown
          className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-48 overflow-auto">
          {filtered.map((cat, i) => (
            <button
              key={cat.name}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                i === highlightIndex ? "bg-accent text-accent-foreground" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                select(cat.name);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  onEdit,
  onDelete,
  onExecute,
  executing,
}: {
  rule: ImportRule;
  onEdit: (rule: ImportRule) => void;
  onDelete: (id: string) => void;
  onExecute: (id: string) => void;
  executing: string | null;
}) {
  const isBusy = executing === rule.id;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <FileSearch className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{rule.name}</div>
          {rule.description && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {rule.description}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {rule.operator === "contains" ? "Contiene" : "Igual a"}{" "}
            {rule.values.length === 1 ? (
              <span className="font-mono">"{rule.values[0]}"</span>
            ) : (
              <span className="font-mono">
                ({rule.values.map((v) => `"${v}"`).join(rule.combinator === "or" ? " O " : " Y ")})
              </span>
            )}{" "}
            → {rule.category}
            {rule.necessary !== null && (
              <span className="ml-1">
                ({rule.necessary ? "Necesario" : "Prescindible"})
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onExecute(rule.id)}
          disabled={executing !== null}
          title="Ejecutar regla"
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onEdit(rule)} title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(rule.id)}
          title="Eliminar"
          className="text-muted-foreground hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ImportRulesPage() {
  const [rules, setRules] = useState<ImportRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ImportRule | null>(null);
  const [form, setForm] = useState<Omit<ImportRule, "id">>(EMPTY_RULE);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const toggleGroup = (category: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const load = useCallback(async () => {
    try {
      const [loadedRules, loadedCategories] = await Promise.all([
        api.listImportRules(),
        api.listCategories(),
      ]);
      setRules(loadedRules);
      setCategories(loadedCategories);
    } catch (e) {
      toast({ title: "Error al cargar las reglas", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    if (rules.length >= MAX_RULES) return;
    setEditingRule(null);
    setForm({ ...EMPTY_RULE });
    setDialogOpen(true);
  };

  const openEdit = (rule: ImportRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description,
      field: rule.field,
      operator: rule.operator,
      values: [...rule.values],
      combinator: rule.combinator,
      category: rule.category,
      necessary: rule.necessary,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const cleanValues = form.values.filter((v) => v.trim());
    if (!form.name.trim() || cleanValues.length === 0 || !form.category.trim()) return;
    const rule = { ...form, values: cleanValues };
    setSaving(true);
    try {
      if (editingRule) {
        const updated = await api.updateImportRule(editingRule.id, {
          ...editingRule,
          ...rule,
        });
        setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        toast({ title: "Regla actualizada", variant: "success" });
      } else {
        const created = await api.createImportRule(rule);
        setRules((prev) => [...prev, created]);
        toast({ title: "Regla creada", variant: "success" });
      }
      setDialogOpen(false);
    } catch (e) {
      toast({ title: "Error al guardar la regla", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteImportRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Regla eliminada", variant: "success" });
    } catch (e) {
      toast({ title: "Error al eliminar la regla", description: String(e), variant: "destructive" });
    }
    setDeleteConfirm(null);
  };

  const [executing, setExecuting] = useState<string | null>(null); // rule id, "all", or group key

  const applyRules = async (ruleIds?: string[], label?: string) => {
    setExecuting(ruleIds ? ruleIds.join(",") : "all");
    try {
      const results = await api.applyRulesToMovements(ruleIds);
      const applied = results.filter((r) => !r.skipped).length;
      const skipped = results.filter((r) => r.skipped).length;
      if (applied === 0 && skipped === 0) {
        toast({ title: "Sin cambios", description: "Ningún movimiento necesitaba actualización." });
      } else {
        const parts = [];
        if (applied > 0) parts.push(`${applied} movimiento(s) actualizado(s)`);
        if (skipped > 0) parts.push(`${skipped} conflicto(s)`);
        toast({
          title: label ? `Reglas aplicadas — ${label}` : "Reglas aplicadas",
          description: parts.join(", "),
        });
      }
    } catch (e) {
      toast({ title: "Error al aplicar reglas", description: String(e), variant: "destructive" });
    } finally {
      setExecuting(null);
    }
  };

  const filteredRules = rules.filter((rule) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      rule.name.toLowerCase().includes(q) ||
      rule.description.toLowerCase().includes(q)
    );
  });

  const groupedRules = useMemo(() => {
    const grouped = new Map<string, ImportRule[]>();
    for (const rule of filteredRules) {
      const key = rule.category || "Sin categoría";
      const list = grouped.get(key) || [];
      list.push(rule);
      grouped.set(key, list);
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRules]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando reglas…</div>;
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reglas de importación</h1>
          <p className="text-sm text-muted-foreground">
            Define reglas para auto-asignar categorías durante la importación.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rules.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyRules(undefined, "todas")}
              disabled={executing !== null}
            >
              {executing === "all" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Ejecutar todas
            </Button>
          )}
          <Button onClick={openCreate} disabled={rules.length >= MAX_RULES}>
            {rules.length >= MAX_RULES ? (
              "Límite de 50 reglas alcanzado"
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" /> Nueva regla
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      {rules.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o descripción…"
            className="pl-8"
          />
        </div>
      )}

      {/* Empty state */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <FileSearch className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground">No hay reglas todavía</p>
            <p className="mt-1">Crea una regla para auto-asignar categorías al importar.</p>
          </CardContent>
        </Card>
      ) : filteredRules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground">Sin resultados</p>
            <p className="mt-1">Ninguna regla coincide con "{search}".</p>
          </CardContent>
        </Card>
      ) : (
        /* ── Grouped mode ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {groupedRules.map(([category, categoryRules]) => {
              const isOpen = !!expandedGroups[category];
              return (
                <div
                  key={category}
                  className="rounded-xl border bg-card text-card-foreground shadow-sm"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroup(category);
                    }}
                    className="w-full px-4 py-2.5 border-b bg-muted/40 flex items-center gap-2 text-left hover:bg-muted/60 transition-colors rounded-t-xl"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isOpen ? "rotate-0" : "-rotate-90",
                      )}
                    />
                    <FileSearch className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground flex-1">
                      {category}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        applyRules(
                          categoryRules.map((r) => r.id),
                          category,
                        );
                      }}
                      disabled={executing !== null}
                      title={`Ejecutar grupo ${category}`}
                    >
                      {executing === categoryRules.map((r) => r.id).join(",") ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground font-normal">
                      {categoryRules.length}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="divide-y">
                      {categoryRules.map((rule) => (
                        <RuleRow
                          key={rule.id}
                          rule={rule}
                          onEdit={openEdit}
                          onDelete={(id) => setDeleteConfirm(id)}
                          onExecute={(id) => applyRules([id], rule.name)}
                          executing={executing}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar regla" : "Nueva regla"}</DialogTitle>
            <DialogDescription>
              {editingRule
                ? "Modifica esta regla de importación."
                : "Crea una regla para auto-asignar categorías al importar."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rule-name">Nombre</Label>
              <Input
                id="rule-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ej. Supermercado"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rule-description">Descripción</Label>
              <Input
                id="rule-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Notas opcionales"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Campo</Label>
                <Select
                  value={form.field}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, field: v as ImportRule["field"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concept">Concepto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Operador</Label>
                <Select
                  value={form.operator}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, operator: v as RuleOperator }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contiene</SelectItem>
                    <SelectItem value="equals">Igual a</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valores</Label>
              <div className="space-y-2">
                {form.values.map((v, i) => (
                  <div key={i} className="flex gap-1.5">
                    <Input
                      value={v}
                      onChange={(e) =>
                        setForm((f) => {
                          const next = [...f.values];
                          next[i] = e.target.value;
                          return { ...f, values: next };
                        })
                      }
                      placeholder={i === 0 ? "ej. mercadona" : "otro valor…"}
                    />
                    {form.values.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            values: f.values.filter((_, j) => j !== i),
                          }))
                        }
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({ ...f, values: [...f.values, ""] }))
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Añadir valor
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Combinador</Label>
              <Select
                value={form.combinator}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, combinator: v as RuleCombinator }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="or">O (cualquiera)</SelectItem>
                  <SelectItem value="and">Y (todos)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <CategoryInput
                value={form.category}
                onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                categories={categories}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Necesario</Label>
              <Select
                value={form.necessary === null ? "any" : form.necessary ? "yes" : "no"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    necessary: v === "any" ? null : v === "yes",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Cualquiera</SelectItem>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving || !form.name.trim() || form.values.every((v) => !v.trim()) || !form.category.trim()
              }
            >
              {saving ? <Loader2 className="animate-spin" /> : null}
              {editingRule ? "Guardar cambios" : "Crear regla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar regla</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar esta regla? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
