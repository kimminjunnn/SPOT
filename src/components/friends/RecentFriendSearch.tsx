import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";
import type { RecentFriendItem } from "@/src/stores/useRecentFriendSearchStore";

type Props = {
  items: RecentFriendItem[];
  loading?: boolean;
  onTapKeyword: (keyword: string) => void;
  onRemoveKeyword: (id: string) => void;
  onClearAll: () => void;
};

export default function RecentFriendSearch({
  items,
  loading,
  onTapKeyword,
  onRemoveKeyword,
  onClearAll,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>최근 검색</Text>
        <Pressable onPress={onClearAll} hitSlop={8}>
          <Text style={styles.clear}>모두 지우기</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>불러오는 중...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>검색 결과가 없어요</Text>
        </View>
      ) : (
        <View style={styles.chipsWrap}>
          {items.map((it) => (
            <View key={it.id} style={styles.chip}>
              {typeof it.profileImageUrl === "string" ? (
                <Image
                  source={{ uri: it.profileImageUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback} />
              )}

              <Pressable onPress={() => onTapKeyword(it.keyword)} hitSlop={6}>
                <Text style={styles.chipText}>{it.keyword}</Text>
              </Pressable>

              <Pressable onPress={() => onRemoveKeyword(it.id)} hitSlop={6}>
                <Image
                  source={require("@/assets/images/x-gray.png")}
                  style={styles.x}
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { ...TextStyles.SemiBold16, color: Colors.gray_900 },
  clear: { ...TextStyles.Medium14, color: Colors.gray_500 },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...TextStyles.SemiBold20,
    color: Colors.gray_300,
    paddingBottom: 100,
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chipText: { ...TextStyles.Medium14, color: Colors.gray_900 },

  avatar: { width: 20, height: 20, borderRadius: 999 },
  avatarFallback: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: Colors.gray_300,
  },
  x: { width: 16, height: 16 },
});
