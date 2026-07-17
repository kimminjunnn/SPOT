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
  ActivityIndicator,
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
import {
  toggleBookmarkApi,
  type BookmarkSource,
  type BookmarkSourceType,
} from "@/src/lib/api/bookmark";
import type { ApiPlace, ApiPlaceComment } from "@/src/types/place";
import { formatDistance } from "@/src/utils/format";

import { useSavedPlacesStore } from "@/src/stores/useSavedPlacesStore";
import { useSearchStore } from "@/src/stores/useSearchStore";
import { usePlaceMoreStore } from "@/src/stores/usePlaceMoreStore";
import { useLocationStore } from "@/src/stores/useLocationStore";

import { openNaverMap } from "@/src/utils/openNaverMap";
import { calculateDistanceMeters } from "@/src/utils/distance";
import { CommentCard } from "@/src/components/comment/CommentCard";
import SavedInfoCard from "@/src/components/place/SavedInfoCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const normalizePhotoList = (...sources: unknown[]): string[] => {
  const seen = new Set<string>();

  return sources
    .flatMap((source) => (Array.isArray(source) ? source : [source]))
    .filter((photo): photo is string => typeof photo === "string")
    .flatMap((photo) => photo.split(","))
    .map((photo) => photo.trim())
    .filter(
      (photo) =>
        photo.length > 0 &&
        (photo.startsWith("http://") || photo.startsWith("https://")),
    )
    .filter((photo) => {
      if (seen.has(photo)) return false;
      seen.add(photo);
      return true;
    });
};

export default function PlaceDetailScreen() {
  const { placeId, lat, lng, sourceType, sourceUserId, sourceCommentId } =
    useLocalSearchParams<{
      placeId: string;
      lat?: string;
      lng?: string;
      sourceType?: string;
      sourceUserId?: string;
      sourceCommentId?: string;
    }>();

  const bookmarkSource = useMemo<BookmarkSource>(
    () => ({
      sourceType: isBookmarkSourceType(sourceType) ? sourceType : "search",
      sourceUserId: parseOptionalId(sourceUserId),
      sourceCommentId: parseOptionalId(sourceCommentId),
    }),
    [sourceType, sourceUserId, sourceCommentId],
  );

  const basePlace = usePlaceMoreStore((s) => s.basePlace);
  const currentCoords = useLocationStore((s) => s.coords);
  const refreshLocation = useLocationStore((s) => s.refreshOnce);

  const [currentPage, setCurrentPage] = useState(1);
  const [place, setPlace] = useState<ApiPlace | null>(null);
  const [comments, setComments] = useState<ApiPlaceComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [placeLoading, setPlaceLoading] = useState(true);
  const [locationResolved, setLocationResolved] = useState(
    currentCoords !== null,
  );

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
    const photos = normalizePhotoList(
      place?.photo,
      basePlace?.thumbnails,
      basePlace?.photo,
    );
    if (photos.length > 0) return photos.map((u) => ({ uri: u }));
    return fallbackImages;
  }, [place, basePlace, fallbackImages]);

  const topImageKey = useMemo(
    () =>
      topImages
        .map((image, index) =>
          typeof image === "object" && image !== null && "uri" in image
            ? String(image.uri)
            : `asset-${index}`,
        )
        .join("|"),
    [topImages],
  );

  const cardImages = useMemo(() => {
    const photos = normalizePhotoList(
      place?.photo,
      basePlace?.thumbnails,
      basePlace?.photo,
    );
    if (photos.length > 0) return photos.map((u) => ({ uri: u }));
    return [require("@/assets/images/default-place.png")];
  }, [place, basePlace]);

  useEffect(() => {
    let alive = true;

    if (currentCoords !== null) {
      setLocationResolved(true);
      return () => {
        alive = false;
      };
    }

    void refreshLocation()
      .catch((locationError) => {
        console.warn(
          "[PlaceDetailScreen] 현재 위치 확인 실패, 기본 좌표로 조회합니다:",
          locationError,
        );
      })
      .finally(() => {
        if (alive) setLocationResolved(true);
      });

    return () => {
      alive = false;
    };
  }, [currentCoords, refreshLocation]);

  useEffect(() => {
    setCurrentPage(1);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [topImageKey]);

  // 라우트의 lat/lng는 선택한 장소 좌표다. 지도에는 이 좌표를 사용하고,
  // 거리 계산 및 /more 요청에는 currentCoords를 별도로 사용한다.
  const mapLat = useMemo(() => {
    const routeLat = Number(lat);
    if (Number.isFinite(routeLat)) return routeLat;

    const fallbackLat = Number(place?.latitude ?? basePlace?.lat);
    return Number.isFinite(fallbackLat) ? fallbackLat : null;
  }, [lat, place?.latitude, basePlace?.lat]);

  const mapLng = useMemo(() => {
    const routeLng = Number(lng);
    if (Number.isFinite(routeLng)) return routeLng;

    const fallbackLng = Number(place?.longitude ?? basePlace?.lng);
    return Number.isFinite(fallbackLng) ? fallbackLng : null;
  }, [lng, place?.longitude, basePlace?.lng]);

  const calculatedDistanceM = useMemo(() => {
    if (currentCoords == null || mapLat == null || mapLng == null) {
      return undefined;
    }

    return calculateDistanceMeters(
      currentCoords.lat,
      currentCoords.lng,
      mapLat,
      mapLng,
    );
  }, [currentCoords, mapLat, mapLng]);

  const display = {
    name: place?.name ?? basePlace?.name ?? "알 수 없는 장소",
    category: place?.list ?? basePlace?.category ?? "",
    address: place?.address ?? basePlace?.address ?? "",
    ratingAvg: place?.ratingAvg ?? basePlace?.ratingAvg ?? null,
    ratingCount: place?.ratingCount ?? basePlace?.ratingCount ?? null,
    distance: calculatedDistanceM ?? basePlace?.distanceM,
    savers: place?.savers ?? basePlace?.savers ?? [],
    isBookmarked: place?.isMarked ?? basePlace?.isBookmarked ?? false,
  };

  const distanceText =
    typeof display.distance === "number"
      ? formatDistance(display.distance)
      : undefined;

  const hasValidCoords = mapLat !== null && mapLng !== null;

  useEffect(() => {
    setLocalBookmarked(display.isBookmarked);
  }, [display.isBookmarked]);

  useEffect(() => {
    if (!placeId || !locationResolved) return;

    let alive = true;

    const load = async () => {
      setPlaceLoading(true);

      try {
        const origin = useLocationStore.getState().coords ?? { lat: 0, lng: 0 };
        const data = await fetchPlaceMore({
          placeId: Number(placeId),
          lat: origin.lat,
          lng: origin.lng,
        });

        if (!alive) return;
        setPlace(data.places);
        setComments(data.comments ?? []);
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        console.error("[PlaceDetailScreen] /more error:", e);
        setError(e?.message ?? "추가 정보를 불러오지 못했어요.");
      } finally {
        if (alive) setPlaceLoading(false);
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [placeId, locationResolved]);

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
      const serverMarked = await toggleBookmarkApi(
        numericPlaceId,
        bookmarkSource,
      );
      const finalMarked = serverMarked ?? next;

      setLocalBookmarked(finalMarked);

      const syncTarget =
        basePlace && basePlace.placeId === numericPlaceId
          ? { ...basePlace, isBookmarked: finalMarked }
          : null;

      if (syncTarget) {
        useSavedPlacesStore
          .getState()
          .applyBookmarkFromPlace(syncTarget, finalMarked);
      }

      useSearchStore
        .getState()
        .syncBookmarkByPlaceId(numericPlaceId, finalMarked);
      usePlaceMoreStore
        .getState()
        .syncBookmarkByPlaceId(numericPlaceId, finalMarked);
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
        {placeLoading || !locationResolved ? (
          <>
            <ActivityIndicator color={Colors.gray_500} />
            <Text style={[TextStyles.Medium16, styles.loadingText]}>
              장소 정보를 불러오는 중...
            </Text>
          </>
        ) : (
          <Text style={TextStyles.Medium16}>
            {error ?? "장소 정보를 찾을 수 없어요."}
          </Text>
        )}
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
            key={topImageKey}
            ref={flatListRef}
            data={topImages}
            horizontal
            pagingEnabled
            onScroll={handleScroll}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) =>
              typeof item === "object" && item !== null && "uri" in item
                ? String(item.uri)
                : `asset-${index}`
            }
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

        <SavedInfoCard savers={display.savers} />

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

function isBookmarkSourceType(value?: string): value is BookmarkSourceType {
  return (
    value === "instagram" ||
    value === "search" ||
    value === "friend_profile" ||
    value === "comment"
  );
}

function parseOptionalId(value?: string): number | null {
  if (value == null || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
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
  loadingText: {
    marginTop: 10,
    color: Colors.gray_600,
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
