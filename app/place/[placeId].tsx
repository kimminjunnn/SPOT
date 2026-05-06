// app/place/[placeId].tsx
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
} from "react-native";
import { useState, useRef, useEffect, useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  NaverMapView,
  NaverMapMarkerOverlay,
} from "@mj-studio/react-native-naver-map";

import PlaceCard from "@/src/components/common/PlaceCard";
import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";
import Pagination from "@/src/components/common/Pagination";
import CommentWriteButton from "@/src/components/comment/CommentWriteButton";
import CommentWriteModal, {
  CommentWriteModalRef,
} from "@/src/components/comment/CommentWriteModal";

import SpotButton from "@/src/components/common/SpotButton";

import { fetchPlaceMore } from "@/src/lib/api/places";
import { toggleBookmarkApi } from "@/src/lib/api/bookmark";
import type { ApiPlace, ApiPlaceComment } from "@/src/types/place";
import { formatDistance } from "@/src/utils/format";

import { useSavedPlacesStore } from "@/src/stores/useSavedPlacesStore";
import { useSearchStore } from "@/src/stores/useSearchStore";
import { usePlaceMoreStore } from "@/src/stores/usePlaceMoreStore";

import { openNaverMap } from "@/src/utils/openNaverMap";
import { CommentCard } from "@/src/components/comment/CommentCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function PlaceDetailScreen() {
  const { placeId, lat, lng } = useLocalSearchParams<{
    placeId: string;
    lat?: string;
    lng?: string;
  }>();

  const basePlace = usePlaceMoreStore((s) => s.basePlace);

  const [currentPage, setCurrentPage] = useState(1);
  const [place, setPlace] = useState<ApiPlace | null>(null);
  const [comments, setComments] = useState<ApiPlaceComment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [localBookmarked, setLocalBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const commentModalRef = useRef<CommentWriteModalRef>(null);

  const fallbackImages = useMemo(
    () => [
      require("@/assets/images/example2.png"),
      require("@/assets/images/default-place.png"),
      require("@/assets/images/SPOT.png"),
    ],
    [],
  );

  const topImages = useMemo(() => {
    if (place?.photo) return [{ uri: place.photo }];
    if (basePlace?.photo) return [{ uri: basePlace.photo }];
    if (basePlace?.thumbnails?.length) {
      return basePlace.thumbnails.map((u) => ({ uri: u }));
    }
    return fallbackImages;
  }, [place, basePlace, fallbackImages]);

  const cardImages = useMemo(() => {
    if (basePlace?.thumbnails?.length) {
      return basePlace.thumbnails.map((u) => ({ uri: u }));
    }
    if (place?.photo) return [{ uri: place.photo }];
    return [require("@/assets/images/default-place.png")];
  }, [place, basePlace]);

  const display = {
    name: place?.name ?? basePlace?.name ?? "알 수 없는 장소",
    category: place?.list ?? basePlace?.category ?? "",
    address: place?.address ?? basePlace?.address ?? "",
    ratingAvg: place?.ratingAvg ?? basePlace?.ratingAvg ?? null,
    ratingCount: place?.ratingCount ?? basePlace?.ratingCount ?? null,
    distance:
      typeof place?.distance === "number"
        ? place.distance
        : basePlace?.distanceM,
    savers: place?.savers ?? basePlace?.savers ?? [],
    isBookmarked: place?.isMarked ?? basePlace?.isBookmarked ?? false,
  };

  const distanceText =
    typeof display.distance === "number"
      ? formatDistance(display.distance)
      : undefined;

  const mapLat = useMemo(() => {
    const parsed = Number(lat);
    return Number.isFinite(parsed) ? parsed : null;
  }, [lat]);

  const mapLng = useMemo(() => {
    const parsed = Number(lng);
    return Number.isFinite(parsed) ? parsed : null;
  }, [lng]);

  const hasValidCoords = mapLat !== null && mapLng !== null;

  useEffect(() => {
    setLocalBookmarked(display.isBookmarked);
  }, [display.isBookmarked]);

  useEffect(() => {
    if (!placeId || !lat || !lng) return;

    const load = async () => {
      try {
        const data = await fetchPlaceMore({
          placeId: Number(placeId),
          lat: Number(lat),
          lng: Number(lng),
        });

        setPlace(data.places);
        setComments(data.comments ?? []);
        setError(null);
      } catch (e: any) {
        console.error("[PlaceDetailScreen] /more error:", e);
        setError(e?.message ?? "추가 정보를 불러오지 못했어요.");
      }
    };

    load();
  }, [placeId, lat, lng]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newPage = Math.floor(offsetX / SCREEN_WIDTH) + 1;
    setCurrentPage(newPage);
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      flatListRef.current?.scrollToIndex({ index: currentPage - 2 });
    }
  };

  const handleNext = () => {
    if (currentPage < topImages.length) {
      flatListRef.current?.scrollToIndex({ index: currentPage });
    }
  };

  const handleOpenCommentSheet = () => {
    commentModalRef.current?.open();
  };

  const handleToggleBookmark = async () => {
    const numericPlaceId = Number(placeId);

    if (!Number.isFinite(numericPlaceId) || bookmarkLoading) return;

    const prev = localBookmarked;
    const next = !prev;

    setLocalBookmarked(next);
    setBookmarkLoading(true);

    try {
      await toggleBookmarkApi(numericPlaceId);

      const syncTarget =
        basePlace && basePlace.placeId === numericPlaceId
          ? { ...basePlace, isBookmarked: next }
          : null;

      if (syncTarget) {
        useSavedPlacesStore.getState().applyBookmarkFromPlace(syncTarget, next);
      }

      useSearchStore.getState().syncBookmarkByPlaceId(numericPlaceId, next);
      usePlaceMoreStore.getState().syncBookmarkByPlaceId(numericPlaceId, next);
    } catch (e) {
      console.error("[PlaceDetailScreen] bookmark toggle error:", e);
      setLocalBookmarked(prev);
    } finally {
      setBookmarkLoading(false);
    }
  };

  if (!place && !basePlace) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={TextStyles.Medium16}>장소 정보를 찾을 수 없어요.</Text>
      </View>
    );
  }

  const handleOpenNaverMap = async () => {
    await openNaverMap(display.name);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.topImageContainer}>
          <FlatList
            ref={flatListRef}
            data={topImages}
            horizontal
            pagingEnabled
            onScroll={handleScroll}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <Image source={item} style={styles.topImage} />
            )}
          />
          <View style={styles.paginationContainer}>
            <Pagination
              currentPage={currentPage}
              totalPages={topImages.length}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          </View>
        </View>

        <View style={styles.infoSection}>
          <PlaceCard
            name={display.name}
            category={display.category}
            address={display.address}
            images={cardImages}
            showBookmark={true}
            isBookmarked={localBookmarked}
            showDirectionButton={false}
            rating={display.ratingAvg ?? undefined}
            reviewCount={display.ratingCount ?? undefined}
            distanceText={distanceText}
            onToggleBookmark={handleToggleBookmark}
          />
        </View>

        <Text
          style={[TextStyles.Bold16, { color: Colors.gray_900, padding: 16 }]}
        >
          매장 위치
        </Text>

        <View style={styles.mapContainer}>
          {hasValidCoords ? (
            <NaverMapView
              style={styles.map}
              camera={{
                latitude: mapLat,
                longitude: mapLng,
                zoom: 17,
              }}
              isShowLocationButton={false}
            >
              <NaverMapMarkerOverlay
                latitude={mapLat}
                longitude={mapLng}
                width={20}
                height={25}
              />
            </NaverMapView>
          ) : (
            <View style={styles.mapFallback}>
              <Text style={[TextStyles.Regular12, { color: Colors.gray_400 }]}>
                위치 정보를 불러올 수 없어요.
              </Text>
            </View>
          )}
        </View>

        <SpotButton
          label="네이버 지도로 길 찾기"
          variant="primary"
          size="large"
          style={{ marginHorizontal: 16 }}
          onPress={handleOpenNaverMap}
        />

        <View style={styles.savedInfo}>
          <Image
            source={require("@/assets/images/example3.png")}
            style={{ width: 343, height: 64 }}
          />
        </View>

        {/* <View style={styles.commentSectionHeader}>
          <Text style={styles.commentText}>코멘트</Text>
          <Text style={styles.commentCount}> {comments.length}</Text>
        </View>
        <CommentCard commentList={comments} /> */}
      </ScrollView>

      {/* <CommentWriteButton onPress={handleOpenCommentSheet} />
      <CommentWriteModal ref={commentModalRef} placeId={Number(placeId)} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  topImageContainer: {
    width: "100%",
    backgroundColor: "#fff",
  },
  topImage: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  paginationContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mapContainer: {
    height: 154,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.gray_100,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  savedInfo: {
    marginTop: 16,
    borderColor: "#eee",
    marginBottom: 30,
    alignItems: "center",
  },
  commentSectionHeader: {
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  commentText: {
    ...TextStyles.Bold16,
  },
  commentCount: {
    ...TextStyles.Bold16,
    color: Colors.gray_300,
  },
});
