// src/lib/api/profile.ts
import { api8000, api8001 } from "@/src/lib/api/client";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
};

export type ApiProfile = {
  id: number;
  kakao_id: string;
  nickname: string;
  spot_id: string;
  spot_nickname: string;
  one_line: string | null;
  photo: string | null;
};

export type GetProfileResponse = ApiEnvelope<{
  profile: ApiProfile;
  friend_count: number;
  recent_friend_photos: string[];
}>;

export type MyProfile = {
  id: number;
  kakaoId: string;
  nickname: string;
  spotId: string;
  spotNickname: string;
  oneLine: string | null;
  photo: string | null;
};

export type MyProfileBundle = {
  profile: MyProfile;
  friendCount: number;
  recentFriendPhotos: string[];
};

export async function getMyProfile(): Promise<MyProfileBundle | null> {
  try {
    const res = await api8000.get<GetProfileResponse>("/profile");
    const data = res.data?.data;
    const p = data?.profile;
    if (!p) return null;

    return {
      profile: {
        id: p.id,
        kakaoId: p.kakao_id,
        nickname: p.nickname,
        spotId: p.spot_id,
        spotNickname: p.spot_nickname,
        oneLine: p.one_line ?? null,
        photo: p.photo,
      },
      friendCount: Number(data.friend_count ?? 0),
      recentFriendPhotos: Array.isArray(data.recent_friend_photos)
        ? data.recent_friend_photos
        : [],
    };
  } catch (e) {
    if (__DEV__) {
      console.log("getMyProfile error:", e);
    }
    return null;
  }
}

/**
 * GET /settings/blocklist
 * data: { total, blocks: [{ id, member_id, friend_id, status, updated_at }] }
 */
export type ApiBlockItem = {
  id: number;
  member_id: number;
  friend_id: number;
  status: string;
  updated_at: string;
};

export type BlockListResponse = ApiEnvelope<{
  total: number;
  blocks: ApiBlockItem[];
}>;

export type BlockItem = {
  id: number;
  memberId: number;
  friendId: number;
  status: string;
  updatedAt: string;
};

export async function getBlocklist(): Promise<{
  total: number;
  blocks: BlockItem[];
}> {
  try {
    const res = await api8000.get<BlockListResponse>("/settings/blocklist");
    const raw = Array.isArray(res.data?.data?.blocks)
      ? res.data.data.blocks
      : [];

    return {
      total: Number(res.data?.data?.total ?? raw.length),
      blocks: raw.map((b) => ({
        id: b.id,
        memberId: b.member_id,
        friendId: b.friend_id,
        status: b.status,
        updatedAt: b.updated_at,
      })),
    };
  } catch {
    return { total: 0, blocks: [] };
  }
}

/**
 * PATCH /profile (multipart/form-data)
 * body:
 * - spot_id (required)
 * - spot_nickname (required)
 * - one_line (optional)
 * - file (optional, binary)
 */
export type UpdateProfileResponse = ApiEnvelope<{
  spot_id: string;
  spot_nickname: string;
  one_line: string | null;
  photo: string | null;
}>;

export type UploadFile = {
  uri: string; // expo file uri
  name?: string;
  type?: string; // e.g. "image/jpeg"
};

export type UpdateMyProfilePayload = {
  spotId: string;
  spotNickname: string;
  oneLine?: string | null;
  file?: UploadFile | null;
};

export async function updateMyProfile(
  payload: UpdateMyProfilePayload,
): Promise<UpdateProfileResponse["data"] | null> {
  try {
    const form = new FormData();

    form.append("spot_id", payload.spotId);
    form.append("spot_nickname", payload.spotNickname);

    // one_line은 optional (null 가능)
    if (payload.oneLine !== undefined) {
      form.append("one_line", payload.oneLine ?? "");
    }

    // file optional
    if (payload.file?.uri) {
      form.append("file", {
        uri: payload.file.uri,
        name: payload.file.name ?? "profile.jpg",
        type: payload.file.type ?? "image/jpeg",
      } as any);
    }

    const res = await api8000.patch<UpdateProfileResponse>("/profile", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (__DEV__) {
      console.log("payload 전체:", payload);
    }
    if (__DEV__) {
      console.log(res.data);
    }
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

export type CheckSpotIdResponse = {
  can_use_id: boolean;
  message: string;
  status: string;
};

export async function checkSpotId(
  spotId: string,
): Promise<CheckSpotIdResponse | null> {
  try {
    const res = await api8001.get<CheckSpotIdResponse>("/profile/id_check", {
      params: { spot_id: spotId },
    });

    return res.data ?? null;
  } catch {
    return null;
  }
}
