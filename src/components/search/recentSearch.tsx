// src/components/search/RecentSearch.tsx
import React from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

type RecentItem = { id: string; keyword: string };

type Props = {
  items: RecentItem[];
  loading?: boolean;
  onTapKeyword: (keyword: string) => void;
  onRemoveKeyword?: (keyword: string, id: string) => void;
};

export default function RecentSearch({
  items,
  loading = false,
  onTapKeyword,
  onRemoveKeyword,
}: Props) {
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={TextStyles.Medium16}>최근 검색어가 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>최근 검색어</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              onPress={() => onTapKeyword(item.keyword)}
              style={styles.keywordWrap}
            >
              <Image
                source={require("@/assets/images/marker-gray.png")}
                style={styles.icon}
              />
              <Text style={TextStyles.Medium16}>{item.keyword}</Text>
            </Pressable>

            {onRemoveKeyword && (
              <Pressable
                onPress={() => onRemoveKeyword(item.keyword, item.id)}
                hitSlop={8}
                style={styles.removeBtn}
              >
                <Image
                  source={require("@/assets/images/x-gray.png")}
                  style={styles.removeIcon}
                />
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  title: {
    ...TextStyles.SemiBold16,
    color: Colors.gray_900,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  keywordWrap: { flexDirection: "row", alignItems: "center", flex: 1 },
  icon: { width: 24, height: 24, marginRight: 8, tintColor: Colors.gray_400 },
  removeBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  removeIcon: { width: 20, height: 20, tintColor: Colors.gray_400 },
  emptyWrap: { alignItems: "center", paddingVertical: 20 },
  loadingWrap: { alignItems: "center", paddingVertical: 20 },
});
