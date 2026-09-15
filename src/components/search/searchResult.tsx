import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  Pressable,
} from "react-native";
import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";
import type { SearchItem } from "@/src/types/search";
import { formatDistance } from "@/src/utils/format";
import { getCategoryLabel } from "@/src/utils/categoryLabel";

type Props = {
  data: SearchItem[];
  onPressItem: (item: SearchItem) => void;
};

export default function SearchResult({ data, onPressItem }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.gid}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => onPressItem(item)} style={styles.row}>
          {/* 1) 썸네일 */}
          <Image
            source={
              item.photoUrl
                ? { uri: item.photoUrl }
                : require("@/assets/images/x-gray.png")
            }
            style={styles.thumb}
          />

          {/* 2) 가운데 텍스트 영역 */}
          <View style={styles.centerCol}>
            <View style={styles.titleRow}>
              <Text
                style={[TextStyles.SemiBold16, styles.titleText]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text
                style={[TextStyles.Regular10, { color: Colors.gray_300 }]}
                numberOfLines={1}
              >
                {getCategoryLabel(item.list)}
              </Text>
            </View>

            <View style={styles.addrRow}>
              <Image
                source={require("@/assets/images/marker-gray.png")}
                style={styles.markerIcon}
              />
              <Text
                style={[TextStyles.Regular12, styles.addressText]}
                numberOfLines={1}
              >
                {item.address}
              </Text>
            </View>
          </View>

          {/* 3) 오른쪽 거리 */}
          <View style={styles.rightCol}>
            <Text style={[TextStyles.Bold12, { color: Colors.gray_300 }]}>
              {formatDistance(item.distance)}
            </Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <Text
          style={[
            TextStyles.Medium16,
            { color: Colors.gray_500, paddingVertical: 24 },
          ]}
        >
          검색 결과가 없어요.
        </Text>
      }
    />
  );
}

const THUMB = 72;
const GAP = 12;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: GAP,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.gray_100,
    marginLeft: THUMB + GAP, // 썸네일만큼 들여쓰기(스샷 느낌)
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    backgroundColor: Colors.gray_100,
  },

  // 가운데 컬럼
  centerCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline", // 제목과 뱃지 베이스라인 맞춤
    gap: 6,
  },
  titleText: {
    flexShrink: 1,
    minWidth: 0,
  },
  badge: {
    color: Colors.gray_700,
    backgroundColor: Colors.gray_100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  addrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markerIcon: {
    width: 12,
    height: 16,
  },
  addressText: {
    flex: 1,
    minWidth: 0,
    color: Colors.gray_800,
  },

  // 오른쪽 거리
  rightCol: {
    minWidth: 64,
    alignItems: "flex-end",
    alignSelf: "center", // 상단 정렬(제목 라인과 비슷하게 보이게)
  },
});
