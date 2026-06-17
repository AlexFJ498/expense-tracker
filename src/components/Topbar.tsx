import { Settings, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";
import { useWorkbook } from "../store/workbook";
import { useLanguage } from "../lib/i18n";

interface TopbarProps {
  onOpenSettings: () => void;
}

export function Topbar({ onOpenSettings }: TopbarProps) {
  const close = useWorkbook((s) => s.close);
  const { t } = useLanguage();

  const onClose = () => {
    close();
  };

  return (
    <header className="h-14 border-b px-5 flex items-center justify-between bg-card/40">
      <div className="flex items-center gap-3">
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          aria-label={t("topbar.settings")}
        >
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <FolderOpen />
          {t("topbar.changeExcel")}
        </Button>
      </div>
    </header>
  );
}
