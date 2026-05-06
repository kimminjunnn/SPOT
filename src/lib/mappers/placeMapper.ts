// src/lib/mappers/placeMapper.ts
import type { ApiPlace, Place } from "@/src/types/place";
import { getCategoryLabel } from "@/src/utils/categoryLabel";
import { calculateDistanceMeters } from "@/src/utils/distance";

type MapOptions = {
  currentLat?: number;
  currentLng?: number;
  fallbackGid?: string;
};

export function mapApiPlaceToPlace(
  it: ApiPlace,
  options: MapOptions = {},
): Place {
  const { currentLat, currentLng, fallbackGid } = options;

  const lat = Number(it.latitude);
  const lng = Number(it.longitude);

  const distanceM =
    currentLat != null && currentLng != null && isFinite(lat) && isFinite(lng)
      ? calculateDistanceMeters(currentLat, currentLng, lat, lng)
      : undefined;

  const placeId =
    typeof it.placeId === "number" && Number.isFinite(it.placeId)
      ? it.placeId
      : null;

  const anyIt = it as any;
  const photo = it.photo ?? anyIt.photoUrl ?? null;

  const thumbnails =
    photo != null
      ? [String(photo)]
      : Array.isArray(anyIt.photos)
        ? anyIt.photos.filter(Boolean).map(String)
        : [];

  const categoryKey = (it as any).list ?? null; // ✅ 원본 키 보존 ("cafe", "restaurant"...)

  return {
    placeId,
    id: String(it.placeId ?? it.gId ?? fallbackGid ?? ""),

    name: it.name ?? "",
    address: it.address ?? "",

    lat,
    lng,

    // ✅ 필터용 키 + 표시용 라벨을 분리
    categoryKey,
    category: getCategoryLabel(categoryKey) || null,

    photo,
    thumbnails,

    ratingAvg: typeof it.ratingAvg === "number" ? it.ratingAvg : null,
    ratingCount: typeof it.ratingCount === "number" ? it.ratingCount : null,
    myRating: typeof it.myRating === "number" ? it.myRating : null,

    savers: Array.isArray(it.savers) ? it.savers : [],
    distanceM,

    isBookmarked: !!it.isMarked,
  };
}

export function mapApiPlacesToPlaces(
  data: ApiPlace[],
  options: MapOptions = {},
): Place[] {
  return data.map((it, idx) =>
    mapApiPlaceToPlace(it, {
      ...options,
      fallbackGid: options.fallbackGid ?? String(idx),
    }),
  );
}
