import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
  ScrollView,
  Pressable,
  Modal,
  StyleProp,
  ViewStyle,
} from "react-native";
import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";

import { openNaverMap } from "@/src/utils/openNaverMap";
import type { PlaceCardSavedUser } from "@/src/lib/mappers/placeCardSavers";

interface PlaceCardProps {
  name: string;
  category: string;
  address: string;
  images: any[]; // require로 넣으니까 any로!
  savedUsers?: PlaceCardSavedUser[];
  savedCount?: number;
  showDirectionButton: boolean;
  rating?: number;
  reviewCount?: number;
  showBookmark?: boolean; // 북마크 UI를 보여줄지 여부
  isBookmarked?: boolean; // 북마크 되어 있는지 여부
  distanceText?: string; // ex) "320m", "1.2km"
  onToggleBookmark?: () => void;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_PROFILE_IMAGE = require("@/assets/images/default-profile.png");

const normalizeProfileImageUrl = (uri: string | null | undefined) => {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL_8000 ?? "";
  return baseUrl ? `${baseUrl}${uri}` : null;
};

const getSavedUserImageSource = (
  savedUser: PlaceCardSavedUser,
): ImageSourcePropType => {
  if (typeof savedUser === "number") return savedUser;
  if (Array.isArray(savedUser)) return savedUser;

  if ("profileImageUrl" in savedUser) {
    const uri = normalizeProfileImageUrl(savedUser.profileImageUrl);
    return uri ? { uri } : DEFAULT_PROFILE_IMAGE;
  }

  if ("uri" in savedUser && typeof savedUser.uri === "string") {
    const uri = normalizeProfileImageUrl(savedUser.uri);
    return uri ? { uri } : DEFAULT_PROFILE_IMAGE;
  }

  return DEFAULT_PROFILE_IMAGE;
};

export default function PlaceCard({
  name,
  category,
  address,
  images,
  savedUsers,
  savedCount,
  showDirectionButton,
  rating,
  reviewCount,
  showBookmark,
  isBookmarked,
  distanceText,
  onToggleBookmark,
  onPress,
  style,
}: PlaceCardProps) {
  const [viewerVisible, setViewerVisible] = React.useState(false); // React.useState는 import useState를 하지 않아도 react에서 바로 꺼내쓸 수 있는 기술
  const [viewerIndex, setViewerIndex] = React.useState(0);

  const pressImage = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handlePressNaverMapButton = async () => {
    await openNaverMap(name);
    console.log("clicked");
  };

  const savedUserImages = (savedUsers ?? [])
    .slice(0, 3)
    .map(getSavedUserImageSource);
  const actualSavedCount = savedCount ?? savedUsers?.length ?? 0;

  return (
    <Pressable style={[styles.card, style]} onPress={onPress}>
      <View style={styles.header}>
        <Text style={[TextStyles.SemiBold20, { marginRight: 3 }]}>{name}</Text>
        <Text
          style={[
            TextStyles.Regular12,
            { color: Colors.gray_300 },
            { marginTop: 3.5 },
            { marginRight: 6 },
          ]}
        >
          {category}
        </Text>

        {rating !== undefined && reviewCount !== undefined && (
          <View style={styles.ratingContainer}>
            <Image
              style={styles.starImg}
              source={require("@/assets/images/star-orange.png")}
            />
            <Text
              style={[
                TextStyles.Medium12,
                { color: Colors.gray_900, marginRight: 3 },
              ]}
            >
              {rating}
            </Text>
            <Text style={[TextStyles.Regular12, { color: Colors.gray_300 }]}>
              ({reviewCount.toLocaleString()})
            </Text>
          </View>
        )}

        {showBookmark && (
          <Pressable
            style={styles.bookmarkPressable}
            onPress={(event) => {
              event.stopPropagation();
              onToggleBookmark?.();
            }}
            hitSlop={8}
          >
            <Image
              source={
                isBookmarked
                  ? require("@/assets/images/bookmark-orange.png")
                  : require("@/assets/images/bookmark-orange-empty.png")
              }
              style={styles.bookmarkIcon}
            />
          </Pressable>
        )}
      </View>

      {/* 주소 + 거리 */}
      <View style={styles.addressContainer}>
        <Image
          style={styles.placecardMarker}
          source={require("@/assets/images/placecard-marker.png")}
        />
        <Text style={[TextStyles.Regular12, { color: Colors.gray_900 }]}>
          {address}
        </Text>
        {!!distanceText && (
          <Text style={styles.distanceText}>{distanceText}</Text>
        )}
      </View>

      {/* 이미지 스크롤 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.imageScroll}
      >
        {images.map((img, index) => (
          <Pressable key={index} onPress={() => pressImage(index)}>
            <Image source={img} style={styles.image} />
          </Pressable>
        ))}
      </ScrollView>

      {/* 저장한 사람들 + 네이버 지도 버튼 */}
      <View style={styles.bottomRow}>
        <View style={styles.savedInfo}>
          {actualSavedCount > 0 && (
            <View style={styles.avatarGroup}>
              {savedUserImages.map((source, i) => (
                <Image
                  key={i}
                  source={source}
                  style={[styles.avatar, { marginLeft: i === 0 ? 0 : -8 }]}
                />
              ))}
              <Text style={styles.savedText}>
                {actualSavedCount}명이 저장했어요
              </Text>
            </View>
          )}
        </View>

        {showDirectionButton && (
          <Pressable
            style={styles.NaverMapButton}
            onPress={handlePressNaverMapButton}
          >
            <Image
              source={require("@/assets/images/naver-map-icon.png")}
              style={styles.NaverMapIcon}
            />
            <Text style={TextStyles.Medium12}>네이버 지도 길찾기</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerBackdrop}>
          <Pressable
            style={styles.viewerCloseBtn}
            onPress={() => setViewerVisible(false)}
            hitSlop={10}
          >
            <Image
              style={{ width: 44, height: 44 }}
              source={require("@/assets/images/arrow-left-white.png")}
            />
          </Pressable>

          <Image source={images[viewerIndex]} style={styles.viewerImage} />
        </View>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E6E666",
  },
  header: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  starImg: {
    width: 14,
    height: 14,
  },
  bookmarkPressable: {
    position: "absolute",
    right: 0,
    top: 3,
  },

  bookmarkIcon: {
    position: "absolute",
    right: 0,
    width: 24,
    height: 24,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14.9,
  },

  placecardMarker: {
    width: 12.15,
    height: 12.15,
    marginRight: 1.92,
  },
  distanceText: {
    ...TextStyles.Regular12,
    color: Colors.gray_400,
    position: "absolute",
    right: 0,
  },
  imageScroll: {
    marginBottom: 11.25,
  },
  image: {
    width: 111,
    height: 125,
    borderRadius: 16.73,
    marginRight: 8,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  savedInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 6,
  },
  avatar: {
    width: 17.65,
    height: 17.65,
    borderRadius: 12,
    borderWidth: 0.74,
    borderColor: "#ffffff",
    backgroundColor: "lightgray",
  },
  savedText: {
    ...TextStyles.Regular12,
    color: Colors.gray_600,
    marginLeft: 4,
  },
  NaverMapButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.75,
    borderColor: Colors.gray_100,
    borderRadius: 4.5,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  NaverMapIcon: {
    width: 13,
    height: 13,
    marginRight: 2,
  },
  mapText: {
    color: "#333",
  },

  viewerBackdrop: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: "100%",
    height: "70%",
    resizeMode: "contain",
  },
  viewerCloseBtn: {
    position: "absolute",
    top: 60,
    left: 18,
    zIndex: 10,
  },
  viewerCloseText: {
    color: "white",
    fontSize: 24,
    fontWeight: "600",
  },
});
