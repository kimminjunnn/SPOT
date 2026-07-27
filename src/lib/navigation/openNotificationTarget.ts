import { router, type Href } from "expo-router";

import type { SavePlaceItem } from "@/src/components/bottomSheet/SavePlacesBottomSheet";
import { getNotificationRoute } from "@/src/lib/api/notification";
import { fetchPlaceMore } from "@/src/lib/api/places";
import { useAnalyzeResultStore } from "@/src/stores/useAnalyzeResultStore";
import { useLocationStore } from "@/src/stores/useLocationStore";

export type NotificationTarget = {
  notificationId?: number | null;
  route?: string | null;
  targetId: number | null;
  targetType: string | null;
  type: string | null;
};

export function parseNotificationTarget(data: unknown): NotificationTarget | null {
  if (!data || typeof data !== "object") return null;

  const payload = data as Record<string, unknown>;

  return {
    notificationId:
      parsePositiveInteger(payload.notification_id) ??
      parsePositiveInteger(payload.notificationId),
    route:
      typeof payload.route === "string" && payload.route.startsWith("/")
        ? payload.route
        : null,
    targetId:
      parsePositiveInteger(payload.target_id) ??
      parsePositiveInteger(payload.targetId) ??
      parsePositiveInteger(payload.place_id) ??
      parsePositiveInteger(payload.placeId),
    targetType:
      parseNonEmptyString(payload.target_type) ??
      parseNonEmptyString(payload.targetType),
    type:
      parseNonEmptyString(payload.type) ??
      parseNonEmptyString(payload.notification_type) ??
      parseNonEmptyString(payload.notificationType),
  };
}

export async function openNotificationTarget(
  target: NotificationTarget,
): Promise<boolean> {
  if (
    target.type === "instagram_extract" &&
    target.targetId !== null &&
    (target.targetType === "place" ||
      target.targetType === "instagram_extract")
  ) {
    const coords = useLocationStore.getState().coords ?? { lat: 0, lng: 0 };
    const { places: place } = await fetchPlaceMore({
      placeId: target.targetId,
      lat: coords.lat,
      lng: coords.lng,
    });

    useAnalyzeResultStore.getState().openWithPlaces(
      [mapPlaceToSaveItem(place)],
      {
        receivedAt: Date.now(),
      },
    );
    router.push("/(tabs)/map");
    return true;
  }

  const route =
    target.route ?? getNotificationRoute(target.targetType, target.targetId);

  if (!route) return false;

  router.push(route as Href);
  return true;
}

function mapPlaceToSaveItem(place: {
  address: string;
  list: string;
  name: string;
  photo: string | string[] | null;
  placeId: number;
}): SavePlaceItem {
  const photos = Array.isArray(place.photo) ? place.photo : [place.photo];
  const thumbUrl = photos.find(
    (photo): photo is string =>
      typeof photo === "string" && photo.trim().length > 0,
  );

  return {
    id: String(place.placeId),
    name: place.name,
    category: place.list,
    address: place.address,
    thumbUrl,
  };
}

function parsePositiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
