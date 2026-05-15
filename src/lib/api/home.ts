// src/lib/api/home.ts
import { api8080, api8001 } from "@/src/lib/api/client";
import {
  type HomePlaceItem,
  type HomeCommentItem,
} from "@/src/components/home/types";
/** -----------------------------
 *  MAP 탭 (/main, /main/me, /main/{userId})
 *  ----------------------------- */
export type HomeMainPlace = {
  id: number;
  name: string;
  imageUrl: string;
  commentCount: number;
  lat: number;
  lng: number;
  distance: number;
};

export type HomeMainResponse = {
  friends: { id: number; nickname: string; profileImageUrl: string }[];
  places: HomeMainPlace[];
};

export type HomeUserPlace = {
  placeId: number;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  list?: string | null;
};

export type HomeUserResponse = {
  spotNickname: string;
  email: string;
  info: string;
  places: HomeUserPlace[];
};

type HomePlaceApiItem = Omit<HomePlaceItem, "lat" | "lng"> &
  Partial<Pick<HomePlaceItem, "lat" | "lng">> & {
    latitude?: number;
    longitude?: number;
  };

function normalizeHomePlaceItem(item: HomePlaceApiItem): HomePlaceItem {
  return {
    ...item,
    lat: Number(item.lat ?? item.latitude),
    lng: Number(item.lng ?? item.longitude),
  } as HomePlaceItem;
}

function normalizeHomePlaceItems(data: HomePlaceApiItem[]): HomePlaceItem[] {
  return data.map(normalizeHomePlaceItem);
}

// /main/home
export async function fetchHomeMain(params: {
  lat: number;
  lng: number;
  distance: number;
}) {
  const res = await api8001.get<HomeMainResponse>("/main/home", { params });
  console.log(res.data);
  return res.data;
}

// /main/me/home
export async function fetchHomeMe(params: {
  lat: number;
  lng: number;
  distance: number;
}) {
  const res = await api8001.get<HomeUserResponse>("/main/me/home", { params });
  return res.data;
}

// /main/{userId}
export async function fetchHomeUser(params: {
  userId: number;
  lat: number;
  lng: number;
  distance: number;
}) {
  const { userId, ...rest } = params;
  const res = await api8001.get<HomeUserPlace[]>(`/main/home/${userId}`, {
    params: rest,
  });
  console.log(res.data);
  return res.data;
}

/** -----------------------------
 *  PLACE 탭
 *  friends: /main/place
 *  me:      /main/me/places  (여기만 s)
 *  friend:  /main/place/{userId}
 *  (placeId param 제거했다고 가정)
 *  ----------------------------- */

// /main/place
export async function fetchHomePlacesMain(params: {
  lat: number;
  lng: number;
}) {
  const res = await api8001.get<HomePlaceApiItem[]>("/main/home/places", {
    params,
  });
  console.log(res);
  return normalizeHomePlaceItems(res.data);
}

// /main/me/places  (여기만 s)
export async function fetchHomePlacesMe(params: { lat: number; lng: number }) {
  const res = await api8001.get<HomePlaceApiItem[]>("/main/me/places", {
    params,
  });
  console.log(res);
  return normalizeHomePlaceItems(res.data);
}

// /main/place/{userId}
export async function fetchHomePlacesUser(params: {
  userId: number;
  lat: number;
  lng: number;
}) {
  const { userId, ...rest } = params;
  const res = await api8001.get<HomePlaceApiItem[]>(`/main/places/${userId}`, {
    params: rest,
  });
  console.log(res);
  return normalizeHomePlaceItems(res.data);
}

/** -----------------------------
 *  COMMENT 탭
 *  friends: /main/comment
 *  me:      /main/me/comment
 *  friend:  /main/comment/{userId}
 *  (placeId param 제거했다고 가정)
 *  ----------------------------- */

export async function fetchHomeCommentsMain(params: {
  lat: number;
  lng: number;
  page?: number;
  size?: number;
}) {
  const res = await api8080.get<HomeCommentItem[]>("/main/comment", { params });
  return res.data;
}

export async function fetchHomeCommentsMe(params: {
  lat: number;
  lng: number;
  page?: number;
  size?: number;
}) {
  const res = await api8080.get<HomeCommentItem[]>("/main/me/comments", {
    params,
  });
  return res.data;
}

export async function fetchHomeCommentsUser(params: {
  userId: number;
  lat: number;
  lng: number;
  page?: number;
  size?: number;
}) {
  const { userId, ...rest } = params;
  const res = await api8080.get<HomeCommentItem[]>(`/main/comment/${userId}`, {
    params: rest,
  });
  return res.data;
}
