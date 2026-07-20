// React / React Native
import React, { useEffect, useRef, useState, useCallback } from "react";
import { SafeAreaView, StyleSheet, View, Animated } from "react-native";

// Routing
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

// types and constants
import {
  type HomeScope,
  type HomePlaceItem,
  type HomeMarker,
  HomeTabKey,
} from "@/src/components/home/types";
import type { SelectedUser as StorySelectedUser } from "@/src/components/home/StoryList";
import { HOME_DISTANCE } from "@/src/components/home/constants";

// Map
import type { NaverMapViewRef } from "@mj-studio/react-native-naver-map";

// Components
import { TopBar } from "@/src/components/home/TopBar";
import { HomeHeader } from "@/src/components/home/HomeHeader";
import { MapTabSection } from "@/src/components/home/MapTabSection";
import { PlaceTabSection } from "@/src/components/home/PlaceTabSection";
import { TabBar } from "@/src/components/home/TabBar";
import SearchDetailBottomSheet from "@/src/components/bottomSheet/SearchDetailBottomSheet";

// API
import {
  fetchHomeMain,
  fetchHomeMe,
  fetchHomePlacesMain,
  fetchHomePlacesMe,
  fetchHomePlacesUser,
  fetchHomeUser,
} from "@/src/lib/api/home";
import {
  toggleBookmarkApi,
  type BookmarkSource,
} from "@/src/lib/api/bookmark";
import { fetchPlaceDetail } from "@/src/lib/api/search";
import { fetchPlaceMore } from "@/src/lib/api/places";

// Stores
import { useAuthStore } from "@/src/stores/useAuthStore";
import { useFriendsStore } from "@/src/stores/useFriendsStore";
import { useLocationStore } from "@/src/stores/useLocationStore";
import { useMyProfileStore } from "@/src/stores/useMyProfileStore";
import { useSearchStore } from "@/src/stores/useSearchStore";

// Hooks
import { useAutoHideHeader } from "@/src/hooks/useAutoHideHeader";

// Styles
import { Colors } from "@/src/styles/Colors";

type RootTabParamList = {
  index: undefined;
  map: undefined;
  profile: undefined;
};

export default function Home() {
  const {
    selectedFriendId,
    selectedFriendNickname,
    selectedFriendUserId,
    selectedFriendBio,
    selectedFriendAvatarUrl,
    friendSelectionKey,
  } = useLocalSearchParams<{
    selectedFriendId?: string;
    selectedFriendNickname?: string;
    selectedFriendUserId?: string;
    selectedFriendBio?: string;
    selectedFriendAvatarUrl?: string;
    friendSelectionKey?: string;
  }>();
  const [selectedUser, setSelectedUser] = useState<StorySelectedUser | null>(
    null,
  );

  const [scope, setScope] = useState<HomeScope>({ type: "friends" });
  const [activeTab, setActiveTab] = useState<HomeTabKey>("map");
  const [markers, setMarkers] = useState<HomeMarker[]>([]);
  const [placeList, setPlaceList] = useState<HomePlaceItem[]>([]);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);

  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList, "index">>();

  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const refreshOnce = useLocationStore((state) => state.refreshOnce);
  const coords = useLocationStore((state) => state.coords);

  const friends = useFriendsStore((state) => state.friends);
  const loadFriends = useFriendsStore((state) => state.loadFriends);

  const fetchMyProfile = useMyProfileStore((state) => state.fetchMyProfile);

  const lat = coords?.lat;
  const lng = coords?.lng;

  const mapRef = useRef<NaverMapViewRef>(null);

  const [didInitCamera, setDidInitCamera] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);

  const focusedPlace = useSearchStore((state) => state.focused);
  const focusPlace = useSearchStore((state) => state.focus);
  const unfocusPlace = useSearchStore((state) => state.unfocus);

  const {
    isHeaderReady,
    animatedHeaderStyle,
    handleHeaderLayout,
    handleScrollDirection,
    showHeader,
  } = useAutoHideHeader();

  useEffect(() => {
    const friendId = Number(selectedFriendId);
    if (!friendSelectionKey || !Number.isFinite(friendId)) return;

    const profileImage = selectedFriendAvatarUrl
      ? { uri: selectedFriendAvatarUrl }
      : require("@/assets/images/default-profile.png");

    setSelectedUser({
      scope: "friend",
      userId: friendId,
      userIdText: selectedFriendUserId ?? "",
      nickname: selectedFriendNickname ?? "",
      bio: selectedFriendBio ?? "",
      profileImage,
    });
    setScope({ type: "friend", userId: friendId });
    setActiveTab("map");
    setSelectedPlaceId(null);
    setMarkers([]);
    setPlaceList([]);
    setDidInitCamera(false);
    unfocusPlace();
    showHeader();
  }, [
    friendSelectionKey,
    selectedFriendAvatarUrl,
    selectedFriendBio,
    selectedFriendId,
    selectedFriendNickname,
    selectedFriendUserId,
    showHeader,
    unfocusPlace,
  ]);

  useEffect(() => {
    return navigation.addListener("tabPress", () => {
      // 다른 탭에서 홈으로 진입하는 일반 탭 클릭은 기존 흐름을 유지한다.
      if (!navigation.isFocused()) return;

      setSelectedUser(null);
      setScope({ type: "friends" });
      setActiveTab("map");
      setSelectedPlaceId(null);
      setMarkers([]);
      setPlaceList([]);
      setDidInitCamera(false);
      unfocusPlace();
      showHeader();
      setHomeRefreshKey((current) => current + 1);

      // 이미 MAP 화면이었다면 activeTab이 바뀌지 않아 위치 effect가 재실행되지 않는다.
      if (activeTab === "map") {
        void refreshOnce?.();
      }
    });
  }, [activeTab, navigation, refreshOnce, showHeader, unfocusPlace]);

  useEffect(() => {
    showHeader();
  }, [activeTab, showHeader]);

  useEffect(() => {
    if (activeTab !== "map") {
      setSelectedPlaceId(null);
      unfocusPlace();
    }
  }, [activeTab, unfocusPlace]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelectedPlaceId(null);
        unfocusPlace();
      };
    }, [unfocusPlace]),
  );

  useEffect(() => {
    if (activeTab !== "map") return;
    refreshOnce?.();
    setDidInitCamera(false);
  }, [activeTab, refreshOnce]);

  useEffect(() => {
    if (activeTab !== "map") return;
    if (lat == null || lng == null) return;
    if (didInitCamera) return;

    mapRef.current?.animateCameraTo?.({
      latitude: lat,
      longitude: lng,
      zoom: 16,
      duration: 400,
    });

    setDidInitCamera(true);
  }, [activeTab, lat, lng, didInitCamera]);

  useFocusEffect(
    useCallback(() => {
      if (!hasHydrated) return;
      if (!token) return;

      fetchMyProfile();
      loadFriends();
    }, [hasHydrated, token, loadFriends, fetchMyProfile]),
  );

  useEffect(() => {
    if (activeTab !== "map") return;
    if (lat == null || lng == null) return;

    let cancelled = false;

    (async () => {
      try {
        const toMarkerKey = (prefix: string, p: any, fallbackIdx: number) => {
          const id =
            p?.placeId ?? p?.id ?? p?.gid ?? p?.gId ?? p?.num ?? fallbackIdx;
          return `${prefix}-${String(id)}`;
        };

        const getHomePlaces = (data: any) =>
          Array.isArray(data) ? data : (data?.places ?? []);

        const toMarker = (
          prefix: string,
          p: any,
          idx: number,
        ): HomeMarker | null => {
          const markerLat = Number(p?.lat ?? p?.latitude);
          const markerLng = Number(p?.lng ?? p?.longitude);

          if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) {
            return null;
          }

          return {
            key: toMarkerKey(prefix, p, idx),
            lat: markerLat,
            lng: markerLng,
            imageUrl: p?.photo ?? p?.imageUrl,
            raw: p,
          };
        };

        const toFriendMarker = (
          p: Awaited<ReturnType<typeof fetchHomeUser>>[number],
          idx: number,
          userId: number,
        ): HomeMarker => ({
          key: toMarkerKey(`friend-${userId}`, p, idx),
          lat: p.latitude,
          lng: p.longitude,
          raw: p,
        });

        if (scope.type === "friends") {
          const data = await fetchHomeMain({
            lat,
            lng,
            distance: HOME_DISTANCE,
          });
          if (cancelled) return;

          const next: HomeMarker[] = getHomePlaces(data)
            .map((p: any, idx: number) => toMarker("main", p, idx))
            .filter(
              (marker: HomeMarker | null): marker is HomeMarker =>
                marker != null,
            );

          setMarkers(next);
          return;
        }

        if (scope.type === "me") {
          const data = await fetchHomeMe({ lat, lng, distance: HOME_DISTANCE });
          if (cancelled) return;

          const next: HomeMarker[] = getHomePlaces(data)
            .map((p: any, idx: number) => toMarker("me", p, idx))
            .filter(
              (marker: HomeMarker | null): marker is HomeMarker =>
                marker != null,
            );

          setMarkers(next);
          return;
        }

        const data = await fetchHomeUser({
          userId: scope.userId,
          lat,
          lng,
          distance: HOME_DISTANCE,
        });
        if (cancelled) return;

        const next: HomeMarker[] = data.map((p, idx) =>
          toFriendMarker(p, idx, scope.userId),
        );

        setMarkers(next);
      } catch (e: any) {
        console.log("홈 화면 지도 탭 데이터 fetch 오류:", {
          message: e?.message,
          status: e?.response?.status,
          data: e?.response?.data,
        });
        setMarkers([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, scope, lat, lng, homeRefreshKey]);

  const handleTogglePlaceBookmark = useCallback(
    async (place: HomePlaceItem) => {
      const placeId = getHomePlaceId(place);

      if (placeId == null) {
        console.warn("[Home.PlaceTab] placeId is null, cannot toggle bookmark");
        return;
      }

      const previousMarked = place.marked;
      const nextMarked = !previousMarked;

      setPlaceList((current) =>
        current.map((item) =>
          getHomePlaceId(item) === placeId
            ? { ...item, marked: nextMarked }
            : item,
        ),
      );

      try {
        const serverMarked = await toggleBookmarkApi(
          placeId,
          getBookmarkSource(scope),
        );
        const finalMarked = serverMarked ?? nextMarked;

        setPlaceList((current) =>
          current.map((item) =>
            getHomePlaceId(item) === placeId
              ? { ...item, marked: finalMarked }
              : item,
          ),
        );
      } catch (error) {
        console.error("[Home.PlaceTab] toggleBookmark failed:", error);
        setPlaceList((current) =>
          current.map((item) =>
            getHomePlaceId(item) === placeId
              ? { ...item, marked: previousMarked }
              : item,
          ),
        );
      }
    },
    [scope],
  );

  useEffect(() => {
    if (activeTab !== "place") return;
    if (lat == null || lng == null) return;

    let cancelled = false;

    (async () => {
      try {
        let list: HomePlaceItem[] = [];

        if (scope.type === "friends") {
          list = await fetchHomePlacesMain({ lat, lng });
        } else if (scope.type === "me") {
          list = await fetchHomePlacesMe({ lat, lng });
        } else {
          list = await fetchHomePlacesUser({ userId: scope.userId, lat, lng });
        }

        if (cancelled) return;
        setPlaceList(list);
      } catch (e: any) {
        console.log("PLACE 탭 fetch error:", {
          message: e?.message,
          status: e?.response?.status,
          data: e?.response?.data,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, scope, lat, lng]);

  const handleSelectStory = (user: StorySelectedUser | null) => {
    if (!user) {
      setSelectedUser(null);
      setScope({ type: "friends" });
      return;
    }

    setSelectedUser(user);

    if (user.scope === "me") {
      setScope({ type: "me" });
      return;
    }

    if (user.scope === "friend" && typeof user.userId === "number") {
      setScope({ type: "friend", userId: user.userId });
    }
  };

  const moveToCurrentLocation = async () => {
    await refreshOnce?.();

    const c = useLocationStore.getState().coords;
    if (!c) return;

    mapRef.current?.animateCameraTo?.({
      latitude: c.lat,
      longitude: c.lng,
      zoom: 16,
      duration: 400,
    });
  };

  const handlePressMapMarker = async (marker: HomeMarker) => {
    if (lat == null || lng == null) return;

    const placeId = getHomeMarkerPlaceId(marker);
    let gid = getHomeMarkerGid(marker);

    console.log("[Home.MapTab] marker pressed", {
      markerKey: marker.key,
      placeId,
      hasGid: gid != null,
    });

    if (placeId != null) {
      setSelectedPlaceId(placeId);
    }

    if (!gid && placeId != null) {
      try {
        const more = await fetchPlaceMore({ placeId, lat, lng });
        gid = normalizeGid(more.places?.gId);
      } catch (e: any) {
        console.error("[Home.MapTab] failed to resolve gid", {
          placeId,
          message: e?.message,
          status: e?.response?.status,
        });
        return;
      }
    }

    if (!gid) {
      console.warn("[Home.MapTab] gid is missing, cannot load search detail", {
        markerKey: marker.key,
        placeId,
      });
      return;
    }

    try {
      const detail = await fetchPlaceDetail({ gid, lat, lng });
      setSelectedPlaceId(detail.placeId);
      focusPlace(detail);

      if (Number.isFinite(detail.lat) && Number.isFinite(detail.lng)) {
        mapRef.current?.animateCameraTo?.({
          latitude: detail.lat,
          longitude: detail.lng,
          zoom: 16,
          duration: 400,
        });
      }
    } catch (e: any) {
      console.log("[Home.MapTab] place detail fetch error:", {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
    }
  };

  const handlePressTab = (tab: HomeTabKey) => {
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopBar />

      {!isHeaderReady ? (
        <View onLayout={handleHeaderLayout}>
          <HomeHeader
            friends={friends}
            selectedUser={selectedUser}
            onSelectStory={handleSelectStory}
            showUserCard={false}
          />
        </View>
      ) : (
        <Animated.View
          style={[styles.animatedHeaderContainer, animatedHeaderStyle]}
        >
          <HomeHeader
            friends={friends}
            selectedUser={selectedUser}
            onSelectStory={handleSelectStory}
            showUserCard={false}
          />
        </Animated.View>
      )}

      {selectedUser ? (
        <View style={styles.userCardSection}>
          <HomeHeader
            friends={[]}
            selectedUser={selectedUser}
            onSelectStory={handleSelectStory}
            showStoryList={false}
          />
        </View>
      ) : null}

      <View style={styles.bodyContainer}>
        <TabBar activeTab={activeTab} onPressTab={handlePressTab} />

        <View style={styles.tabContent}>
          {activeTab === "map" && (
            <MapTabSection
              mapRef={mapRef}
              markers={markers}
              selectedPlaceId={selectedPlaceId}
              isCommentOpen={!!focusedPlace}
              onPressCurrentLocation={moveToCurrentLocation}
              onPressMarker={handlePressMapMarker}
            />
          )}

          {activeTab === "place" && (
            <PlaceTabSection
              placeList={placeList}
              currentCoords={coords}
              bookmarkSource={getBookmarkSource(scope)}
              onScrollDirection={handleScrollDirection}
              onToggleBookmark={handleTogglePlaceBookmark}
            />
          )}

          {/* {activeTab === "comment" && (
            <CommentTabSection
              scope={scope}
              commentList={commentList}
              onScrollDirection={handleScrollDirection}
            />
          )} */}
        </View>
      </View>

      {activeTab === "map" && focusedPlace ? (
        <SearchDetailBottomSheet
          bookmarkSource={getBookmarkSource(scope)}
          onClose={() => {
            setSelectedPlaceId(null);
            unfocusPlace();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function getHomePlaceId(place: HomePlaceItem) {
  if (typeof place.placeId === "number" && Number.isFinite(place.placeId)) {
    return place.placeId;
  }

  if (typeof place.id === "number" && Number.isFinite(place.id)) {
    return place.id;
  }

  return null;
}

function getHomeMarkerGid(marker: HomeMarker) {
  const raw = marker.raw ?? {};
  return normalizeGid(raw.gid ?? raw.gId ?? raw.g_id);
}

function normalizeGid(gid: unknown) {
  if (gid == null) return null;

  const normalized = String(gid).trim();
  return normalized.length > 0 ? normalized : null;
}

function getHomeMarkerPlaceId(marker: HomeMarker) {
  const raw = marker.raw ?? {};
  const placeId = Number(raw.placeId ?? raw.id);

  return Number.isFinite(placeId) ? placeId : null;
}

function getBookmarkSource(scope: HomeScope): BookmarkSource {
  return scope.type === "friend"
    ? { sourceType: "friend_profile", sourceUserId: scope.userId }
    : { sourceType: "search" };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  animatedHeaderContainer: {
    overflow: "hidden",
    backgroundColor: Colors.white,
  },

  userCardSection: {
    backgroundColor: Colors.white,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
  },

  bodyContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: 20,
  },

  tabContent: {
    flex: 1,
  },
});
