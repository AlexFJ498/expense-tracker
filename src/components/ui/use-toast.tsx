import * as React from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

type ToastVariant = "default" | "destructive" | "success";

interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  action?: React.ReactNode;
}

type Ctx = {
  toast: (item: Omit<ToastItem, "id">) => void;
};

const ToastCtx = React.createContext<Ctx | null>(null);

export function useToast() {
  const c = React.useContext(ToastCtx);
  if (!c) throw new Error("useToast must be used within <Toaster>");
  return c;
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((item: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, ...item }]);
  }, []);

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      <ToastProvider>
        {children}
        {items.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            duration={t.durationMs ?? 4500}
            onOpenChange={(open) => {
              if (!open) remove(t.id);
            }}
          >
            <div className="grid gap-0.5">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
              {t.action && <div className="mt-2">{t.action}</div>}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastCtx.Provider>
  );
}
