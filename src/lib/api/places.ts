import { api8080, api8001 } from "@/src/lib/api/client";
import type {
  ApiMainMePlace,
  ApiPlace,
  ApiMapPlace,
  Place,
  ApiPlaceMoreResponse,
} from "@/src/types/place";
import {
  mapApiPlacesToPlaces,
  mapHomePlaceItemsToPlaces,
} from "@/src/lib/mappers/placeMapper";

export async function fetchMapPlaces(params: {
  latitude: number;
  longitude: number;
  radius?: number;
}): Promise<ApiMapPlace[]> {
  const { latitude, longitude } = params;

  const res = await api8001.get<ApiMainMePlace[]>("/main/me/places", {
    params: { lat: latitude, lng: longitude },
  });

  return res.data.map((place) => ({
    placeId: place.placeId,
    gid: place.gId,
    latitude: place.latitude,
    longitude: place.longitude,
    list: place.list,
    name: place.name,
  }));
}

/** /main/me/places 저장한 장소 */
export async function fetchMyNewSavedPlaces(params: {
  lat: number;
  lng: number;
}): Promise<Place[]> {
  const { lat, lng } = params;

  const res = await api8001.get<ApiMainMePlace[]>("/main/me/places", {
    params: { lat, lng },
  });

  console.log(res.data);

  return mapHomePlaceItemsToPlaces(res.data, {
    currentLat: lat,
    currentLng: lng,
  });
}

/** /popular 인기 장소 */
export async function fetchHotPlaces(params: {
  lat: number;
  lng: number;
  page?: number;
  size?: number;
}): Promise<Place[]> {
  const { lat, lng, page = 0, size = 10 } = params;

  const res = await api8080.get<ApiPlace[]>("/popular", {
    params: { lat, lng, page, size },
  });

  return mapApiPlacesToPlaces(res.data, {
    currentLat: lat,
    currentLng: lng,
  });
}

/** /distance 거리순 */
export async function fetchPlacesByDistance(params: {
  lat: number;
  lng: number;
}): Promise<Place[]> {
  const { lat, lng } = params;

  try {
    const res = await api8080.get<ApiPlace[]>("/distance", {
      params: { lat, lng },
    });

    console.log("[/distance] ", res.data);

    return mapApiPlacesToPlaces(res.data, {
      currentLat: lat,
      currentLng: lng,
    });
  } catch (err: any) {
    console.error("[/distance] ERROR", {
      message: err?.message,
      status: err?.response?.status,
      data: err?.response?.data,
    });
    throw err;
  }
}

/** /more API */
export async function fetchPlaceMore(params: {
  lat: number;
  lng: number;
  placeId: number;
}): Promise<ApiPlaceMoreResponse> {
  const { lat, lng, placeId } = params;

  try {
    const res = await api8080.get<ApiPlaceMoreResponse>("/more", {
      params: { lat, lng, placeId },
    });
    console.log("/more API 응답결과", res.data);
    console.log("savers:", JSON.stringify(res.data.places.savers));
    return res.data;
  } catch (err: any) {
    console.error("[/more] ERROR", {
      message: err?.message,
      status: err?.response?.status,
      data: err?.response?.data,
    });
    throw err;
  }
}

/** 8001 /places 장소 저장 */
export async function savePlaces(params: {
  placeIds: number[];
  saveType: "instagram" | "spot";
  sourceType: "instagram" | "search" | "friend_profile" | "comment";
  sourceUserId?: number | null;
  sourceCommentId?: number | null;
}): Promise<void> {
  const {
    placeIds,
    saveType,
    sourceType,
    sourceUserId = null,
    sourceCommentId = null,
  } = params;

  try {
    await api8001.post("/places", {
      place_ids: placeIds,
      save_type: saveType,
      source_type: sourceType,
      source_user_id: sourceUserId,
      source_comment_id: sourceCommentId,
    });
  } catch (err: any) {
    console.error("[POST /places] ERROR", {
      message: err?.message,
      status: err?.response?.status,
      data: err?.response?.data,
    });
    throw err;
  }
}
