import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";

import ProfileLayout from "@/src/components/profile/Layout";
import ProfileHeader from "@/src/components/profile/Header";
import UserRow from "@/src/components/common/UserRow";

import { deleteFriend, sendFollowRequest } from "@/src/lib/api/friends";
import { useFriendsStore } from "@/src/stores/useFriendsStore";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

export default function FriendsScreen() {
  const friends = useFriendsStore((s) => s.friends);
  const loading = useFriendsStore((s) => s.loading);
  const error = useFriendsStore((s) => s.error);
  const loadFriends = useFriendsStore((s) => s.loadFriends);
  const [followingById, setFollowingById] = useState<Record<number, boolean>>(
    {},
  );
  const actioningIdsRef = useRef(new Set<number>());

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handlePressFollow = useCallback(
    async (friendId: number, isFollowing: boolean) => {
      if (actioningIdsRef.current.has(friendId)) return;

      actioningIdsRef.current.add(friendId);

      try {
        if (isFollowing) {
          await deleteFriend(friendId);
        } else {
          await sendFollowRequest(friendId);
        }

        setFollowingById((prev) => ({
          ...prev,
          [friendId]: !isFollowing,
        }));
      } catch (err: any) {
        console.warn(
          "팔로우 상태 변경 요청 에러:",
          err?.response?.status,
          err?.response?.data ?? err?.message,
        );
        Alert.alert("오류", "팔로우 상태 변경 중 문제가 발생했어요.");
      } finally {
        actioningIdsRef.current.delete(friendId);
      }
    },
    [],
  );

  return (
    <ProfileLayout>
      <ProfileHeader title="친구 목록" showBack />

      {loading && (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="small" color={Colors.gray_500} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      )}

      {!loading && !error && friends.length === 0 && (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>친구가 없습니다.</Text>
        </View>
      )}

      {!loading &&
        !error &&
        friends.map((u) => {
          const isFollowing = followingById[u.id] ?? true;

          return (
            <UserRow
              key={u.id}
              nickname={u.nickname}
              userId={u.userId}
              bio={u.comment ?? ""}
              avatarUri={u.avatarUrl ?? null}
              actionLabel={isFollowing ? "팔로잉" : "팔로우"}
              actionVisuallyDisabled={isFollowing}
              onPressAction={() => handlePressFollow(u.id, isFollowing)}
              onPressRow={() => {
                // 나중에 프로필 상세 이동 붙이면 됨
              }}
            />
          );
        })}
    </ProfileLayout>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    ...TextStyles.Regular14,
    color: Colors.gray_500,
  },
});
