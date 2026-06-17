import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { useLanguage, type Lang } from "../lib/i18n";
import { THEMES, useTheme, type ThemeId } from "./ThemeProvider";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.language")} & {t("settings.theme").toLowerCase()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("settings.language")}</Label>
            <div className="flex gap-2">
              {(["es", "en"] as Lang[]).map((l) => (
                <Button
                  key={l}
                  variant={lang === l ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLang(l)}
                >
                  {l === "es" ? "Español" : "English"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("settings.theme")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(({ id, label }) => (
                <Button
                  key={id}
                  variant={theme === id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme(id as ThemeId)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("settings.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
