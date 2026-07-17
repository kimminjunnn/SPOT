// src/components/bottomSheet/CommentBottomSheet.tsx
import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  View,
  StyleSheet,
  Text,
  Image,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import Animated, { useSharedValue } from "react-native-reanimated";
import {
  toggleBookmarkApi,
  type BookmarkSource,
} from "@/src/lib/api/bookmark";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

import { CommentCard } from "./CommentCard";

export type MorePlace = {
  placeId: number;
  gId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  list: string;
  photo: string | string[] | null;
  ratingAvg: number;
  ratingCount: number;
  myRating: number;
  distance: number;
  isMarked: boolean;
  savers?: { nickname: string; profileImageUrl: string }[];
};

export type MoreComment = {
  id: number;
  placeId: number;
  gid: string;
  photos: string[];
  name: string;
  address: string;
  score: number;
  comment: string;
  memId: number;
  memEmail: string;
  commentPhoto: string;
  createdAt: string;
  marked: boolean;
  isLiked?: boolean;
};

export type CommentBottomSheetHandle = {
  open: (toIndex?: number) => void;
  close: () => void;
  snapTo: (index: number) => void;
};

type Props = {
  placeId: number | null;
  place: MorePlace | null;
  comments: MoreComment[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onClose?: () => void;
  onOpen?: () => void;
  bookmarkSource?: BookmarkSource;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_GAP = 10;
const PHOTO_SIZE = Math.floor((SCREEN_WIDTH - 32 - PHOTO_GAP * 2) / 3);

const safeUri = (u?: string | string[] | null) => {
  if (Array.isArray(u)) return safeUri(u[0]);
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return u;
};

const CommentBottomSheet = forwardRef<CommentBottomSheetHandle, Props>(
  (
    {
      placeId,
      place,
      comments,
      loading,
      error,
      onRetry,
      onClose,
      onOpen,
      bookmarkSource = { sourceType: "search" },
    },
    ref,
  ) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const animatedIndex = useSharedValue(0);

    const snapPoints = useMemo(() => ["55%", "77%", "92%"], []);

    const renderBackdrop = React.useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="none"
          opacity={1}
          style={[props.style, { backgroundColor: "#0000006E" }]}
        />
      ),
      [],
    );

    // place 바뀔 때마다 UI 북마크 상태도 place 기준으로 맞춤
    const [bookmarkedUi, setBookmarkedUi] = useState(false);
    useEffect(() => {
      setBookmarkedUi(Boolean(place?.isMarked));
    }, [place?.placeId, place?.isMarked]);

    useImperativeHandle(ref, () => ({
      open: (toIndex = 2) => bottomSheetRef.current?.snapToIndex(toIndex),
      close: () => bottomSheetRef.current?.snapToIndex(0),
      snapTo: (index: number) => bottomSheetRef.current?.snapToIndex(index),
    }));

    const handleToggleBookmark = async () => {
      if (!place) return;

      const next = !bookmarkedUi;

      // ✅ 낙관적 UI
      setBookmarkedUi(next);

      try {
        const serverMarked = await toggleBookmarkApi(
          place.placeId,
          bookmarkSource,
        );
        setBookmarkedUi(serverMarked ?? next);
      } catch {
        // ❌ 실패 시 롤백
        setBookmarkedUi(!next);
      }
    };

    const commentCount = comments?.length ?? 0;

    const heroPhoto = safeUri(place?.photo);

    const router = useRouter();

    const handlePressPlace = () => {
      if (!place) return;

      router.push({
        pathname: "/place/[placeId]",
        params: {
          placeId: String(place.placeId),
          sourceType: bookmarkSource.sourceType,
          sourceUserId:
            bookmarkSource.sourceUserId != null
              ? String(bookmarkSource.sourceUserId)
              : undefined,
          sourceCommentId:
            bookmarkSource.sourceCommentId != null
              ? String(bookmarkSource.sourceCommentId)
              : undefined,
        },
      });
    };
    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        animatedIndex={animatedIndex}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
        enablePanDownToClose
        onChange={(idx) => {
          if (idx === -1) onClose?.();
          else onOpen?.();
        }}
      >
        <BottomSheetScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* 상단 타이틀 */}
          <Animated.View style={[styles.topTitleRow]}>
            <Text style={styles.topTitleText}>
              코멘트 <Text style={styles.topTitleCount}>{commentCount}</Text>
            </Text>
          </Animated.View>

          {/* placeId 없으면 빈 상태 */}
          {!placeId ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>
                핀을 선택하면 코멘트를 보여줄게
              </Text>
            </View>
          ) : null}

          {/* 로딩 */}
          {placeId && loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator />
              <Text style={[styles.stateText, { marginTop: 10 }]}>
                불러오는 중...
              </Text>
            </View>
          ) : null}

          {/* 에러 */}
          {placeId && !loading && error ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>불러오지 못했어</Text>
              <Text style={[styles.stateSubText, { marginTop: 6 }]}>
                {error}
              </Text>
              <Pressable style={styles.retryBtn} onPress={onRetry}>
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 정상 UI */}
          {placeId && !loading && !error && place ? (
            <>
              {/* 히어로 카드 */}
              <Pressable style={styles.heroCard} onPress={handlePressPlace}>
                {heroPhoto ? (
                  <Image source={{ uri: heroPhoto }} style={styles.heroImage} />
                ) : (
                  <View
                    style={[StyleSheet.absoluteFillObject, styles.heroFallback]}
                  />
                )}

                <View style={styles.heroOverlay} />
                <Pressable
                  onPress={handleToggleBookmark}
                  hitSlop={10}
                  style={styles.bookmarkCircle}
                >
                  <Image
                    source={
                      bookmarkedUi
                        ? require("@/assets/images/bookmark-orange.png")
                        : require("@/assets/images/bookmark-orange-empty.png")
                    }
                    style={{ width: 20, height: 20 }}
                    resizeMode="contain"
                  />
                </Pressable>

                <View style={styles.heroTextArea}>
                  <View style={styles.ratingRow}>
                    <Image
                      style={styles.starIcon}
                      source={require("@/assets/images/star-orange.png")}
                    />
                    <Text style={styles.ratingText}>
                      {Number(place.ratingAvg ?? 0).toFixed(1)}{" "}
                      <Text style={styles.ratingCount}>
                        ({place.ratingCount ?? 0})
                      </Text>
                    </Text>
                  </View>

                  <Text style={styles.placeTitle}>{place.name}</Text>

                  <View style={styles.addressContainer}>
                    <Image
                      style={styles.addressIcon}
                      source={require("@/assets/images/marker-gray.png")}
                    />
                    <Text style={styles.placeAddress}>{place.address}</Text>
                  </View>
                </View>
              </Pressable>

              {/* 댓글 리스트 */}
              {comments.length === 0 ? (
                <View style={styles.stateBox}>
                  <Text style={styles.stateText}>아직 코멘트가 없어요</Text>
                </View>
              ) : (
                <CommentCard commentList={comments} />
              )}
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

CommentBottomSheet.displayName = "CommentBottomSheet";

export default CommentBottomSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.white ?? "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  handleIndicator: {
    backgroundColor: Colors.gray_200 ?? "#E5E7EB",
    width: 60,
  },

  container: { flex: 1, zIndex: 21 },

  topTitleRow: {
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 10,
  },
  topTitleText: {
    ...TextStyles.Medium16,
    color: Colors.gray_300,
  },
  topTitleCount: {
    ...TextStyles.Bold16,
    color: Colors.gray_300,
  },

  heroCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    height: 144,
    marginBottom: 16,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroFallback: {
    backgroundColor: Colors.gray_100 ?? "#F3F4F6",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  heroTextArea: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  starIcon: { width: 13, height: 13, marginRight: 2 },
  ratingText: { ...TextStyles.Medium12, color: "white" },
  ratingCount: { ...TextStyles.Medium12, color: "#FEFEFE99" },
  placeTitle: {
    ...TextStyles.Bold18,
    color: Colors.white,
  },
  addressContainer: {
    flex: 1,
    flexDirection: "row",
  },
  addressIcon: {
    width: 11,
    height: 13,
    marginRight: 2,
  },
  placeAddress: {
    ...TextStyles.Regular12,
    color: Colors.gray_100,
  },

  bookmarkCircle: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#FFFFFF33",
    justifyContent: "center",
    alignItems: "center",
  },
  bookmarkIcon: { fontSize: 16 },

  commentItem: { paddingTop: 6, paddingBottom: 6 },

  commentHeader: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    marginRight: 10,
    backgroundColor: Colors.gray_100 ?? "#F3F4F6",
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 999,
    marginRight: 10,
    backgroundColor: Colors.gray_100 ?? "#F3F4F6",
  },
  commentHeaderText: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  nickname: {
    ...TextStyles.Bold12,
    color: Colors.gray_900,
  },
  email: {
    ...TextStyles.Regular10,
    color: Colors.gray_400,
  },
  date: {
    ...TextStyles.Regular10,
    color: Colors.gray_300,
  },

  commentContent: {
    marginTop: 10,
    ...TextStyles.Regular14,
    color: Colors.gray_800,
  },

  photoRow: { flexDirection: "row", gap: PHOTO_GAP, marginTop: 12 },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    backgroundColor: Colors.gray_100 ?? "#F3F4F6",
  },

  miniPlaceCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: Colors.gray_500 ?? "#F9FAFB",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray_100 ?? "#F3F4F6",
  },
  miniThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.gray_100 ?? "#F3F4F6",
    marginRight: 10,
  },
  miniText: { flex: 1, gap: 2 },
  miniTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.gray_900 ?? "#111827",
  },
  miniAddr: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray_500 ?? "#6B7280",
  },
  miniMark: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.gray_400 ?? "#9CA3AF",
  },

  divider: {
    marginTop: 18,
    height: 1,
    backgroundColor: Colors.gray_100 ?? "#F3F4F6",
  },

  stateBox: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.gray_500 ?? "#F9FAFB",
    alignItems: "center",
  },
  stateText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.gray_700 ?? "#374151",
  },
  stateSubText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray_400 ?? "#9CA3AF",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary_500 ?? "#FF7F00",
  },
  retryText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
  },
});
