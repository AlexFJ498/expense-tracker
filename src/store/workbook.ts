import { create } from "zustand";
import { api } from "../lib/api";
import type { WorkbookState } from "../lib/types";

interface WorkbookStore {
  state: WorkbookState | null;
  loading: boolean;
  saving: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  create: (path: string) => Promise<void>;
  import_: (path: string) => Promise<void>;
  close: () => Promise<void>;
  save: () => Promise<void>;
  setDirty: (dirty: boolean) => void;
}

export const useWorkbook = create<WorkbookStore>((set) => ({
  state: null,
  loading: false,
  saving: false,
  error: null,

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
}));
