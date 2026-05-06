import { useState, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { router } from "expo-router";

import FilterBar from "../bottomSheet/FilterBar";
import PlaceCard from "../common/PlaceCard";
import OptionModal from "../common/OptionModal";

import { type HomePlaceItem } from "./types";
import { useSearchStore } from "@/src/stores/useSearchStore";
import { calculateDistanceMeters, isValidCoordinate } from "@/src/utils/distance";
import { formatDistance } from "@/src/utils/format";

const SORT_OPTIONS = [
  { label: "최신순", value: "latest" },
  { label: "거리순", value: "distance" },
] as const;

const CATEGORY_OPTIONS = [
  { label: "음식점", value: "restaurant" },
  { label: "술집", value: "bar" },
  { label: "전시회", value: "exhibition" },
  { label: "카페", value: "cafe" },
  { label: "디저트", value: "dessert" },
  { label: "소품샵", value: "gift_shop" },
  { label: "체험", value: "experience" },
  { label: "옷가게", value: "clothing_store" },
] as const;

type PlaceTabSectionProps = {
  placeList: HomePlaceItem[];
  currentCoords?: { lat: number; lng: number } | null;
  onScrollDirection?: (direction: "up" | "down") => void;
};

const dummyCardFallbackImgs = [
  require("@/assets/images/default-place.png"),
  require("@/assets/images/react-logo.png"),
  require("@/assets/images/spot-icon-orange.png"),
];

// 너무 작은 움직임은 방향 전환으로 보지 않음
const SCROLL_THRESHOLD = 16;

// 맨 아래에 거의 닿은 상태로 보는 범위
const BOTTOM_EDGE_THRESHOLD = 24;

// 맨 아래 bounce에서 생기는 작은 반등(up)은 무시
const BOTTOM_BOUNCE_UP_IGNORE_THRESHOLD = 20;

export const PlaceTabSection = ({
  placeList,
  currentCoords,
  onScrollDirection,
}: PlaceTabSectionProps) => {
  const [category, setCategory] = useState<string[]>([]);
  const [sort, setSort] = useState<string[]>(["latest"]);
  const [opened, setOpened] = useState<"sort" | "save" | "category" | null>(
    null,
  );

  const lastOffsetYRef = useRef(0);

  const toggleBookmark = useSearchStore((s) => s.toggleBookmark);

  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sort[0])?.label ?? "최신순";

  const categoryLabel =
    category.length > 0
      ? (CATEGORY_OPTIONS.find((option) => option.value === category[0])
          ?.label ?? "업종")
      : "업종";

  const visiblePlaceList = useMemo(() => {
    let next = [...placeList];

    if (category[0]) {
      next = next.filter((place) => place.list === category[0]);
    }

    if (sort[0] === "distance") {
      next.sort(
        (a, b) =>
          getDisplayDistanceM(a, currentCoords) -
          getDisplayDistanceM(b, currentCoords),
      );
    }

    return next;
  }, [placeList, category, sort, currentCoords]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;

    const currentY = contentOffset.y;
    const prevY = lastOffsetYRef.current;
    const diff = currentY - prevY;

    const layoutHeight = layoutMeasurement.height;
    const contentHeight = contentSize.height;

    const distanceFromBottom = contentHeight - layoutHeight - currentY;
    const isNearBottom = distanceFromBottom <= BOTTOM_EDGE_THRESHOLD;

    // iOS bounce로 음수까지 갈 수 있음 -> 맨 위는 그냥 up 처리
    if (currentY <= 0) {
      onScrollDirection?.("up");
      lastOffsetYRef.current = currentY;
      return;
    }

    // 너무 작은 움직임은 무시
    if (Math.abs(diff) < SCROLL_THRESHOLD) {
      lastOffsetYRef.current = currentY;
      return;
    }

    // 맨 아래 근처에서 bounce로 살짝 위로 튀는 경우(up) 무시
    if (
      isNearBottom &&
      diff < 0 &&
      Math.abs(diff) < BOTTOM_BOUNCE_UP_IGNORE_THRESHOLD
    ) {
      lastOffsetYRef.current = currentY;
      return;
    }

    onScrollDirection?.(diff > 0 ? "down" : "up");
    lastOffsetYRef.current = currentY;
  };

  return (
    <View style={{ flex: 1 }}>
      <FilterBar
        sortLabel={sortLabel}
        categoryLabel={categoryLabel}
        onPressSort={() => setOpened("sort")}
        onPressCategory={() => setOpened("category")}
        showSaveType={false}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {visiblePlaceList.map((p, index) => {
          const imgs =
            Array.isArray(p.photos) && p.photos.length > 0
              ? p.photos.map((u) => ({ uri: u }))
              : dummyCardFallbackImgs;

          const savedUsers =
            Array.isArray(p.memPhotos) && p.memPhotos.length > 0
              ? p.memPhotos.slice(0, 3).map((u) => ({ uri: u }))
              : undefined;

          const placeId = getPlaceId(p);
          const displayDistanceM = getDisplayDistanceM(p, currentCoords);

          return (
            <PlaceCard
              key={getPlaceCardKey(p, index)}
              name={p.name}
              category={p.list}
              address={p.address}
              images={imgs as any[]}
              savedUsers={savedUsers as any[]}
              savedCount={p.savedCount}
              showDirectionButton={true}
              rating={p.rating}
              reviewCount={p.ratingCount}
              showBookmark={true}
              isBookmarked={p.marked}
              distanceText={
                Number.isFinite(displayDistanceM)
                  ? formatDistance(displayDistanceM)
                  : undefined
              }
              onToggleBookmark={() => toggleBookmark(placeId)}
              onPress={() => {
                if (placeId == null) return;

                router.push({
                  pathname: "/place/[placeId]",
                  params: {
                    placeId: String(placeId),
                    lat: p.lat,
                    lng: p.lng,
                  },
                });
              }}
            />
          );
        })}
      </ScrollView>

      <OptionModal
        visible={opened === "sort"}
        title="정렬 기준"
        options={SORT_OPTIONS}
        selected={sort}
        onSelect={setSort}
        onClose={() => setOpened(null)}
      />

      <OptionModal
        visible={opened === "category"}
        title="업종"
        options={CATEGORY_OPTIONS}
        selected={category}
        onSelect={setCategory}
        onClose={() => setOpened(null)}
      />
    </View>
  );
};

function getDisplayDistanceM(
  place: HomePlaceItem,
  currentCoords?: { lat: number; lng: number } | null,
) {
  const currentLat = currentCoords?.lat;
  const currentLng = currentCoords?.lng;

  if (
    typeof currentLat === "number" &&
    typeof currentLng === "number" &&
    isValidCoordinate(currentLat, currentLng) &&
    isValidCoordinate(place.lat, place.lng)
  ) {
    return calculateDistanceMeters(
      currentLat,
      currentLng,
      place.lat,
      place.lng,
    );
  }

  return typeof place.distance === "number" && Number.isFinite(place.distance)
    ? place.distance
    : Infinity;
}

function getPlaceId(place: HomePlaceItem) {
  if (typeof place.placeId === "number" && Number.isFinite(place.placeId)) {
    return place.placeId;
  }

  if (typeof place.id === "number" && Number.isFinite(place.id)) {
    return place.id;
  }

  return null;
}

function getPlaceCardKey(place: HomePlaceItem, index: number) {
  const placeId = getPlaceId(place);

  if (placeId != null) {
    return `place-${placeId}`;
  }

  if (place.gid) {
    return `gid-${place.gid}`;
  }

  return `place-fallback-${index}`;
}
