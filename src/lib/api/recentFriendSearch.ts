import { api8000 } from "@/src/lib/api/client";
import type { RelationshipInfo } from "@/src/types/friends";

export type RecentFriendSearchType = "spot_id" | "spot_nickname";

export type RecentFriendSearchRequest = {
  display_text: string;
  profile_photo: string | null;
  search_type: RecentFriendSearchType;
  target_id: number;
};

export type ApiRecentFriendSearchItem = {
  recent_search_id: number;
  display_text: string;
  profile_photo?: string | null;
  search_type: RecentFriendSearchType | string;
  target_id: number;
  spot_id?: string | null;
  spot_nickname?: string | null;
  one_line?: string | null;
  relationship: RelationshipInfo;
  created_at: string;
};

export type SaveRecentFriendSearchResponse = {
  message: string;
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
): Promise<SaveRecentFriendSearchResponse> {
  const res = await api8000.post<SaveRecentFriendSearchResponse>(
    "/friends/recent-search",
    payload,
  );

  return res.data;
}
