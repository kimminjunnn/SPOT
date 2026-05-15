import { api8000 } from "@/src/lib/api/client";

export type RecentFriendSearchType = "spot_id" | "nickname";

export type RecentFriendSearchRequest = {
  display_text: string;
  profile_photo: string | null;
  search_type: RecentFriendSearchType;
  target_id: number | null;
  viewer_id: number | null;
};

export type ApiRecentFriendSearchItem = {
  id?: string | number | null;
  recent_id?: string | number | null;
  display_text?: string | null;
  profile_photo?: string | null;
  search_type?: RecentFriendSearchType | string | null;
  target_id?: number | null;
  viewer_id?: number | null;
};

export async function fetchRecentFriendSearches(options?: {
  signal?: AbortSignal;
}): Promise<ApiRecentFriendSearchItem[]> {
  const res = await api8000.get<
    ApiRecentFriendSearchItem[] | { results?: ApiRecentFriendSearchItem[] }
  >("/friends/recent-search", {
    signal: options?.signal,
  });

  if (Array.isArray(res.data)) return res.data;
  return Array.isArray(res.data?.results) ? res.data.results : [];
}

export async function createRecentFriendSearch(
  payload: RecentFriendSearchRequest,
): Promise<ApiRecentFriendSearchItem> {
  const res = await api8000.post<ApiRecentFriendSearchItem>(
    "/friends/recent-search",
    payload,
  );

  return res.data;
}
