// src/stores/useSavedPlacesStore.ts
import { create } from "zustand";
import { updatePlaceBookmark } from "@/src/lib/updatePlaceBookmark";
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
      const updated = updatePlaceBookmark(
        state.savedList,
        place.placeId,
        willBookmark,
      );
      if (updated !== state.savedList) return { savedList: updated };
      if (!willBookmark || state.savedList.some((p) => p.placeId === place.placeId)) {
        return state;
      }
      return { savedList: [{ ...place, isBookmarked: true }, ...state.savedList] };
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
