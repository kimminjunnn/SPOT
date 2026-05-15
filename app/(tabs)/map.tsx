import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import {
  NaverMapMarkerOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";

import type { ApiMapPlace } from "@/src/types/place";

import { Colors } from "@/src/styles/Colors";
import { getMapPinImage } from "@/src/utils/getMapPinImage";

import PlacesBottomSheetContainer from "@/src/components/bottomSheet/PlacesBottomSheetContainer";
import SavePlacesBottomSheet from "@/src/components/bottomSheet/SavePlacesBottomSheet";
import SearchDetailBottomSheet from "@/src/components/bottomSheet/SearchDetailBottomSheet";
import SearchDetailsBottomSheet from "@/src/components/bottomSheet/SearchDetailsBottomSheet";
import UserLocationMarker from "@/src/components/map/UserLocationMarker";

import { useAnalyzeResultStore } from "@/src/stores/useAnalyzeResultStore";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { useLocationStore } from "@/src/stores/useLocationStore";
import { useSearchStore } from "@/src/stores/useSearchStore";

import { fetchPlaceDetail } from "@/src/lib/api/search";
import { savePlaces } from "@/src/lib/api/places";

import { MapSearchBar } from "@/src/components/map/MapSearchBar";

import { useLoadMapPlaces } from "@/src/hooks/map/useLoadMapPlaces";
import { useSearchPlaces } from "@/src/hooks/map/useSearchPlaces";
import { useLoadSavedPlacesOnFocus } from "@/src/hooks/map/useLoadSavedPlacesOnFocus";

import { getRoundedCoords } from "@/src/utils/coords";
export default function Map() {
  const mapRef = useRef<NaverMapViewRef>(null);

  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);

  const hydrate = useAuthStore((s) => s.hydrate);

  const refreshOnce = useLocationStore((s) => s.refreshOnce);
  const coords = useLocationStore((s) => s.coords);

  const stableCoords = useMemo(() => {
    if (!coords) return { lat: null, lng: null };

    return getRoundedCoords(coords);
  }, [coords]);

  const { myPlaces } = useLoadMapPlaces(stableCoords);
  useSearchPlaces(mapRef, stableCoords);
  useLoadSavedPlacesOnFocus();

  const phase = useSearchStore((s) => s.phase);
  const items = useSearchStore((s) => s.items);
  const focused = useSearchStore((s) => s.focused);
  const pendingDetailGid = useSearchStore((s) => s.pendingDetailGid);

  const reset = useSearchStore((s) => s.reset);
  const focus = useSearchStore((s) => s.focus);
  const unfocus = useSearchStore((s) => s.unfocus);
  const clearPendingDetail = useSearchStore((s) => s.clearPendingDetail);

  const analyzeVisible = useAnalyzeResultStore((s) => s.visible);
  const analyzePlaces = useAnalyzeResultStore((s) => s.places);
  const clearAnalyze = useAnalyzeResultStore((s) => s.clear);
  const closeAnalyze = useAnalyzeResultStore((s) => s.close);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    (async () => {
      await refreshOnce();
      mapRef.current?.setLocationTrackingMode("Follow");
    })();
  }, [refreshOnce]);

  useEffect(() => {
    console.log("[Map] analyzeVisible:", analyzeVisible);
    console.log("[Map] analyzePlaces:", analyzePlaces.length);
  }, [analyzeVisible, analyzePlaces]);

  useEffect(() => {
    if (!pendingDetailGid || !coords) return;

    let cancelled = false;
    const gid = pendingDetailGid;
    const { lat, lng } = coords;

    (async () => {
      try {
        const detail = await fetchPlaceDetail({ gid, lat, lng });

        if (cancelled) return;

        clearPendingDetail();
        focus(detail);
        setSelectedPlaceId(detail.placeId);

        if (isFinite(detail.lat) && isFinite(detail.lng)) {
          mapRef.current?.animateCameraTo({
            latitude: detail.lat,
            longitude: detail.lng,
            zoom: 16,
            duration: 0,
            easing: "EaseIn",
          });
        }
      } catch (e) {
        if (cancelled) return;

        clearPendingDetail();
        console.error("❌ pending place detail fetch 실패:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingDetailGid, coords, clearPendingDetail, focus]);

  const moveToCurrentLocation = async () => {
    try {
      await refreshOnce();

      const latestCoords = useLocationStore.getState().coords;

      if (latestCoords) {
        mapRef.current?.animateCameraTo({
          latitude: latestCoords.lat,
          longitude: latestCoords.lng,
          zoom: 16,
          duration: 0,
          easing: "EaseIn",
        });
      } else {
        throw new Error("coords is null");
      }
    } catch (error) {
      Alert.alert("위치 확인 실패", "현재 위치를 가져올 수 없습니다.");
      console.error("❌ 위치 이동 실패:", error);
    }
  };

  const handlePressSearchItem = (placeId: string) => {
    const target = items.find((p) => p.id === placeId);
    if (target && isFinite(target.lat) && isFinite(target.lng)) {
      mapRef.current?.animateCameraTo({
        latitude: target.lat,
        longitude: target.lng,
        zoom: 16,
        duration: 0,
        easing: "EaseIn",
      });
    }
  };

  const showPlacesSheet = phase === "idle" && !focused && !analyzeVisible;
  const showSearchListSheet = phase !== "idle" && !focused && !analyzeVisible;
  const showSearchDetailSheet = !!focused && !analyzeVisible;

  const PIN_W = 52;
  const PIN_H = 58;
  const PIN_SCALE = 1.5;

  const handlePressMarker = async (place: ApiMapPlace) => {
    const gid = place.gid;

    if (!gid || !coords) return;

    setSelectedPlaceId(place.placeId);

    try {
      const detail = await fetchPlaceDetail({
        gid,
        lat: coords.lat,
        lng: coords.lng,
      });

      focus(detail);

      if (isFinite(detail.lat) && isFinite(detail.lng)) {
        mapRef.current?.animateCameraTo({
          latitude: detail.lat,
          longitude: detail.lng,
          zoom: 16,
          duration: 0,
          easing: "EaseIn",
        });
      }
    } catch (e) {
      console.error("❌ place detail fetch 실패:", e);
    }
  };

  const savePlacesRequest = async (placeIds: number[]) => {
    try {
      await savePlaces({
        placeIds,
        saveType: "instagram",
      });

      clearAnalyze();
    } catch (err) {
      Alert.alert("오류", "장소 저장에 실패했습니다.");
    }
  };

  const handleConfirmSavedPlaces = (ids: string[]) => {
    if (!ids.length) {
      Alert.alert("알림", "저장할 장소를 선택해주세요.");
      return;
    }

    const placeIds = ids
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id));

    if (!placeIds.length) {
      Alert.alert("오류", "유효한 장소 ID가 없습니다.");
      return;
    }

    savePlacesRequest(placeIds);
  };
  return (
    <View style={styles.container}>
      {/* 검색창 */}
      <MapSearchBar />

      {/* 지도 */}
      <NaverMapView
        ref={mapRef}
        isShowLocationButton={false}
        onInitialized={() => {
          mapRef.current?.setLocationTrackingMode("None" as any);
        }}
        style={[styles.map, StyleSheet.absoluteFillObject]}
      >
        {/* 커스텀 사용자 마커 */}
        <UserLocationMarker enableRotation />

        {/* 저장한 장소 핀들 */}
        {myPlaces.map((p) => {
          const isSelected = selectedPlaceId === p.placeId;
          const w = isSelected ? Math.round(PIN_W * PIN_SCALE) : PIN_W;
          const h = isSelected ? Math.round(PIN_H * PIN_SCALE) : PIN_H;

          return (
            <NaverMapMarkerOverlay
              key={String(p.placeId)}
              latitude={p.latitude}
              longitude={p.longitude}
              image={getMapPinImage(p.list)}
              width={w}
              height={h}
              zIndex={isSelected ? 999 : 1}
              onTap={() => handlePressMarker(p)}
            />
          );
        })}
      </NaverMapView>

      {/* 바텀 시트*/}
      {analyzeVisible ? (
        <SavePlacesBottomSheet
          visible={analyzeVisible}
          places={analyzePlaces}
          initialSelectedIds={[]}
          onClose={() => {
            if (!useAnalyzeResultStore.getState().visible) return;
            closeAnalyze();
          }}
          onChangeSelection={() => {}}
          onConfirm={handleConfirmSavedPlaces}
        />
      ) : (
        <>
          {showPlacesSheet && (
            <PlacesBottomSheetContainer
              onPressMyLocation={moveToCurrentLocation}
            />
          )}

          {showSearchListSheet && (
            <SearchDetailsBottomSheet
              onClose={() => reset()}
              onPressItem={handlePressSearchItem}
            />
          )}

          {showSearchDetailSheet && (
            <SearchDetailBottomSheet
              onClose={() => {
                setSelectedPlaceId(null);
                unfocus();
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { zIndex: 0, flex: 1 },

  resultList: {
    position: "absolute",
    top: 60 + 60 + 8, // 검색창 아래 여백
    left: 17,
    right: 17,
    backgroundColor: "white",
    maxHeight: 1000,
    borderRadius: 8,
    zIndex: 10,
  },

  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
  },

  resultTitle: {
    fontSize: 15,
    fontWeight: "500",
  },

  resultAddress: {
    fontSize: 12,
    color: Colors.gray_400,
    marginTop: 2,
  },
});
