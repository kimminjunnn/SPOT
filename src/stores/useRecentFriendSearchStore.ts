import { create } from "zustand";
import {
  createRecentFriendSearch,
  fetchRecentFriendSearches,
  type ApiRecentFriendSearchItem,
  type RecentFriendSearchType,
} from "@/src/lib/api/recentFriendSearch";

export type RecentFriendItem = {
  id: string;
  keyword: string;
  profileImageUrl?: string | null;
  searchType?: RecentFriendSearchType;
  targetId?: number | null;
};

type AddRecentFriendInput = {
  displayText: string;
  profilePhoto?: string | null;
  searchType?: RecentFriendSearchType;
  targetId?: number | null;
  viewerId?: number | null;
};

type State = {
  items: RecentFriendItem[];
  loading: boolean;
  error: string | null;
  _abort?: AbortController | null;
};

type Actions = {
  fetch: () => Promise<void>;
  add: (input: AddRecentFriendInput) => Promise<void>;
  remove: (id: string) => void;
  clear: () => void;
};

const genId = (prefix = "gen") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getKeywordKey = (keyword: string) => keyword.trim().toLocaleLowerCase();

const dedupeByKeyword = (items: RecentFriendItem[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKeywordKey(item.keyword);
    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const normalize = (
  item: ApiRecentFriendSearchItem,
): RecentFriendItem | null => {
  const keyword = String(item?.display_text ?? "").trim();
  if (!keyword) return null;

  const idRaw = item?.id ?? item?.recent_id;
  const searchType =
    item?.search_type === "spot_id" || item?.search_type === "nickname"
      ? item.search_type
      : undefined;

  return {
    id: String(idRaw ?? genId("srv")),
    keyword,
    profileImageUrl: item?.profile_photo ?? null,
    searchType,
    targetId: item?.target_id ?? null,
  };
};

const guessSearchType = (displayText: string): RecentFriendSearchType =>
  /^[A-Za-z0-9_]+$/.test(displayText.trim()) ? "spot_id" : "nickname";

export const useRecentFriendSearchStore = create<State & Actions>(
  (set, get) => ({
    items: [],
    loading: false,
    error: null,
    _abort: null,

    fetch: async () => {
      const prevAbort = get()._abort;
      if (prevAbort) prevAbort.abort();

      const controller = new AbortController();
      set({ loading: true, error: null, _abort: controller });

      try {
        const data = await fetchRecentFriendSearches({
          signal: controller.signal,
        });
        const list = dedupeByKeyword(
          data.map(normalize).filter(Boolean) as RecentFriendItem[],
        ).slice(0, 10);

        set({ items: list });
      } catch (e: any) {
        if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
          set({ error: e?.message ?? "recent friend fetch failed", items: [] });
        }
      } finally {
        if (get()._abort === controller) set({ _abort: null, loading: false });
        else set({ loading: false });
      }
    },

    add: async (input) => {
      const displayText = input.displayText.trim();
      if (!displayText) return;

      const tempId = genId("tmp");
      const searchType = input.searchType ?? guessSearchType(displayText);
      const optimistic: RecentFriendItem = {
        id: tempId,
        keyword: displayText,
        profileImageUrl: input.profilePhoto ?? null,
        searchType,
        targetId: input.targetId ?? null,
      };

      set((state) => ({
        items: dedupeByKeyword([optimistic, ...state.items]).slice(0, 10),
      }));

      try {
        const data = await createRecentFriendSearch({
          display_text: displayText,
          profile_photo: input.profilePhoto ?? null,
          search_type: searchType,
          target_id: input.targetId ?? null,
          viewer_id: input.viewerId ?? null,
        });
        const created = normalize(data) ?? optimistic;

        set((state) => ({
          items: dedupeByKeyword(
            state.items.map((item) => (item.id === tempId ? created : item)),
          ).slice(0, 10),
        }));
      } catch {
        // 최근 검색 저장 실패는 검색 자체를 막지 않는다.
      }
    },

    remove: (id) =>
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),

    clear: () => set({ items: [] }),
  }),
);
