import { useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { FilePlus2, FolderOpen, Loader2, Wallet } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useWorkbook } from "../store/workbook";
import { useToast } from "../components/ui/use-toast";

export function OnboardingPage() {
  const create = useWorkbook((s) => s.create);
  const import_ = useWorkbook((s) => s.import_);
  const state = useWorkbook((s) => s.state);
  const [busy, setBusy] = useState<"create" | "import" | null>(null);
  const { toast } = useToast();

  const onImport = async () => {
    setBusy("import");
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (!path) return;
      await import_(path as string);
      toast({ title: "Excel importado", description: path as string, variant: "success" });
    } catch (e) {
      toast({
        title: "No se pudo importar",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const onCreate = async () => {
    setBusy("create");
    try {
      const path = await save({
        defaultPath: "control-de-gastos.xlsx",
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (!path) return;
      await create(path);
      toast({ title: "Excel creado", description: path, variant: "success" });
    } catch (e) {
      toast({
        title: "No se pudo crear",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-6 overflow-auto">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Control de Gastos</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Tu Excel es la fuente de verdad. Crea uno nuevo o abre el existente.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={busy ? undefined : onCreate}
          >
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <FilePlus2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-foreground text-base">Crear nuevo Excel</CardTitle>
              <CardDescription>
                Comienza desde cero con la estructura estándar y categorías por defecto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={busy !== null}>
                {busy === "create" ? <Loader2 className="animate-spin" /> : <FilePlus2 />}
                Crear Excel
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={busy ? undefined : onImport}
          >
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-foreground text-base">Importar existente</CardTitle>
              <CardDescription>
                Abre tu Excel actual. Se validará y saneará automáticamente si es necesario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary" disabled={busy !== null}>
                {busy === "import" ? <Loader2 className="animate-spin" /> : <FolderOpen />}
                Abrir Excel
              </Button>
            </CardContent>
          </Card>
        </div>

        {state?.recents && state.recents.length > 0 && (
          <div className="mt-8">
            <div className="text-xs font-medium text-muted-foreground mb-2">Recientes</div>
            <div className="space-y-1">
              {state.recents.slice(0, 5).map((p) => (
                <button
                  key={p}
                  className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-accent transition-colors truncate"
                  onClick={async () => {
                    try {
                      await import_(p);
                    } catch (e) {
                      toast({
                        title: "No se pudo abrir",
                        description: String(e),
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
