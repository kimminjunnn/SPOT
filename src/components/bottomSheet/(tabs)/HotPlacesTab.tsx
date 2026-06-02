import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";

import PlaceCard from "@/src/components/common/PlaceCard";
import FilterBar from "@/src/components/bottomSheet/FilterBar";
import OptionModal from "@/src/components/common/OptionModal";

import type { Place } from "@/src/types/place";

import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

import { useLocationStore } from "@/src/stores/useLocationStore";
import { usePlaceMoreNavigation } from "@/src/hooks/usePlaceMoreNavigation";
import { formatDistance } from "@/src/utils/format";

import { toggleBookmarkApi } from "@/src/lib/api/bookmark";
import { useHotPlacesStore } from "@/src/stores/useHotPlacesStore";
import { getPlaceCardSaverProps } from "@/src/lib/mappers/placeCardSavers";

export default function HotPlacesTab() {
  const { handlePressPlaceCard } = usePlaceMoreNavigation();

  const coords = useLocationStore((s) => s.coords);
  const lat = coords?.lat;
  const lng = coords?.lng;

  // ✅ store state
  const items = useHotPlacesStore((s) => s.hotList);
  const loading = useHotPlacesStore((s) => s.hotLoading);
  const loadingMore = useHotPlacesStore((s) => s.hotLoadingMore);
  const errorMsg = useHotPlacesStore((s) => s.hotError);
  const refreshHotPlaces = useHotPlacesStore((s) => s.refreshHotPlaces);
  const applyHotBookmarkFromPlace = useHotPlacesStore(
    (s) => s.applyHotBookmarkFromPlace,
  );

  // UI 상태
  const [opened, setOpened] = useState<"sort" | "category" | null>(null);
  const [sort, setSort] = useState<string[]>(["hot"]); // 표시용
  const [category, setCategory] = useState<string[]>([]);

  const sortOptions = useMemo(
    () => [
      // ⚠️ 현재 API는 lat/lng만 받는다고 했으니 실제 정렬은 UI만
      { label: "인기순", value: "hot" },
      { label: "거리순", value: "distance" },
    ],
    [],
  );

  const categoryOptions = useMemo(
    () => [
      { label: "음식점", value: "restaurant" },
      { label: "술집", value: "bar" },
      { label: "전시회", value: "exhibition" },
      { label: "카페", value: "cafe" },
      { label: "디저트", value: "dessert" },
      { label: "소품샵", value: "gift_shop" },
      { label: "체험", value: "experience" },
      { label: "옷가게", value: "clothing_store" },
    ],
    [],
  );

  const categoryOptionsForModal = useMemo(
    () => categoryOptions.filter((o) => o.value !== "all"),
    [categoryOptions],
  );

  const sortLabel =
    sortOptions.find((o) => o.value === sort[0])?.label ?? "인기순";
  const categoryLabel =
    category.length > 0
      ? (categoryOptions.find((o) => o.value === category[0])?.label ?? "업종")
      : "업종";

  // ✅ 최초 로드: store refresh
  useEffect(() => {
    if (lat == null || lng == null) return;
    refreshHotPlaces({ lat, lng });
  }, [lat, lng, refreshHotPlaces]);

  const handleSelectSort = useCallback((next: string[]) => {
    setSort(next);
    setOpened(null);
  }, []);

  const handleSelectCategory = useCallback((next: string[]) => {
    setCategory(next);
    setOpened(null);
  }, []);

  // ✅ 북마크 토글: store 낙관적 업데이트 + 실패 롤백
  const handleToggleBookmark = useCallback(
    async (place: Place) => {
      if (place.placeId == null) {
        console.warn("[HotPlacesTab] placeId is null, cannot toggle bookmark");
        return;
      }

      const willBookmark = !place.isBookmarked;

      // 1) store 낙관적 업데이트
      applyHotBookmarkFromPlace(place, willBookmark);

      // 2) API 호출
      try {
        await toggleBookmarkApi(place.placeId);
      } catch (err) {
        console.error("[HotPlacesTab] toggleBookmark failed:", err);

        // 3) 실패 롤백
        applyHotBookmarkFromPlace(place, !willBookmark);

        // 원하면 refetch로 강제 동기화
        // if (lat != null && lng != null) await refreshHotPlaces({ lat, lng });
      }
    },
    [applyHotBookmarkFromPlace],
  );

  const filteredItems = useMemo(() => {
    let arr = items;

    // ✅ 카테고리 필터 (선택 안 했으면 전체)
    if (category.length > 0) {
      const key = category[0]; // "cafe" | "restaurant" ...
      arr = arr.filter((p) => p.categoryKey === key);
    }

    // ✅ 정렬
    if (sort[0] === "distance") {
      arr = [...arr].sort(
        (a, b) =>
          (a.distanceM ?? Number.MAX_SAFE_INTEGER) -
          (b.distanceM ?? Number.MAX_SAFE_INTEGER),
      );
    } else {
      // "hot" (인기순) -> 서버가 이미 인기순으로 내려준다고 가정하면 그대로 둠
      // 필요하면 여기서 따로 인기 지표 기준 정렬 추가
    }

    return arr;
  }, [items, category, sort]);

  if (loading && filteredItems.length === 0) {
    return <ActivityIndicator style={{ marginVertical: 12 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <FilterBar
        sortLabel={sortLabel}
        categoryLabel={categoryLabel}
        onPressSort={() => setOpened("sort")}
        onPressCategory={() => setOpened("category")}
        showSaveType={false}
      />

      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {/* 에러 */}
        {errorMsg && !loading && (
          <View style={{ paddingTop: 16 }}>
            <Text style={[TextStyles.Regular12, { color: Colors.gray_300 }]}>
              {errorMsg}
            </Text>
          </View>
        )}

        {/* 목록 없음 */}
        {filteredItems.length === 0 && !loading && !errorMsg && (
          <View style={{ flex: 1, alignItems: "center", paddingTop: 150 }}>
            <Text
              style={[
                TextStyles.SemiBold16,
                { color: Colors.gray_300, fontSize: 20 },
              ]}
            >
              인기 장소가 아직 없어요
            </Text>
            <Text style={[TextStyles.Regular12, { color: Colors.gray_300 }]}>
              조금만 기다려 주세요!
            </Text>
          </View>
        )}

        {/* 리스트 */}
        {filteredItems.map((p) => {
          const saverProps = getPlaceCardSaverProps(p);

          return (
            <PlaceCard
              key={p.id}
              name={p.name}
              category={p.category ?? ""}
              address={p.address}
              images={
                p.thumbnails.length > 0
                  ? p.thumbnails.map((u) => ({ uri: u }))
                  : [require("@/assets/images/default-place.png")]
              }
              savedUsers={saverProps.savedUsers}
              savedCount={saverProps.savedCount}
              showDirectionButton={true}
              rating={p.ratingAvg ?? 0}
              reviewCount={p.ratingCount ?? 0}
              showBookmark={true}
              isBookmarked={p.isBookmarked}
              onToggleBookmark={() => handleToggleBookmark(p)}
              distanceText={
                p.distanceM != null ? formatDistance(p.distanceM) : undefined
              }
              onPress={() => handlePressPlaceCard(p)}
            />
          );
        })}

        {loadingMore && <ActivityIndicator style={{ marginVertical: 16 }} />}
      </View>

      {/* 모달 */}
      <OptionModal
        visible={opened === "sort"}
        title="정렬 기준"
        options={sortOptions}
        selected={sort}
        onSelect={handleSelectSort}
        onClose={() => setOpened(null)}
      />
      <OptionModal
        visible={opened === "category"}
        title="업종"
        options={categoryOptionsForModal}
        selected={category}
        onSelect={handleSelectCategory}
        onClose={() => setOpened(null)}
      />
    </View>
  );
}
