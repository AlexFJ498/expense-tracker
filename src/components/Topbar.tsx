import { Save, FolderOpen, Circle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useWorkbook } from "../store/workbook";
import { useToast } from "./ui/use-toast";
import { requestImportFlowLeave } from "../lib/navigationGuard";

export function Topbar() {
  const state = useWorkbook((s) => s.state);
  const saving = useWorkbook((s) => s.saving);
  const save = useWorkbook((s) => s.save);
  const close = useWorkbook((s) => s.close);
  const { toast } = useToast();

  const onSave = async () => {
    try {
      await save();
      toast({ title: "Guardado", description: "Cambios escritos en el Excel.", variant: "success" });
    } catch (e) {
      toast({
        title: "Error al guardar",
        description: String(e),
        variant: "destructive",
      });
    }
  };

  const onClose = () => {
    if (requestImportFlowLeave(close)) {
      close();
    }
  };

  return (
    <header className="h-14 border-b px-5 flex items-center justify-between bg-card/40">
      <div className="flex items-center gap-3">
        {state?.dirty ? (
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <Circle className="h-2 w-2 fill-amber-400 text-amber-400" />
            Cambios sin guardar
          </div>
        ) : state?.last_saved ? (
          <div className="text-xs text-muted-foreground">Guardado</div>
        ) : (
          <div className="text-xs text-muted-foreground">—</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!state?.dirty || saving}
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Guardar
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <FolderOpen />
          Cambiar Excel
        </Button>
      </div>
    </header>
  );
}
