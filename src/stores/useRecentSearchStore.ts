// src/stores/useRecentSearchStore.ts
import { create } from "zustand";
import {
  createRecentSearch,
  deleteRecentSearch,
  fetchRecentSearches,
  type RecentSearchResponseItem,
} from "@/src/lib/api/recentSearch";

export type RecentItem = { id: string; keyword: string };

type State = {
  items: RecentItem[];
  loading: boolean;
  error: string | null;
  _abort?: AbortController | null;
};

type Actions = {
  fetch: () => Promise<void>;
  add: (keyword: string) => Promise<void>;
  remove: (keyword: string, idHint?: string) => Promise<void>; // ← 변경: keyword 필수, idHint 옵션
  clear: () => void;
};

const genId = (prefix = "gen") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalize = (it: RecentSearchResponseItem): RecentItem | null => {
  const keyword = String(it?.keyword ?? it?.term ?? it?.q ?? "").trim();
  if (!keyword) return null;
  const idRaw = it?.id ?? it?.rid ?? it?.recentId;
  const id = String(idRaw ?? genId("srv"));
  return { id, keyword };
};

export const useRecentSearchStore = create<State & Actions>((set, get) => ({
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
      const data = await fetchRecentSearches({ signal: controller.signal });
      const list = data
        .map(normalize)
        .filter(Boolean) as RecentItem[];
      set({ items: list });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED") {
        set({ error: e?.message ?? "recent fetch failed", items: [] });
      }
    } finally {
      if (get()._abort === controller) set({ _abort: null, loading: false });
      else set({ loading: false });
    }
  },

  add: async (keyword: string) => {
    const { items } = get();
    const tempId = genId("tmp");
    const optimistic: RecentItem = { id: tempId, keyword };
    // 중복 허용: 그냥 앞에 붙임
    set({ items: [optimistic, ...items] });

    try {
      const data = await createRecentSearch(keyword);
      const created = normalize(data) ?? { id: genId("srv"), keyword };
      set((s) => ({
        items: s.items.map((it) => (it.id === tempId ? created : it)),
      }));
    } catch {
      // 실패 시 그대로 두고 로그만 — 필요 시 롤백 가능
    }
  },

  //  keyword 기반 삭제 API 사용
  remove: async (keyword: string, idHint?: string) => {
    const backup = get().items;

    // 낙관 업데이트: 같은 키워드 중 "클릭한 1개"만 지우고 싶다면 idHint로 한 개만 제거
    if (idHint) {
      set({ items: backup.filter((x) => x.id !== idHint) });
    } else {
      // id가 없으면 동일 키워드 중 첫 번째만 제거
      const idx = backup.findIndex((x) => x.keyword === keyword);
      if (idx >= 0) {
        const next = backup.slice();
        next.splice(idx, 1);
        set({ items: next });
      }
    }

    try {
      // 서버는 keyword 기준으로 처리 → 동일 키워드 여러 개를 지울 수도 있음(서버 정책)
      await deleteRecentSearch(keyword);
    } catch {
      // 실패 시 롤백
      set({ items: backup });
    }
  },

  clear: () => set({ items: [] }),
}));
