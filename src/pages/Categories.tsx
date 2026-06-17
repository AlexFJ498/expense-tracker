import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Tag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import type { Category, Movement } from "../lib/types";
import { useToast } from "../components/ui/use-toast";
import { useWorkbook } from "../store/workbook";
import { useLanguage } from "../lib/i18n";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const setDirty = useWorkbook((s) => s.setDirty);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    const [cats, movs] = await Promise.all([
      api.listCategories(),
      api.listMovements({}),
    ]);
    setCategories(cats);
    setMovements(movs);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movements) {
      map.set(m.category, (map.get(m.category) ?? 0) + 1);
    }
    return map;
  }, [movements]);

  const onAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await api.createCategory(name);
      setNewName("");
      setDirty(true);
      toast({ title: t("categories.created"), variant: "success" });
      await load();
    } catch (e) {
      toast({
        title: t("categories.error"),
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (name: string) => {
    const count = usage.get(name) ?? 0;
    if (count > 0) {
      toast({
        title: t("categories.cannotDelete"),
        description: t("categories.cannotDeleteDesc", { name, count }),
        variant: "destructive",
      });
      return;
    }
    if (!confirm(t("categories.confirmDelete", { name }))) return;
    try {
      await api.deleteCategory(name);
      setDirty(true);
      toast({ title: t("categories.deleted"), variant: "success" });
      await load();
    } catch (e) {
      toast({
        title: t("categories.error"),
        description: String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("categories.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("categories.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("categories.newPlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAdd();
              }}
            />
            <Button onClick={onAdd} disabled={busy || !newName.trim()}>
              {busy ? <Loader2 className="animate-spin" /> : <Plus />}
              {t("categories.add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="divide-y">
          {categories.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              {t("categories.empty")}
            </div>
          ) : (
            categories.map((c) => {
              const count = usage.get(c.name) ?? 0;
              return (
                <div
                  key={c.name}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {count === 0 ? t("categories.noUsage") : `${count} ${t("categories.movements")}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(c.name)}
                    disabled={count > 0}
                    className="text-muted-foreground hover:text-danger"
                    title={count > 0 ? t("categories.inUse") : t("categories.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}