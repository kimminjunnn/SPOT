// src/lib/api/friends.ts
import { api8000, api8001 } from "@/src/lib/api/client";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { type FriendStatus } from "@/src/types/friends";

export type ApiFriend = {
  comment: string | null;
  friend_id: number;
  mutual_count: number;
  mutual_profiles: string | null;
  nickname: string;
  profile_url: string | null;
  spot_id: string;
  status: string;
  updated_at: string;
};

export type FriendsListResponse = {
  friends: ApiFriend[];
};

export type Friend = {
  id: number;
  nickname: string;
  userId: string;
  avatarUrl?: string | null;
  updatedAt?: string;
  comment?: string | null;
  status?: string;
  mutualCount?: number;
  mutualProfiles?: string | null;
};

export type ApiFriendSearchItem = {
  highlighted_spot_id: string;
  highlighted_spot_nickname: string;
  id: number;
  one_line: string | null;
  profile_photo: string | null;
  spot_id: string;
  spot_nickname: string;
  follow_status: FriendStatus;
};

export async function fetchFriendsList(): Promise<Friend[]> {
  const res = await api8001.get<FriendsListResponse>("/friends/list");

  const raw = Array.isArray(res.data?.friends) ? res.data.friends : [];

  return raw.map((item) => ({
    id: item.friend_id,
    nickname: item.nickname,
    userId: item.spot_id,
    avatarUrl: item.profile_url,
    updatedAt: item.updated_at,
    comment: item.comment,
    status: item.status,
    mutualCount: item.mutual_count,
    mutualProfiles: item.mutual_profiles,
  }));
}

export type ApiFriendSearchResponse = {
  results: ApiFriendSearchItem[];
};

export type FriendSearchItem = {
  id: number;
  nickname: string;
  userId: string;
  profileImageUrl: string | null;
  oneLine: string | null;
  highlightedNickname?: string;
  highlightedUserId?: string;
  status: FriendStatus;
};

export type FriendRelationshipStatus =
  | "friend"
  | "waiting"
  | "block"
  | "none";

export type FriendStatusResponse = {
  friend_id: number;
  status: FriendRelationshipStatus;
};

const normalizeProfilePhoto = (profilePhoto: string | null) => {
  if (!profilePhoto) return null;
  if (
    profilePhoto.startsWith("http://") ||
    profilePhoto.startsWith("https://")
  ) {
    return profilePhoto;
  }

  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL_8000 ?? "";
  return `${baseUrl}${profilePhoto}`;
};

export async function searchFriends(
  keyword: string,
  signal?: AbortSignal,
): Promise<FriendSearchItem[]> {
  const res = await api8000.get<
    ApiFriendSearchResponse | ApiFriendSearchItem[]
  >("/friends/search", {
    params: { keyword },
    signal,
  });

  console.log("searchFriends raw res.data:", res.data);

  const raw = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.results)
      ? res.data.results
      : [];

  console.log("searchFriends normalized raw:", raw);

  return raw.map((item) => ({
    id: item.id,
    nickname: item.spot_nickname,
    userId: item.spot_id,
    profileImageUrl: normalizeProfilePhoto(item.profile_photo),
    oneLine: item.one_line,
    highlightedNickname: item.highlighted_spot_nickname,
    highlightedUserId: item.highlighted_spot_id,
    status: item.follow_status,
  }));
}

// 팔로우 신청
export async function sendFollowRequest(friend_id: number) {
  const res = await api8001.post(`/friends/follow/${friend_id}`);
  return res.data;
}

// 팔로우 수락
export async function acceptFollowRequest(friend_id: number) {
  const res = await api8001.post(`/friends/access_follow/${friend_id}`);
  return res.data;
}

// 특정 사용자와의 현재 관계 상태 조회
export async function getFriendStatus(friend_id: number) {
  const res = await api8001.get<FriendStatusResponse>(
    `/friends/status/${friend_id}`,
  );
  return res.data;
}

// 팔로우 거절
export async function declineFollowRequest(friend_id: number) {
  const res = await api8001.post(`/friends/decline_follow/${friend_id}`);
  return res.data;
}

export async function deleteFriend(friend_id: number) {
  const res = await api8001.delete(`/friends/${friend_id}`);
  return res.data;
}

export async function blockFriend(friend_id: number) {
  const res = await api8001.post(`/friends/block/${friend_id}`);
  return res.data;
}

export async function unblockFriend(friend_id: number) {
  const res = await api8001.post(`/friends/unblock/${friend_id}`);
  return res.data;
}
