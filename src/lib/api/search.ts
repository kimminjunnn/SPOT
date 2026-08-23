// src/lib/api/search.ts
import { api8080 } from "@/src/lib/api/client";
import type { SearchItem, SearchPayload } from "@/src/types/search";
import type { ApiPlace, Place } from "@/src/types/place";
import {
  mapApiPlaceToPlace,
  mapApiPlacesToPlaces,
} from "@/src/lib/mappers/placeMapper";

export async function fetchSearch(
  params: SearchPayload,
  options?: { signal?: AbortSignal }
): Promise<SearchItem[]> {
  const res = await api8080.get<SearchItem[]>("/search", {
    params,
    signal: options?.signal,
  });

  // 안전장치(서버가 이상한 값 줄 때 대비)
  return Array.isArray(res.data) ? res.data : [];
}

let inflight: AbortController | null = null;

/** /search/details (장소 목록) */
export async function fetchSearchDetails(params: {
  keyword: string;
  lat: number;
  lng: number;
}): Promise<Place[]> {
  const { keyword, lat, lng } = params;

  if (inflight) inflight.abort();
  inflight = new AbortController();

  const res = await api8080.get<ApiPlace[]>("/search/details", {
    params: { keyword, lat, lng },
    signal: inflight.signal,
  });

  console.log("/search/details 성공: ", res.data);

  const raw = Array.isArray(res.data) ? res.data : [];
  return mapApiPlacesToPlaces(raw, {
    currentLat: lat,
    currentLng: lng,
  });
}

let inflightDetail: AbortController | null = null;

/** /search/detail (단일 장소 상세) */
export async function fetchPlaceDetail(params: {
  gid: string;
  lat: number;
  lng: number;
}): Promise<Place> {
  const { gid, lat, lng } = params;

  // A pin can be tapped again before its detail request finishes. Only the
  // most recent selection is relevant, so free the previous request instead
  // of letting stale responses compete to update the detail sheet.
  inflightDetail?.abort();
  inflightDetail = new AbortController();

  const res = await api8080.get<ApiPlace>("/search/detail", {
    params: { gid, lat, lng },
    signal: inflightDetail.signal,
  });

  return mapApiPlaceToPlace(res.data, {
    currentLat: lat,
    currentLng: lng,
    fallbackGid: gid,
  });
}
