import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  SafeAreaView,
  Image,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";
import RecentFriendSearch from "@/src/components/friends/RecentFriendSearch";
import FriendSearchResult from "@/src/components/friends/FriendSearchResult";
import {
  searchFriends,
  sendFollowRequest,
  acceptFollowRequest,
  deleteFriend,
  type FriendSearchItem,
} from "@/src/lib/api/friends";
import { useFriendsStore } from "@/src/stores/useFriendsStore";
import { useRecentFriendSearchStore } from "@/src/stores/useRecentFriendSearchStore";
import { useMyProfileStore } from "@/src/stores/useMyProfileStore";

export default function SearchFriendScreen() {
  const [searchInputText, setSearchInputText] = useState("");
  const [results, setResults] = useState<FriendSearchItem[] | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const upsertFriend = useFriendsStore((s) => s.upsertFriend);
  const removeFriend = useFriendsStore((s) => s.removeFriend);
  const loadFriends = useFriendsStore((s) => s.loadFriends);
  const viewerId = useMyProfileStore((s) => s.profile?.id ?? null);

  const showRecent = !searchInputText || results === null;
  const showResults = Array.isArray(results) && results.length > 0;

  const recent = useRecentFriendSearchStore((s) => s.items);
  const recentLoading = useRecentFriendSearchStore((s) => s.loading);
  const fetchRecent = useRecentFriendSearchStore((s) => s.fetch);
  const addRecent = useRecentFriendSearchStore((s) => s.add);
  const removeRecent = useRecentFriendSearchStore((s) => s.remove);
  const clearRecent = useRecentFriendSearchStore((s) => s.clear);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const debounceMs = 400;
  const timerRef = useRef<number | null>(null);
  const reqSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const keyword = searchInputText.trim();

    if (!keyword) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setResults(null);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      const seq = ++reqSeqRef.current;

      try {
        const data = await searchFriends(keyword, controller.signal);

        if (seq !== reqSeqRef.current) return;
        setResults(data);
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
          return;
        }

        console.warn(
          "친구 검색 요청 에러:",
          err?.response?.status,
          err?.response?.data ?? err?.message,
        );

        if (seq !== reqSeqRef.current) return;
        setResults([]);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchInputText]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const submitAndSearch = useCallback(() => {
    const keyword = searchInputText.trim();
    if (!keyword) return;

    void addRecent({
      displayText: keyword,
      profilePhoto: null,
      targetId: null,
      viewerId,
    });
  }, [addRecent, searchInputText, viewerId]);

  const onSelectFriend = useCallback(
    (friend: FriendSearchItem) => {
      void addRecent({
        displayText: friend.nickname || friend.userId,
        profilePhoto: friend.profileImageUrl,
        searchType: friend.nickname ? "nickname" : "spot_id",
        targetId: friend.id,
        viewerId,
      });

      router.back();
    },
    [addRecent, viewerId],
  );

  const updateResultStatus = useCallback(
    (targetId: number, nextStatus: FriendSearchItem["status"]) => {
      setResults((prev) => {
        if (!prev) return prev;

        return prev.map((item) =>
          item.id === targetId ? { ...item, status: nextStatus } : item,
        );
      });
    },
    [],
  );

  const handlePressAction = useCallback(
    async (friend: FriendSearchItem) => {
      if (actionLoadingId === friend.id) return;

      try {
        setActionLoadingId(friend.id);

        switch (friend.status) {
          case "none": {
            await sendFollowRequest(friend.id);
            updateResultStatus(friend.id, "request_sent");
            return;
          }

          case "request_received": {
            await acceptFollowRequest(friend.id);
            upsertFriend({
              id: friend.id,
              nickname: friend.nickname,
              userId: friend.userId,
              avatarUrl: friend.profileImageUrl,
              comment: friend.oneLine,
              status: "friends",
            });
            updateResultStatus(friend.id, "friends");
            void loadFriends({ force: true });
            return;
          }

          case "friends": {
            await deleteFriend(friend.id);
            removeFriend(friend.id);
            updateResultStatus(friend.id, "none");
            void loadFriends({ force: true });

            return;
          }

          case "request_sent": {
            return;
          }

          case "blocked": {
            return;
          }

          default: {
            return;
          }
        }
      } catch (err: any) {
        console.warn(
          "친구 액션 요청 에러:",
          err?.response?.status,
          err?.response?.data ?? err?.message,
        );
        Alert.alert("오류", "처리 중 문제가 발생했어요.");
      } finally {
        setActionLoadingId(null);
      }
    },
    [
      actionLoadingId,
      loadFriends,
      removeFriend,
      updateResultStatus,
      upsertFriend,
    ],
  );

  const mappedResults =
    results?.map((item) => ({
      ...item,
      status:
        actionLoadingId === item.id && item.status === "none"
          ? "request_sent"
          : item.status,
    })) ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.inputWrap}>
          <Pressable onPress={() => submitAndSearch()}>
            <Image
              source={
                searchInputText
                  ? require("@/assets/images/search-input-icon-black.png")
                  : require("@/assets/images/search-input-icon-gray.png")
              }
              style={styles.searchIcon}
            />
          </Pressable>

          <TextInput
            autoFocus
            placeholder="별명 또는 아이디를 입력해주세요"
            value={searchInputText}
            onChangeText={setSearchInputText}
            placeholderTextColor={Colors.gray_300}
            style={styles.inputText}
            returnKeyType="search"
            onSubmitEditing={() => submitAndSearch()}
          />

          {searchInputText ? (
            <Pressable
              onPress={() => {
                setSearchInputText("");
                setResults(null);
              }}
            >
              <Image
                source={require("@/assets/images/x-gray.png")}
                style={styles.xIcon}
              />
            </Pressable>
          ) : null}
        </View>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.backBtn}>취소</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {showRecent && (
          <RecentFriendSearch
            items={recent}
            loading={recentLoading}
            onTapKeyword={(k) => setSearchInputText(k)}
            onRemoveKeyword={(id) => removeRecent(id)}
            onClearAll={() => clearRecent()}
          />
        )}

        {!showRecent && !showResults && (
          <Text style={TextStyles.Medium16}>검색 결과가 없어요.</Text>
        )}

        {showResults && mappedResults && (
          <FriendSearchResult
            data={mappedResults}
            onPressItem={(friend) => onSelectFriend(friend)}
            onPressAction={handlePressAction}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    alignItems: "center",
    paddingBottom: 12,
    gap: 12,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  searchIcon: { width: 24, height: 24, marginRight: 9 },
  inputText: { ...TextStyles.Medium16, flex: 1 },
  xIcon: { width: 24, height: 24 },
  backBtn: { ...TextStyles.Medium16, color: Colors.gray_800 },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 5 },
});
