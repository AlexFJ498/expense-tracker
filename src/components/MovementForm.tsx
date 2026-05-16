import { useEffect, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
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
  const [necessary, setNecessary] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (editing) {
        setDate(editing.date);
        setKind(editing.kind);
        setCategory(editing.category);
        setAmount(editing.amount.toString().replace(".", ","));
        setNecessary(editing.necessary);
      } else {
        const today = new Date();
        const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        setDate(iso);
        setKind("gasto");
        setCategory(categories[0]?.name ?? "");
        setAmount("");
        setNecessary(false);
      }
    }
  }, [open, editing, categories]);

  const submit = async () => {
    const amountNum = parseFloat(amount.replace(",", "."));
    if (!date || Number.isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Datos inválidos",
        description: "Introduce una fecha y un importe positivo.",
        variant: "destructive",
      });
      return;
    }
    if (!category) {
      toast({
        title: "Categoría requerida",
        description: "Selecciona una categoría.",
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
    };
    setBusy(true);
    try {
      if (editing) {
        await api.updateMovement(editing.id, input);
      } else {
        await api.createMovement(input);
      }
      toast({
        title: editing ? "Movimiento actualizado" : "Movimiento creado",
        variant: "success",
      });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Error",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    if (!confirm("¿Eliminar este movimiento? No se podrá deshacer.")) return;
    setBusy(true);
    try {
      await api.deleteMovement(editing.id);
      toast({ title: "Movimiento eliminado", variant: "success" });
      onDeleted();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Error",
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
          <DialogTitle>{editing ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Modifica los datos y guarda los cambios."
              : "Añade un ingreso o gasto al registro."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.currentTarget.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kind">Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as MovementKind)}>
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasto">Gasto</SelectItem>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Importe (€)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.currentTarget.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="necessary"
              checked={necessary}
              onCheckedChange={(v) => setNecessary(v === true)}
            />
            <Label htmlFor="necessary" className="text-foreground cursor-pointer">
              Marcar como necesario
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {editing && (
            <Button variant="outline" onClick={remove} disabled={busy} className="text-danger">
              <Trash2 />
              Eliminar
            </Button>
          )}
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
