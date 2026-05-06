// React / React Native
import React, { useEffect, useRef, useState, useCallback } from "react";
import { SafeAreaView, StyleSheet, View, Animated } from "react-native";

// Routing
import { useFocusEffect } from "expo-router";

// types and constants
import {
  type HomeScope,
  type HomeCommentItem,
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
import { CommentTabSection } from "@/src/components/home/CommentTabSection";
import { TabBar } from "@/src/components/home/TabBar";
import CommentBottomSheet, {
  type CommentBottomSheetHandle,
} from "@/src/components/comment/CommentBottomSheet";

// API
import {
  fetchHomeCommentsMain,
  fetchHomeCommentsMe,
  fetchHomeCommentsUser,
  fetchHomeMain,
  fetchHomeMe,
  fetchHomePlacesMain,
  fetchHomePlacesMe,
  fetchHomePlacesUser,
  fetchHomeUser,
} from "@/src/lib/api/home";
import { fetchPlaceMore } from "@/src/lib/api/places";

// Stores
import { useAuthStore } from "@/src/stores/useAuthStore";
import { useFriendsStore } from "@/src/stores/useFriendsStore";
import { useLocationStore } from "@/src/stores/useLocationStore";
import { useMyProfileStore } from "@/src/stores/useMyProfileStore";

// Hooks
import { useAutoHideHeader } from "@/src/hooks/useAutoHideHeader";

// Styles
import { Colors } from "@/src/styles/Colors";

export default function Home() {
  const [selectedUser, setSelectedUser] = useState<StorySelectedUser | null>(
    null,
  );

  const [scope, setScope] = useState<HomeScope>({ type: "friends" });
  const [activeTab, setActiveTab] = useState<HomeTabKey>("map");
  const [markers, setMarkers] = useState<HomeMarker[]>([]);
  const [placeList, setPlaceList] = useState<HomePlaceItem[]>([]);
  const [commentList, setCommentList] = useState<HomeCommentItem[]>([]);

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
  const commentSheetRef = useRef<CommentBottomSheetHandle>(null);

  const [didInitCamera, setDidInitCamera] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [morePlace, setMorePlace] = useState<any>(null);
  const [moreComments, setMoreComments] = useState<any[]>([]);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [isCommentOpen, setIsCommentOpen] = useState(false);

  const {
    isHeaderReady,
    animatedHeaderStyle,
    handleHeaderLayout,
    handleScrollDirection,
    showHeader,
  } = useAutoHideHeader();

  useEffect(() => {
    showHeader();
  }, [activeTab, showHeader]);

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
          const id = p?.placeId ?? p?.id ?? p?.gid ?? p?.num ?? fallbackIdx;
          return `${prefix}-${String(id)}`;
        };

        if (scope.type === "friends") {
          const data = await fetchHomeMain({
            lat,
            lng,
            distance: HOME_DISTANCE,
          });
          if (cancelled) return;

          const next: HomeMarker[] = (data.places ?? []).map((p: any, idx) => ({
            key: toMarkerKey("main", p, idx),
            lat: p.lat,
            lng: p.lng,
            imageUrl: p.photo,
            raw: p,
          }));

          setMarkers(next);
          return;
        }

        if (scope.type === "me") {
          const data = await fetchHomeMe({ lat, lng, distance: HOME_DISTANCE });
          if (cancelled) return;

          const next: HomeMarker[] = (data.places ?? []).map((p: any, idx) => ({
            key: toMarkerKey("me", p, idx),
            lat: p.lat,
            lng: p.lng,
            imageUrl: p.photo,
            raw: p,
          }));

          setMarkers(next);
          return;
        }

        const data = await fetchHomeUser({
          userId: scope.userId,
          lat,
          lng,
          distance: HOME_DISTANCE,
          includeMarkerBadgeLayout: true,
        });
        if (cancelled) return;

        const next: HomeMarker[] = (data.places ?? []).map((p: any, idx) => ({
          key: toMarkerKey(`friend-${scope.userId}`, p, idx),
          lat: p.lat,
          lng: p.lng,
          imageUrl: p.photo,
          raw: p,
        }));

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
  }, [activeTab, scope, lat, lng]);

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

  useEffect(() => {
    if (activeTab !== "comment") return;
    if (lat == null || lng == null) return;

    let cancelled = false;

    (async () => {
      try {
        let list: HomeCommentItem[] = [];

        if (scope.type === "friends") {
          list = await fetchHomeCommentsMain({ lat, lng, page: 0, size: 10 });
        } else if (scope.type === "me") {
          list = await fetchHomeCommentsMe({ lat, lng, page: 0, size: 10 });
        } else {
          list = await fetchHomeCommentsUser({
            userId: scope.userId,
            lat,
            lng,
            page: 0,
            size: 10,
          });
        }

        if (cancelled) return;
        setCommentList(list);
      } catch (e: any) {
        console.log("[home-comment] fetch error:", {
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

  const loadPlaceDetail = async (placeId: number) => {
    if (lat == null || lng == null) return;

    setMoreLoading(true);
    setMoreError(null);

    try {
      const data = await fetchPlaceMore({ lat, lng, placeId });
      setMorePlace(data.places ?? null);
      setMoreComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (e: any) {
      setMoreError(e?.message ?? "failed");
      setMorePlace(null);
      setMoreComments([]);
    } finally {
      setMoreLoading(false);
    }
  };

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

  const handlePressMapMarker = (placeId: number) => {
    setSelectedPlaceId(placeId);
    commentSheetRef.current?.open(0);
    loadPlaceDetail(placeId);
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
            selectedUser={null}
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
            selectedUser={null}
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
              isCommentOpen={isCommentOpen}
              onPressCurrentLocation={moveToCurrentLocation}
              onPressMarker={handlePressMapMarker}
            />
          )}

          {activeTab === "place" && (
            <PlaceTabSection
              placeList={placeList}
              currentCoords={coords}
              onScrollDirection={handleScrollDirection}
            />
          )}

          {activeTab === "comment" && (
            <CommentTabSection
              scope={scope}
              commentList={commentList}
              onScrollDirection={handleScrollDirection}
            />
          )}
        </View>
      </View>

      <CommentBottomSheet
        ref={commentSheetRef}
        onOpen={() => setIsCommentOpen(true)}
        onClose={() => setIsCommentOpen(false)}
        placeId={selectedPlaceId}
        place={morePlace}
        comments={moreComments}
        loading={moreLoading}
        error={moreError}
        onRetry={() => {
          if (selectedPlaceId != null) loadPlaceDetail(selectedPlaceId);
        }}
      />
    </SafeAreaView>
  );
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
