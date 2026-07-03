import { useCallback, useState } from "react";
import { View, Pressable, StyleSheet, Image, Text } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import ProfileLayout from "@/src/components/profile/Layout";
import ProfileUserCard from "@/src/components/common/UserCard";
import SpotButton from "@/src/components/common/SpotButton";
import { useMyProfileStore } from "@/src/stores/useMyProfileStore";
import { fetchUnreadNotificationCount } from "@/src/lib/api/notification";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";
import ProfileAdBanner from "../../src/components/ads/ProfileAdBanner";

export default function ProfileScreen() {
  const defaultProfileImg = require("@/assets/images/default-profile.png");
  const fallbackFriendImg = require("@/assets/images/default-profile.png");
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const profile = useMyProfileStore((s) => s.profile);
  const friendCount = useMyProfileStore((s) => s.friendCount);
  const recentFriendPhotos = useMyProfileStore((s) => s.recentFriendPhotos);
  const loading = useMyProfileStore((s) => s.loading);
  const fetchMyProfile = useMyProfileStore((s) => s.fetchMyProfile);

  useFocusEffect(
    useCallback(() => {
      fetchMyProfile();

      let alive = true;

      const loadUnreadNotificationCount = async () => {
        try {
          const count = await fetchUnreadNotificationCount();
          if (alive) setUnreadNotificationCount(count);
        } catch (err: any) {
          console.warn(
            "미읽음 알림 개수 조회 에러:",
            err?.response?.status,
            err?.response?.data ?? err?.message,
          );
          if (alive) setUnreadNotificationCount(0);
        }
      };

      void loadUnreadNotificationCount();

      return () => {
        alive = false;
      };
    }, [fetchMyProfile]),
  );
  const nickname = profile?.spotNickname ?? "닉네임 없음";
  const userid = profile?.spotId ?? "-";
  const bio = profile?.oneLine ?? "한 줄 소개를 추가해보세요";

  const profileImageSource =
    profile?.photo && profile.photo.length > 0
      ? { uri: profile.photo }
      : defaultProfileImg;

  const friendAvatars =
    recentFriendPhotos.length > 0
      ? recentFriendPhotos
          .slice(0, 3)
          .map((url) => (url ? { uri: url } : fallbackFriendImg))
      : [fallbackFriendImg, fallbackFriendImg, fallbackFriendImg];

  return (
    <ProfileLayout>
      <View style={styles.header}>
        <View style={styles.left}>
          <Image
            style={{ width: 64, height: 30 }}
            source={require("@/assets/images/SPOT.png")}
          />
        </View>

        <View style={styles.right}>
          <Pressable onPress={() => router.push("/profile/notifications")}>
            <Image
              style={{ width: 24, height: 24 }}
              source={require("@/assets/images/bell-icon.png")}
            />
            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => router.push("/profile/setting")}>
            <Image
              style={{ width: 24, height: 24 }}
              source={require("@/assets/images/settings-icon.png")}
            />
          </Pressable>
        </View>
      </View>

      <ProfileUserCard
        variant="profile"
        nickname={loading ? "불러오는 중..." : nickname}
        userid={loading ? "" : userid}
        bio={loading ? "" : bio}
        friendCount={loading ? 0 : friendCount}
        friendAvatars={friendAvatars}
        profileImage={profileImageSource}
        onPressFriendCount={() => router.push("/profile/friends")}
      />

      <View style={styles.twoButtonsContainer}>
        <SpotButton
          onPress={() => router.push("/profile/edit")}
          label="프로필 수정"
          variant="primary"
          size="medium"
          style={{ flex: 1 }}
        />

        <SpotButton
          onPress={() => router.push("/profile/friends")}
          label="친구 관리"
          variant="secondary"
          size="medium"
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.advertise}>
        <ProfileAdBanner />
      </View>
    </ProfileLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 40,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    marginBottom: 26,
  },
  left: {},
  right: {
    gap: 14,
    flexDirection: "row",
  },
  notificationBadge: {
    position: "absolute",
    top: -7,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_500,
  },
  notificationBadgeText: {
    ...TextStyles.Bold12,
    color: Colors.white,
    fontSize: 9,
    lineHeight: 11,
  },
  twoButtonsContainer: {
    marginTop: 20,
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  advertise: {
    alignItems: "center",
  },
});
