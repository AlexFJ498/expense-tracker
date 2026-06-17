import { Copy, FolderOpen, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { useWorkbook } from "../store/workbook";
import { useLanguage } from "../lib/i18n";
import { useToast } from "./ui/use-toast";

interface TopbarProps {
  onOpenSettings: () => void;
  onOpenOnboarding?: () => void;
}

export function Topbar({ onOpenSettings, onOpenOnboarding }: TopbarProps) {
  const { t } = useLanguage();
  const copy = useWorkbook((s) => s.copy);
  const { toast } = useToast();

  const onCopy = async () => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: "control-de-gastos-copia.xlsx",
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (!path) return;
      await copy(path as string);
      toast({ title: t("toast.copied"), description: path as string, variant: "success" });
    } catch (e) {
      toast({ title: t("toast.errorCopying"), description: String(e), variant: "destructive" });
    }
  };

  return (
    <header className="h-14 border-b px-5 flex items-center justify-between bg-card/40">
      <div className="flex items-center gap-3">
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="h-4 w-4 mr-1" />
          {t("topbar.copyExcel")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenOnboarding}
        >
          <FolderOpen />
          {t("topbar.changeExcel")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          aria-label={t("topbar.settings")}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}