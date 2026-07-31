// src/stores/useAnalyzeResultStore.ts
import { create } from "zustand";
import type { SavePlaceItem } from "@/src/components/bottomSheet/SavePlacesBottomSheet";

export type AnalyzeMeta = {
  sourceUrl?: string;
  receivedAt?: number;
};

export type AnalyzeResultBatch = {
  id: string;
  places: SavePlaceItem[];
  meta: AnalyzeMeta;
  selectedIds: string[];
};

type AnalyzeResultStore = {
  batches: AnalyzeResultBatch[];
  currentIndex: number;

  openWithPlaces: (places: SavePlaceItem[], meta?: AnalyzeMeta) => void;
  goPrevious: () => void;
  goNext: () => void;
  updateSelection: (batchId: string, selectedIds: string[]) => void;
  completeCurrent: () => void;
  clear: () => void;
};

let nextBatchSequence = 0;

function createBatchId(receivedAt: number) {
  nextBatchSequence += 1;
  return `${receivedAt}-${nextBatchSequence}`;
}

export const useAnalyzeResultStore = create<AnalyzeResultStore>((set) => ({
  batches: [],
  currentIndex: 0,

  openWithPlaces: (places, meta) => {
    if (!places.length) return;

    const receivedAt = meta?.receivedAt ?? Date.now();
    const batch: AnalyzeResultBatch = {
      id: createBatchId(receivedAt),
      places,
      meta: { receivedAt, ...(meta ?? {}) },
      selectedIds: [],
    };

    console.log("[analyze-store] enqueue", batch.id, places.length);
    set((state) => ({
      batches: [...state.batches, batch],
      currentIndex: state.batches.length === 0 ? 0 : state.currentIndex,
    }));
  },

  goPrevious: () => {
    set((state) => ({
      currentIndex: Math.max(0, state.currentIndex - 1),
    }));
  },

  goNext: () => {
    set((state) => ({
      currentIndex: Math.min(
        Math.max(0, state.batches.length - 1),
        state.currentIndex + 1,
      ),
    }));
  },

  updateSelection: (batchId, selectedIds) => {
    set((state) => ({
      batches: state.batches.map((batch) =>
        batch.id === batchId ? { ...batch, selectedIds } : batch,
      ),
    }));
  },

  completeCurrent: () => {
    set((state) => {
      if (!state.batches.length) return state;

      const batches = state.batches.filter(
        (_, index) => index !== state.currentIndex,
      );

      return {
        batches,
        currentIndex: Math.min(
          state.currentIndex,
          Math.max(0, batches.length - 1),
        ),
      };
    });
  },

  clear: () => {
    console.log("[analyze-store] clear all");
    set({ batches: [], currentIndex: 0 });
  },
}));
