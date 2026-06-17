import { useEffect, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { useToast } from "./ui/use-toast";
import { api } from "../lib/api";
import { useLanguage } from "../lib/i18n";
import type { Category, Movement, MovementInput, MovementKind } from "../lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editing: Movement | null;
  onSaved: () => void;
  onDeleted: () => void;
}

export function MovementForm({
  open,
  onOpenChange,
  categories,
  editing,
  onSaved,
  onDeleted,
}: Props) {
  const [date, setDate] = useState<string>("");
  const [kind, setKind] = useState<MovementKind>("gasto");
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [necessary, setNecessary] = useState<boolean | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      if (editing) {
        setDate(editing.date);
        setKind(editing.kind);
        setCategory(editing.category);
        setAmount(editing.amount.toString().replace(".", ","));
        setNecessary(editing.necessary);
        setDescription(editing.description);
      } else {
        const today = new Date();
        const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        setDate(iso);
        setKind("gasto");
        setCategory(categories[0]?.name ?? "");
        setAmount("");
        setNecessary(null);
        setDescription("");
      }
    }
  }, [open, editing, categories]);

  const submit = async () => {
    const amountNum = parseFloat(amount.replace(",", "."));
    if (!date || Number.isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: t("form.invalidData"),
        description: t("form.invalidDataDesc"),
        variant: "destructive",
      });
      return;
    }
    const input: MovementInput = {
      date,
      kind,
      category,
      amount: amountNum,
      necessary,
      description,
    };
    setBusy(true);
    try {
      if (editing) {
        await api.updateMovement(editing.id, input);
      } else {
        await api.createMovement(input);
        // Apply rules to the newly created movement
        try {
          await api.applyRulesToMovements();
        } catch {
          // Best-effort, don't block the user
        }
      }
      toast({
        title: editing ? t("form.updated") : t("form.created"),
        variant: "success",
      });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: t("form.error"),
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    if (!confirm(t("form.confirmDelete"))) return;
    setBusy(true);
    try {
      await api.deleteMovement(editing.id);
      toast({ title: t("form.deleted"), variant: "success" });
      onDeleted();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: t("form.error"),
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("form.editTitle") : t("form.newTitle")}</DialogTitle>
          <DialogDescription>
            {editing
              ? t("form.editDesc")
              : t("form.newDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">{t("form.date")}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.currentTarget.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kind">{t("form.kind")}</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as MovementKind)}>
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasto">{t("form.expense")}</SelectItem>
                  <SelectItem value="ingreso">{t("form.income")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">{t("form.category")}</Label>
            <Select
              value={category || "__none__"}
              onValueChange={(v) => setCategory(v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder={t("form.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("form.noCategory")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">{t("form.amount")}</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder={t("form.amountPlaceholder")}
              value={amount}
              onChange={(e) => setAmount(e.currentTarget.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{t("form.description")}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("form.necessary")}</Label>
            <Select
              value={necessary === null ? "unset" : String(necessary)}
              onValueChange={(v) =>
                setNecessary(v === "unset" ? null : v === "true")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">{t("form.unassigned")}</SelectItem>
                <SelectItem value="true">{t("form.yes")}</SelectItem>
                <SelectItem value="false">{t("form.no")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {editing && (
            <Button variant="outline" onClick={remove} disabled={busy} className="text-danger">
              <Trash2 />
              {t("form.delete")}
            </Button>
          )}
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            {t("form.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}