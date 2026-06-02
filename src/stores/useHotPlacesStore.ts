import { create } from "zustand";
import type { Place } from "@/src/types/place";
import { fetchHotPlaces } from "@/src/lib/api/places";

const HOT_PLACES_PAGE_SIZE = 10;

type HotPlacesStore = {
  hotList: Place[];
  hotLoading: boolean;
  hotLoadingMore: boolean;
  hotError: string | null;
  hotPage: number;
  hotHasMore: boolean;

  setHotList: (items: Place[]) => void;
  setHotLoading: (v: boolean) => void;
  setHotError: (msg: string | null) => void;

  resetHot: () => void;
  refreshHotPlaces: (coords: { lat: number; lng: number }) => Promise<void>;
  loadMoreHotPlaces: (coords: { lat: number; lng: number }) => Promise<void>;

  // (선택) 북마크 UI 즉시 반영용
  applyHotBookmarkFromPlace: (place: Place, willBookmark: boolean) => void;
};

const mergeUniquePlaces = (prev: Place[], next: Place[]) => {
  const seen = new Set(prev.map((place) => place.id));
  const merged = [...prev];

  next.forEach((place) => {
    if (seen.has(place.id)) return;
    seen.add(place.id);
    merged.push(place);
  });

  return merged;
};

export const useHotPlacesStore = create<HotPlacesStore>((set, get) => ({
  hotList: [],
  hotLoading: false,
  hotLoadingMore: false,
  hotError: null,
  hotPage: 0,
  hotHasMore: true,

  setHotList: (items) => set({ hotList: items }),
  setHotLoading: (v) => set({ hotLoading: v }),
  setHotError: (msg) => set({ hotError: msg }),

  resetHot: () =>
    set({
      hotList: [],
      hotLoading: false,
      hotLoadingMore: false,
      hotError: null,
      hotPage: 0,
      hotHasMore: true,
    }),

  refreshHotPlaces: async ({ lat, lng }) => {
    try {
      set({
        hotLoading: true,
        hotLoadingMore: false,
        hotError: null,
        hotPage: 0,
        hotHasMore: true,
      });
      const list = await fetchHotPlaces({
        lat,
        lng,
        page: 0,
        size: HOT_PLACES_PAGE_SIZE,
      });
      set({
        hotList: list,
        hotLoading: false,
        hotPage: 0,
        hotHasMore: list.length === HOT_PLACES_PAGE_SIZE,
      });
    } catch {
      set({
        hotLoading: false,
        hotLoadingMore: false,
        hotError: "인기 장소를 불러오는데 실패했습니다.",
      });
    }
  },

  loadMoreHotPlaces: async ({ lat, lng }) => {
    const { hotLoading, hotLoadingMore, hotHasMore, hotPage } = get();
    if (hotLoading || hotLoadingMore || !hotHasMore) return;

    const nextPage = hotPage + 1;

    try {
      set({ hotLoadingMore: true, hotError: null });
      const list = await fetchHotPlaces({
        lat,
        lng,
        page: nextPage,
        size: HOT_PLACES_PAGE_SIZE,
      });
      set((state) => ({
        hotList: mergeUniquePlaces(state.hotList, list),
        hotLoadingMore: false,
        hotPage: nextPage,
        hotHasMore: list.length === HOT_PLACES_PAGE_SIZE,
      }));
    } catch {
      set({
        hotLoadingMore: false,
        hotError: "인기 장소를 더 불러오는데 실패했습니다.",
      });
    }
  },

  applyHotBookmarkFromPlace: (place, willBookmark) =>
    set((state) => ({
      ...state,
      hotList: state.hotList.map((p) =>
        p.placeId === place.placeId ? { ...p, isBookmarked: willBookmark } : p,
      ),
    })),
}));
