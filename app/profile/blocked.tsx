import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import ProfileLayout from "@/src/components/profile/Layout";
import ProfileHeader from "@/src/components/profile/Header";
import UserRow from "@/src/components/common/UserRow";

import { fetchBlockList, type BlockItem } from "@/src/lib/api/settings";
import { unblockFriend } from "@/src/lib/api/friends";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

export default function BlockedScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [unblockingIds, setUnblockingIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBlockList();
      setBlocks(res.blocks);
    } catch (e: any) {
      setError(e?.message ?? "차단 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const rows = useMemo(() => {
    return blocks.map((b) => ({
      key: b.id,
      friendId: b.friendId,
      nickname: b.nickname,
      userId: b.userId,
      bio: b.oneLine ?? "",
      avatarUri: b.photo,
    }));
  }, [blocks]);

  const handleUnblock = useCallback(async (user: (typeof rows)[number]) => {
    setUnblockingIds((ids) => [...ids, user.friendId]);

    try {
      await unblockFriend(user.friendId);
      setBlocks((prev) => prev.filter((block) => block.id !== user.key));
    } catch (e: any) {
      Alert.alert(
        "차단 해제 실패",
        e?.response?.data?.message ??
          e?.message ??
          "잠시 후 다시 시도해주세요.",
      );
    } finally {
      setUnblockingIds((ids) => ids.filter((id) => id !== user.friendId));
    }
  }, []);

  return (
    <ProfileLayout>
      <ProfileHeader title="차단 목록" showBack />

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

      {!loading && !error && rows.length === 0 && (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>차단한 친구가 없습니다.</Text>
        </View>
      )}

      {!loading &&
        !error &&
        rows.map((u) => {
          const unblocking = unblockingIds.includes(u.friendId);

          return (
            <UserRow
              key={u.key}
              nickname={u.nickname}
              userId={u.userId}
              bio={u.bio}
              avatarUri={u.avatarUri}
              avatarFill
              actionLabel={unblocking ? "해제 중" : "차단 해제"}
              actionDisabled={unblocking}
              onPressAction={() => handleUnblock(u)}
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
