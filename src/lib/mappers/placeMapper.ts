// src/lib/mappers/placeMapper.ts
import type { ApiMainMePlace, ApiPlace, Place } from "@/src/types/place";
import { getCategoryLabel } from "@/src/utils/categoryLabel";
import { calculateDistanceMeters } from "@/src/utils/distance";

type MapOptions = {
  currentLat?: number;
  currentLng?: number;
  fallbackGid?: string;
};

const normalizePhotoList = (...sources: unknown[]): string[] => {
  return sources
    .flatMap((source) => (Array.isArray(source) ? source : [source]))
    .filter((photo): photo is string => typeof photo === "string")
    .map((photo) => photo.trim())
    .filter(Boolean);
};

const normalizeSaveTypeKey = (
  value: string | null | undefined,
): Place["saveTypeKey"] => {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "spot") return "spot";
  if (normalized === "instagram") return "instagram";

  return null;
};

export function mapApiPlaceToPlace(
  it: ApiPlace,
  options: MapOptions = {},
): Place {
  const { currentLat, currentLng, fallbackGid } = options;

  const lat = Number(it.latitude);
  const lng = Number(it.longitude);
  const serverDistance =
    typeof it.distance === "number" && Number.isFinite(it.distance)
      ? it.distance
      : undefined;

  const calculatedDistanceM =
    currentLat != null && currentLng != null && isFinite(lat) && isFinite(lng)
      ? calculateDistanceMeters(currentLat, currentLng, lat, lng)
      : undefined;
  const distanceM = serverDistance ?? calculatedDistanceM;

  const placeId =
    typeof it.placeId === "number" && Number.isFinite(it.placeId)
      ? it.placeId
      : null;

  const anyIt = it as any;
  const thumbnails = normalizePhotoList(it.photo, anyIt.photoUrl, anyIt.photos);
  const photo = thumbnails[0] ?? null;

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

export function mapHomePlaceItemToPlace(
  it: ApiMainMePlace,
  options: MapOptions = {},
): Place {
  const { currentLat, currentLng, fallbackGid } = options;

  const lat = Number(it.latitude);
  const lng = Number(it.longitude);
  const serverDistance =
    typeof it.distance === "number" && Number.isFinite(it.distance)
      ? it.distance
      : undefined;

  const distanceM =
    currentLat != null && currentLng != null && isFinite(lat) && isFinite(lng)
      ? calculateDistanceMeters(currentLat, currentLng, lat, lng)
      : serverDistance;

  const placeId =
    typeof it.placeId === "number" && Number.isFinite(it.placeId)
      ? it.placeId
      : null;

  const thumbnails = normalizePhotoList(it.photo);
  const photo = thumbnails[0] ?? null;
  const categoryKey = it.list ?? null;
  const saveTypeKey = normalizeSaveTypeKey(
    it.SaveType ?? it.saveType ?? it.save_type,
  );

  return {
    placeId,
    id: String(placeId ?? it.gId ?? fallbackGid ?? ""),

    name: it.name ?? "",
    address: it.address ?? "",

    lat,
    lng,

    categoryKey,
    category: getCategoryLabel(categoryKey) || null,
    saveTypeKey,

    photo,
    thumbnails,

    ratingAvg: typeof it.ratingAvg === "number" ? it.ratingAvg : null,
    ratingCount: null,
    myRating: typeof it.myRating === "number" ? it.myRating : null,

    savers: Array.isArray(it.savers)
      ? it.savers.map((saver) => ({
          nickname: saver.nickname,
          profileImageUrl: saver.profileImageUrl ?? "",
        }))
      : [],
    distanceM,

    isBookmarked: typeof it.isMarked === "boolean" ? it.isMarked : true,
  };
}

export function mapHomePlaceItemsToPlaces(
  data: ApiMainMePlace[],
  options: MapOptions = {},
): Place[] {
  return data.map((it, idx) =>
    mapHomePlaceItemToPlace(it, {
      ...options,
      fallbackGid: options.fallbackGid ?? String(idx),
    }),
  );
}
