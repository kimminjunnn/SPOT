import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import PlaceCard from "@/src/components/common/PlaceCard";
import type { Place } from "@/src/types/place";
import { fetchMyNewSavedPlaces } from "@/src/lib/api/places";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";
import { useLocationStore } from "@/src/stores/useLocationStore";
import { useSavedPlacesStore } from "@/src/stores/useSavedPlacesStore";

import FilterBar from "@/src/components/bottomSheet/FilterBar";
import OptionModal from "@/src/components/common/OptionModal";

import { toggleBookmarkApi } from "@/src/lib/api/bookmark";
import { usePlaceMoreNavigation } from "@/src/hooks/usePlaceMoreNavigation";
import { formatDistance } from "@/src/utils/format";
import { getPlaceCardSaverProps } from "@/src/lib/mappers/placeCardSavers";

export default function SavedPlacesTab() {
  const { handlePressPlaceCard } = usePlaceMoreNavigation();

  const coords = useLocationStore((s) => s.coords);
  const lat = coords?.lat;
  const lng = coords?.lng;
  const items = useSavedPlacesStore((s) => s.savedList);
  const setSavedList = useSavedPlacesStore((s) => s.setSavedList);
  const loading = useSavedPlacesStore((s) => s.savedLoading);
  const setSavedLoading = useSavedPlacesStore((s) => s.setSavedLoading);
  const setSavedError = useSavedPlacesStore((s) => s.setSavedError);

  const applyBookmarkFromPlace = useSavedPlacesStore(
    (s) => s.applyBookmarkFromPlace,
  );

  // 로컬 필터 상태
  const [opened, setOpened] = useState<"sort" | "save" | "category" | null>(
    null,
  );
  const [sort, setSort] = useState<string[]>(["latest"]); // 기본 최신순(표시용)
  const [saveType, setSaveType] = useState<string[]>([]); // ["instagram"] | ["self"] | []
  const [category, setCategory] = useState<string[]>([]); // ["cafe"] | ... | []

  const sortOptions = useMemo(
    () => [
      { label: "최신순", value: "latest" },
      { label: "거리순", value: "distance" },
    ],
    [],
  );
  const saveOptions = useMemo(
    () => [
      { label: "전체", value: "all" },
      { label: "인스타그램", value: "instagram" },
      { label: "직접 저장", value: "self" },
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

  const saveOptionsForModal = useMemo(
    () => saveOptions.filter((o) => o.value !== "all"),
    [saveOptions],
  );
  const categoryOptionsForModal = useMemo(
    () => categoryOptions.filter((o) => o.value !== "all"),
    [categoryOptions],
  );

  const sortLabel =
    sortOptions.find((o) => o.value === sort[0])?.label || "최신순";
  const saveTypeLabel =
    saveType.length > 0
      ? saveOptions.find((o) => o.value === saveType[0])?.label
      : "저장방식";
  const categoryLabel =
    category.length > 0
      ? categoryOptions.find((o) => o.value === category[0])?.label
      : "업종";

  // ✅ 최초 1회 로드(/new)
  const loadByNew = useCallback(async () => {
    if (lat == null || lng == null) return;

    setSavedLoading(true);
    setSavedError(null);

    try {
      const list = await fetchMyNewSavedPlaces({ lat, lng });
      setSavedList(list);
    } catch (e: any) {
      setSavedError(e?.message ?? "불러오기 실패");
    } finally {
      setSavedLoading(false);
    }
  }, [lat, lng, setSavedList, setSavedLoading, setSavedError]);

  useEffect(() => {
    loadByNew();
  }, [loadByNew]);

  // ✅ sort는 이제 "클라 정렬"만: API 재호출 금지
  const handleSelectSort = useCallback((next: string[]) => {
    setSort(next);
    setOpened(null);
  }, []);

  // ✅ 북마크 토글
  const handleToggleBookmark = useCallback(
    async (place: Place) => {
      if (place.placeId == null) {
        console.warn(
          "[SavedPlacesTab] placeId is null, cannot toggle bookmark",
        );
        return;
      }

      const willBookmark = !place.isBookmarked;

      // 1) 전역 store 낙관적 업데이트
      applyBookmarkFromPlace(place, willBookmark);

      // 2) API 호출
      try {
        await toggleBookmarkApi(place.placeId);
      } catch (err) {
        console.error("[SavedPlacesTab] toggleBookmark failed:", err);
        // 3) 실패 시 강제 동기화
        if (lat != null && lng != null) {
          await loadByNew();
        }
      }
    },
    [applyBookmarkFromPlace, lat, lng, loadByNew],
  );

  // ✅ 클라이언트 필터/정렬 (옵션 바뀔 때마다 여기서만 반영)
  // 전제:
  // - categoryKey가 Place에 있으면: p.categoryKey === "cafe" 로 필터 가능
  // - saveType은 Place에 sourceKey 같은 게 있어야 정확히 가능함
  //   (없으면 아래처럼 any로 임시 접근하거나, Place에 saveTypeKey 추가하는 게 맞음)
  const filteredItems = useMemo(() => {
    let arr = items;

    // 1) 저장 방식 필터
    if (saveType.length > 0) {
      const key = saveType[0]; // "instagram" | "self"

      // ✅ 추천: Place에 sourceKey/saveTypeKey 같은 필드를 두고 그걸로 비교
      // 임시로: 서버 응답에 source/list 같은 필드가 있으면 매퍼에서 보존해두고 쓰는 게 맞다.
      arr = arr.filter((p) => (p as any).saveTypeKey === key);
    }

    // 2) 업종 필터
    if (category.length > 0) {
      const catKey = category[0]; // "cafe" | "restaurant" ...
      arr = arr.filter((p) => (p as any).categoryKey === catKey);
    }

    // 3) 정렬
    if (sort[0] === "distance") {
      arr = [...arr].sort(
        (a, b) =>
          (a.distanceM ?? Number.MAX_SAFE_INTEGER) -
          (b.distanceM ?? Number.MAX_SAFE_INTEGER),
      );
    } else {
      // "latest": 서버(/new)에서 최신순이라고 가정하면 그대로 둔다.
      // 필요하면 여기서 createdAt 같은 필드 기준 정렬 추가
    }

    return arr;
  }, [items, saveType, category, sort]);

  if (loading && items.length === 0) {
    return <ActivityIndicator style={{ marginVertical: 12 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <FilterBar
        sortLabel={sortLabel}
        saveTypeLabel={saveTypeLabel}
        categoryLabel={categoryLabel}
        onPressSort={() => setOpened("sort")}
        onPressSaveType={() => setOpened("save")}
        onPressCategory={() => setOpened("category")}
      />

      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {/* 목록 없음: 필터 결과 기준 */}
        {filteredItems.length === 0 && !loading && (
          <View style={{ flex: 1, alignItems: "center", paddingTop: 150 }}>
            <Text
              style={[
                TextStyles.SemiBold16,
                { color: Colors.gray_300, fontSize: 20 },
              ]}
            >
              저장된 장소가 없어요
            </Text>
            <Text style={[TextStyles.Regular12, { color: Colors.gray_300 }]}>
              첫 장소를 저장하고, 여정을 시작해 보세요!
            </Text>
          </View>
        )}

        {/* 리스트: 필터 결과 기준 */}
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
        visible={opened === "save"}
        title="저장 방식"
        options={saveOptionsForModal}
        selected={saveType}
        onSelect={(next) => {
          setSaveType(next);
          setOpened(null);
        }}
        onClose={() => setOpened(null)}
      />
      <OptionModal
        visible={opened === "category"}
        title="업종"
        options={categoryOptionsForModal}
        selected={category}
        onSelect={(next) => {
          setCategory(next);
          setOpened(null);
        }}
        onClose={() => setOpened(null)}
      />
    </View>
  );
}
