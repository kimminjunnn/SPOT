// src/stores/useSavedPlacesStore.ts
import { create } from "zustand";
import type { Place } from "@/src/types/place";
import { fetchMyNewSavedPlaces } from "../lib/api/places";

type SavedPlacesStore = {
  savedList: Place[];
  savedLoading: boolean;
  savedError: string | null;

  setSavedList: (items: Place[]) => void;
  setSavedLoading: (v: boolean) => void;
  setSavedError: (msg: string | null) => void;
  resetSaved: () => void;

  applyBookmarkFromPlace: (place: Place, willBookmark: boolean) => void;
  refreshSavedPlaces: (coords: { lat: number; lng: number }) => Promise<void>;
};

export const useSavedPlacesStore = create<SavedPlacesStore>((set) => ({
  savedList: [],
  savedLoading: false,
  savedError: null,

  setSavedList: (items) => set({ savedList: items }),
  setSavedLoading: (v) => set({ savedLoading: v }),
  setSavedError: (msg) => set({ savedError: msg }),

  resetSaved: () =>
    set({
      savedList: [],
      savedLoading: false,
      savedError: null,
    }),

  applyBookmarkFromPlace: (place, willBookmark) =>
    set((state) => {
      const exists = state.savedList.some((p) => p.placeId === place.placeId);

      // 언북마크 → 새로고침 전까지 리스트에 남기고 flag만 끈다
      if (exists) {
        return {
          ...state,
          savedList: state.savedList.map((p) =>
            p.placeId === place.placeId
              ? { ...p, isBookmarked: willBookmark }
              : p,
          ),
        };
      }

      if (!willBookmark) {
        return {
          ...state,
        };
      }

      // 등록 + 없음 → 리스트 맨 앞에 추가
      return {
        ...state,
        savedList: [{ ...place, isBookmarked: true }, ...state.savedList],
      };
    }),

  refreshSavedPlaces: async ({ lat, lng }) => {
    try {
      set({ savedLoading: true, savedError: null });
      const list = await fetchMyNewSavedPlaces({ lat, lng });
      set({
        savedList: list,
        savedLoading: false,
      });
    } catch {
      set({
        savedLoading: false,
        savedError: "저장한 장소를 불러오는데 실패했습니다.",
      });
    }
  },
}));
