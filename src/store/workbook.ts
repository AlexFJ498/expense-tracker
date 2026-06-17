import { create } from "zustand";
import { api } from "../lib/api";
import type { Movement, WorkbookState } from "../lib/types";

interface WorkbookStore {
  state: WorkbookState | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  undoSnapshot: Movement[] | null;

  refresh: () => Promise<void>;
  create: (path: string) => Promise<void>;
  import_: (path: string) => Promise<void>;
  close: () => Promise<void>;
  save: () => Promise<void>;
  copy: (path: string) => Promise<void>;
  setDirty: (dirty: boolean) => void;
  captureUndo: (movements: Movement[]) => void;
  performUndo: () => Promise<void>;
  clearUndo: () => void;
}

export const useWorkbook = create<WorkbookStore>((set, get) => ({
  state: null,
  loading: false,
  saving: false,
  error: null,
  undoSnapshot: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const state = await api.getWorkbookState();
      set({ state, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  create: async (path: string) => {
    set({ loading: true, error: null });
    try {
      const state = await api.createWorkbook(path);
      set({ state, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },

  import_: async (path: string) => {
    set({ loading: true, error: null });
    try {
      const state = await api.importWorkbook(path);
      set({ state, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },

  close: async () => {
    set({ loading: true, error: null });
    try {
      const state = await api.closeWorkbook();
      set({ state, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  save: async () => {
    set({ saving: true, error: null });
    try {
      const state = await api.saveWorkbook();
      set({ state, saving: false });
    } catch (e) {
      set({ error: String(e), saving: false });
      throw e;
    }
  },

  setDirty: (dirty: boolean) =>
    set((prev) => ({
      state: prev.state ? { ...prev.state, dirty } : prev.state,
    })),

  captureUndo: (movements: Movement[]) => {
    set({ undoSnapshot: movements });
  },

  performUndo: async () => {
    const snapshot = get().undoSnapshot;
    if (!snapshot) return;
    set({ saving: true, undoSnapshot: null });
    try {
      const current = await api.listMovements({});
      const ids = current.map((m) => m.id);
      if (ids.length > 0) {
        await api.deleteMovements(ids);
      }
      for (const m of snapshot) {
        await api.createMovement({
          date: m.date,
          category: m.category,
          kind: m.kind,
          amount: m.amount,
          necessary: m.necessary,
          description: m.description,
        });
      }
      const state = await api.saveWorkbook();
      set({ state, saving: false });
    } catch (e) {
      set({ error: String(e), saving: false });
      throw e;
    }
  },

  clearUndo: () => {
    set({ undoSnapshot: null });
  },

  copy: async (path: string) => {
    set({ loading: true, error: null });
    try {
      const state = await api.copyWorkbook(path);
      set({ state, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },
}));
