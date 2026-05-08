// app/searchPlace.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  SafeAreaView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";
import { useLocationStore } from "@/src/stores/useLocationStore";
import RecentSearch from "@/src/components/search/recentSearch";
import SearchResult from "@/src/components/search/searchResult";
import { useSearchStore } from "@/src/stores/useSearchStore";
import { useRecentSearchStore } from "@/src/stores/useRecentSearchStore";
import { fetchSearch } from "@/src/lib/api/search";
import type { SearchItem, SearchPayload } from "@/src/types/search";

export type RecentItem = {
  id: string;
  keyword: string;
};

export default function SearchPlaceScreen() {
  const [searchInputText, setSearchInputText] = useState("");
  const { coords, refreshOnce } = useLocationStore();
  const [results, setResults] = useState<SearchItem[] | null>(null);

  const showRecent = !searchInputText || results === null;
  const showResults = Array.isArray(results) && results.length > 0;

  const submit = useSearchStore((s) => s.submit);
  const requestDetail = useSearchStore((s) => s.requestDetail);

  const recent = useRecentSearchStore((s) => s.items);
  const recentLoading = useRecentSearchStore((s) => s.loading);
  const fetchRecent = useRecentSearchStore((s) => s.fetch);
  const addRecent = useRecentSearchStore((s) => s.add);
  const removeRecent = useRecentSearchStore((s) => s.remove);

  // 마운트 시 한 번 로드
  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  // 컴포넌트 진입 시 좌표가 없으면 한 번 갱신 시도(선택)
  useEffect(() => {
    if (!coords) {
      refreshOnce().catch(() => {});
    }
  }, [coords, refreshOnce]);

  // ---- 디바운싱 + 최신요청만 처리 ----
  const debounceMs = 400;
  const timerRef = useRef<number | null>(null);
  const reqSeqRef = useRef(0); // 증가하는 요청 id
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // trim + 최소 길이 조건(원하면 조정)
    const keyword = searchInputText.trim();
    if (!keyword || keyword.length < 1) {
      // 키워드 없으면 진행 안 함 (필요 시 검색 초기화 로직 추가)
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setResults(null);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // 이전 fetch 중단
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      const controller = new AbortController();
      abortRef.current = controller;

      const seq = ++reqSeqRef.current;
      try {
        const latestCoords = useLocationStore.getState().coords;

        if (latestCoords) {
          const params: SearchPayload = {
            keyword,
            lat: latestCoords.lat,
            lng: latestCoords.lng,
          };

          const data = await fetchSearch(params, { signal: controller.signal });

          if (seq !== reqSeqRef.current) return;
          setResults(data);
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
          return;
        }
        console.warn(
          "검색 요청 에러:",
          err?.response?.status,
          err?.response?.data ?? err.message,
        );
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchInputText, coords]);

  useEffect(() => {
    return () => {
      // 언마운트 시 진행 중 요청 취소
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const submitAndGo = useCallback(
    (keywordRaw?: string) => {
      const keyword = (keywordRaw ?? searchInputText).trim();
      if (!keyword) return;
      void addRecent(keyword);
      submit(keyword);
      router.replace("/map"); // 홈으로 복귀 → 홈에서 API 호출/시트 렌더
    },
    [addRecent, searchInputText, submit],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 바: 뒤로가기 + TextInput */}
      <View style={styles.header}>
        <View style={styles.inputWrap}>
          <Pressable onPress={() => submitAndGo()}>
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
            placeholder="지역, 상호명을 검색해보세요"
            value={searchInputText}
            onChangeText={setSearchInputText}
            placeholderTextColor={Colors.gray_300}
            style={styles.inputText}
            returnKeyType="search"
            onSubmitEditing={() => submitAndGo()} // 엔터 제출
          />

          {/* 검색어 지우기 버튼 */}
          {searchInputText ? (
            <Pressable onPress={() => setSearchInputText("")}>
              <Image
                source={require("@/assets/images/x-gray.png")}
                style={styles.xIcon}
              />
            </Pressable>
          ) : null}
        </View>

        {/* 취소 버튼 */}
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backBtn}>취소</Text>
        </Pressable>
      </View>

      {/* 바디 */}
      <View style={styles.body}>
        {showRecent && (
          <RecentSearch
            items={recent}
            loading={recentLoading}
            onTapKeyword={(k) => setSearchInputText(k)}
            onRemoveKeyword={(keyword, id) => removeRecent(keyword, id)}
          />
        )}

        {!showRecent && !showResults && (
          <Text style={TextStyles.Medium16}>검색 결과가 없어요.</Text>
        )}

        {showResults && (
          <SearchResult
            data={results!}
            onPressItem={(place) => {
              void addRecent(place.name);

              // ✅ 상세 조회 요청 신호 남기기 (스토어에 pendingDetailGid 저장)
              requestDetail(place.gid);

              // ✅ 홈으로 이동 → index.tsx useEffect에서 /search/detail 호출
              router.replace("/map");
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    alignItems: "center",
    paddingBottom: 12,
    gap: 12,
  },
  leftArrow: {
    width: 24,
    height: 24,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  searchIcon: {
    width: 24,
    height: 24,
    marginRight: 9,
  },
  inputText: {
    ...TextStyles.Medium16,
    flex: 1,
  },
  xIcon: {
    width: 24,
    height: 24,
  },
  backBtn: {
    ...TextStyles.Medium16,
    color: Colors.gray_800,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 5,
  },
});
