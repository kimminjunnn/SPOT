import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  FlatList,
} from "react-native";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";
import type { FriendSearchItem } from "@/src/lib/api/friends";
import type { FriendStatus } from "@/src/types/friends";

type Props = {
  data: FriendSearchItem[];
  onPressItem: (friend: FriendSearchItem) => void;
  onPressAction?: (friend: FriendSearchItem) => void;
};

type ActionMeta = {
  label: string;
  disabled: boolean;
  hidden: boolean;
};

function getActionMeta(status: FriendStatus): ActionMeta {
  switch (status) {
    case "none":
      return {
        label: "팔로우",
        disabled: false,
        hidden: false,
      };

    case "friends":
      return {
        label: "팔로잉",
        disabled: false, // 여기 true로 바꾸면 버튼 눌림 막을 수 있음
        hidden: false,
      };

    case "request_sent":
      return {
        label: "요청중",
        disabled: true,
        hidden: false,
      };

    case "request_received":
      return {
        label: "팔로우 수락",
        disabled: false,
        hidden: false,
      };

    case "blocked":
      return {
        label: "",
        disabled: true,
        hidden: true,
      };

    default:
      return {
        label: "팔로우",
        disabled: false,
        hidden: false,
      };
  }
}

export default function FriendSearchResult({
  data,
  onPressItem,
  onPressAction,
}: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      renderItem={({ item }) => {
        const actionMeta = getActionMeta(item.status);

        return (
          <Pressable onPress={() => onPressItem(item)} style={styles.row}>
            {item.profileImageUrl ? (
              <Image
                source={{ uri: item.profileImageUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback} />
            )}

            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.nickname} numberOfLines={1}>
                  {item.nickname}
                </Text>

                <Text style={styles.userId} numberOfLines={1}>
                  @{item.userId}
                </Text>
              </View>

              {!!item.oneLine && (
                <Text style={styles.oneLine} numberOfLines={1}>
                  {item.oneLine}
                </Text>
              )}
            </View>

            {!actionMeta.hidden && (
              <Pressable
                onPress={() => {
                  if (actionMeta.disabled) return;
                  onPressAction?.(item);
                }}
                disabled={actionMeta.disabled}
                style={[
                  styles.actionBtn,
                  actionMeta.disabled && styles.actionBtnDisabled,
                  item.status === "friends" && styles.followingBtn,
                  item.status === "request_received" && styles.acceptBtn,
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    actionMeta.disabled && styles.actionTextDisabled,
                  ]}
                >
                  {actionMeta.label}
                </Text>
              </Pressable>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  sep: {
    height: 1,
    backgroundColor: Colors.gray_100,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    marginRight: 12,
  },

  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 999,
    marginRight: 12,
    backgroundColor: Colors.gray_300,
  },

  content: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  nickname: {
    ...TextStyles.Bold14,
    flexShrink: 1,
    minWidth: 0,
    color: Colors.gray_800,
    marginRight: 6,
  },

  userId: {
    ...TextStyles.Regular10,
    flexShrink: 1,
    color: Colors.gray_400,
  },

  oneLine: {
    ...TextStyles.Regular12,
    color: Colors.gray_500,
    marginTop: 4,
  },

  actionBtn: {
    minWidth: 80,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: "#303030",
    justifyContent: "center",
    alignItems: "center",
  },

  followingBtn: {
    backgroundColor: Colors.gray_200,
  },

  acceptBtn: {
    backgroundColor: "#303030",
  },

  actionBtnDisabled: {
    backgroundColor: Colors.gray_200,
  },

  actionText: {
    ...TextStyles.Bold12,
    color: Colors.white,
  },

  actionTextDisabled: {
    color: Colors.gray_500,
  },
});
