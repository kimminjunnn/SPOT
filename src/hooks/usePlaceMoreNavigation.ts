// src/hooks/usePlaceMoreNaviation.ts
import { router } from "expo-router";
import { useLocationStore } from "@/src/stores/useLocationStore";
import { usePlaceMoreStore } from "@/src/stores/usePlaceMoreStore";
import type { Place } from "@/src/types/place";
import type { BookmarkSource } from "@/src/lib/api/bookmark";

export function usePlaceMoreNavigation() {
  const coords = useLocationStore((s) => s.coords);
  const setBasePlace = usePlaceMoreStore((s) => s.setBasePlace);

  const handlePressPlaceCard = (
    place: Place,
    bookmarkSource: BookmarkSource = { sourceType: "search" },
  ) => {
    if (!place.placeId) {
      console.warn("[usePlaceMoreNavigation] placeId 없음");
      return;
    }
    if (!coords) {
      console.warn("[usePlaceMoreNavigation] 좌표 준비 안 됨");
      return;
    }

    //  상세 페이지가 최소한 이 정보로는 렌더 가능하게 저장
    setBasePlace(place);

    router.push({
      pathname: "/place/[placeId]",
      params: {
        placeId: String(place.placeId),
        lat: String(place.lat),
        lng: String(place.lng),
        sourceType: bookmarkSource.sourceType,
        sourceUserId:
          bookmarkSource.sourceUserId != null
            ? String(bookmarkSource.sourceUserId)
            : undefined,
        sourceCommentId:
          bookmarkSource.sourceCommentId != null
            ? String(bookmarkSource.sourceCommentId)
            : undefined,
      },
    });
  };

  return { handlePressPlaceCard };
}
