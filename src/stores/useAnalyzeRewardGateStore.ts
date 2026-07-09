import { create } from "zustand";

type AnalyzeRewardGateState = {
  visible: boolean;
  pendingUrl: string | null;
  ticketId: string | null;
  loading: boolean;
  error: string | null;
  open: (url: string, ticketId?: string | null) => void;
  close: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
};

export const useAnalyzeRewardGateStore = create<AnalyzeRewardGateState>(
  (set) => ({
    visible: false,
    pendingUrl: null,
    ticketId: null,
    loading: false,
    error: null,

    open: (url, ticketId = null) =>
      set({
        visible: true,
        pendingUrl: url,
        ticketId,
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
        ticketId: null,
        loading: false,
        error: null,
      }),
  }),
);
