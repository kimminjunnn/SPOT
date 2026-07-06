import { create } from "zustand";

type AnalyzeRewardGateState = {
  visible: boolean;
  pendingUrl: string | null;
  loading: boolean;
  error: string | null;
  open: (url: string) => void;
  close: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
};

export const useAnalyzeRewardGateStore = create<AnalyzeRewardGateState>(
  (set) => ({
    visible: false,
    pendingUrl: null,
    loading: false,
    error: null,

    open: (url) =>
      set({
        visible: true,
        pendingUrl: url,
        loading: false,
        error: null,
      }),

    close: () =>
      set({
        visible: false,
        loading: false,
        error: null,
      }),

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    clear: () =>
      set({
        visible: false,
        pendingUrl: null,
        loading: false,
        error: null,
      }),
  }),
);
