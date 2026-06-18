import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { useLanguage, type Lang } from "../lib/i18n";
import { THEMES, useTheme, type ThemeId } from "./ThemeProvider";
import { Coffee, Download, Github, Info, Palette, RefreshCw } from "lucide-react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type SettingsTab = "appearance" | "updates" | "about";
type UpdateStatus = "idle" | "checking" | "upToDate" | "updateAvailable" | "downloading" | "installing" | "error";

const VERSION = "v1.0.5";

const TABS: { id: SettingsTab; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "appearance", icon: Palette },
  { id: "updates", icon: RefreshCw },
  { id: "about", icon: Info },
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AppearancePanel() {
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("settings.appearanceDesc")}</p>
      <Separator />
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("settings.language")}</Label>
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
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("settings.theme")}</Label>
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
  );
}

function UpdatesPanel() {
  const { t } = useLanguage();
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    body: string;
    date?: string;
  } | null>(null);

  const checkUpdates = async () => {
    setUpdateStatus("checking");
    setUpdateInfo(null);
    try {
      const update = await check();
      if (update) {
        setUpdateInfo({
          version: update.version,
          body: update.body ?? "",
          date: update.date,
        });
        setUpdateStatus("updateAvailable");
      } else {
        setUpdateStatus("upToDate");
      }
    } catch {
      setUpdateStatus("error");
    }
  };

  const installUpdate = async () => {
    setUpdateStatus("downloading");
    try {
      const update = await check();
      if (update) {
        setUpdateStatus("installing");
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch {
      setUpdateStatus("error");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("settings.updatesDesc")}</p>
      <Separator />
      <p className="text-sm">{t("settings.updatesVersion", { version: VERSION })}</p>

      {updateStatus === "updateAvailable" && updateInfo && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <p className="text-sm font-semibold">
            v{updateInfo.version}
            {updateInfo.date && (
              <span className="text-xs text-muted-foreground ml-2">
                {updateInfo.date}
              </span>
            )}
          </p>
          {updateInfo.body && (
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              {updateInfo.body}
            </p>
          )}
        </div>
      )}

      {(updateStatus === "updateAvailable" ||
        updateStatus === "downloading" ||
        updateStatus === "installing") && (
        <Button
          size="sm"
          onClick={installUpdate}
          disabled={updateStatus === "downloading" || updateStatus === "installing"}
        >
          <Download
            className={`h-4 w-4 mr-1.5 ${updateStatus === "downloading" ? "animate-pulse" : ""}`}
          />
          {updateStatus === "downloading"
            ? "Downloading…"
            : updateStatus === "installing"
              ? "Installing…"
              : "Install update"}
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={checkUpdates}
        disabled={updateStatus === "checking" || updateStatus === "downloading" || updateStatus === "installing"}
      >
        <RefreshCw
          className={`h-4 w-4 mr-1.5 ${updateStatus === "checking" ? "animate-spin" : ""}`}
        />
        {updateStatus === "checking"
          ? t("settings.updatesChecking")
          : t("settings.checkUpdates")}
      </Button>
      {updateStatus === "upToDate" && (
        <p className="text-xs text-green-600 dark:text-green-400">
          {t("settings.updatesUpToDate")}
        </p>
      )}
      {updateStatus === "error" && (
        <p className="text-xs text-destructive">{t("settings.updatesError")}</p>
      )}
    </div>
  );
}

function AboutPanel() {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("settings.aboutDesc")}</p>
      <Separator />
      <div>
        <p className="text-sm font-semibold">{t("sidebar.appName")}</p>
        <p className="text-xs text-muted-foreground">
          {t("settings.aboutVersion", { version: VERSION })}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.open("https://github.com/AlexFJ498/control-de-gastos", "_blank");
          }}
        >
          <Github className="h-4 w-4 mr-1.5" />
          {t("settings.aboutRepo")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.open("https://buymeacoffee.com/alexfj498", "_blank");
          }}
        >
          <Coffee className="h-4 w-4 mr-1.5" />
          {t("settings.aboutSupport")}
        </Button>
      </div>
    </div>
  );
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<SettingsTab>("appearance");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-5 py-2 min-h-[220px]">
          <nav className="flex flex-col gap-1 w-40 shrink-0">
            {TABS.map(({ id, icon: Icon }) => (
              <Button
                key={id}
                variant={tab === id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTab(id)}
                className="justify-start"
              >
                <Icon className="h-4 w-4 mr-2" />
                {t(`settings.${id}`)}
              </Button>
            ))}
          </nav>

          <div className="flex-1 min-w-0">
            {tab === "appearance" && <AppearancePanel />}
            {tab === "updates" && <UpdatesPanel />}
            {tab === "about" && <AboutPanel />}
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
