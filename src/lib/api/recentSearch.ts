import { api8080 } from "@/src/lib/api/client";

export type RecentSearchResponseItem = {
  id?: string | number | null;
  rid?: string | number | null;
  recentId?: string | number | null;
  keyword?: string | null;
  term?: string | null;
  q?: string | null;
};

export async function fetchRecentSearches(options?: {
  signal?: AbortSignal;
}): Promise<RecentSearchResponseItem[]> {
  const res = await api8080.get<RecentSearchResponseItem[]>("/recent", {
    signal: options?.signal,
  });

  return Array.isArray(res.data) ? res.data : [];
}

export async function createRecentSearch(
  keyword: string,
): Promise<RecentSearchResponseItem> {
  const res = await api8080.post<RecentSearchResponseItem>("/recent", {
    keyword,
  });

  return res.data;
}

export async function deleteRecentSearch(keyword: string): Promise<void> {
  const encoded = encodeURIComponent(keyword);
  await api8080.delete(`/recent/${encoded}`);
}
