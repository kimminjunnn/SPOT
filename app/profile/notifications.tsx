import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import ProfileLayout from "@/src/components/profile/Layout";
import ProfileHeader from "@/src/components/profile/Header";
import UserRow from "@/src/components/common/UserRow";
import {
  fetchNotificationDetails,
  readNotifications,
  type NotificationDetail,
} from "@/src/lib/api/notification";
import { acceptFollowRequest, searchFriends } from "@/src/lib/api/friends";
import { useFriendsStore } from "@/src/stores/useFriendsStore";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

async function filterActiveFollowRequestNotifications(
  notifications: NotificationDetail[],
) {
  const resolvedNotifications = await Promise.all(
    notifications.map(async (notification) => {
      if (notification.type !== "follow_request") return notification;

      try {
        const results = await searchFriends(notification.userId);
        const requester = results.find(
          (item) =>
            item.id === notification.senderId ||
            item.userId === notification.userId,
        );

        return requester?.status === "request_received" ? notification : null;
      } catch (err: any) {
        console.warn(
          "팔로우 요청 상태 확인 에러:",
          err?.response?.status,
          err?.response?.data ?? err?.message,
        );
        return notification;
      }
    }),
  );

  return resolvedNotifications.filter(
    (notification): notification is NotificationDetail => notification !== null,
  );
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptingById, setAcceptingById] = useState<Record<number, boolean>>(
    {},
  );
  const upsertFriend = useFriendsStore((s) => s.upsertFriend);
  const loadFriends = useFriendsStore((s) => s.loadFriends);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      const loadNotifications = async () => {
        setLoading(true);
        setError(null);

        try {
          const list = await fetchNotificationDetails();
          if (!alive) return;

          const activeNotifications =
            await filterActiveFollowRequestNotifications(list);
          if (!alive) return;

          setNotifications(activeNotifications);

          if (activeNotifications.some((notification) => !notification.isRead)) {
            const didRead = await readNotifications();
            if (didRead && alive) {
              setNotifications((prev) =>
                prev.map((notification) => ({
                  ...notification,
                  isRead: true,
                })),
              );
            }
          }
        } catch (err: any) {
          console.warn(
            "알림 목록 조회 에러:",
            err?.response?.status,
            err?.response?.data ?? err?.message,
          );

          if (alive) {
            setError("알림을 불러오지 못했어요.");
            setNotifications([]);
          }
        } finally {
          if (alive) setLoading(false);
        }
      };

      void loadNotifications();

      return () => {
        alive = false;
      };
    }, []),
  );

  const handleAcceptFollowRequest = useCallback(
    async (notification: NotificationDetail) => {
      if (acceptingById[notification.id]) {
        return;
      }

      setAcceptingById((prev) => ({
        ...prev,
        [notification.id]: true,
      }));

      try {
        const results = await searchFriends(notification.userId);
        const requester = results.find(
          (item) =>
            item.id === notification.senderId ||
            item.userId === notification.userId,
        );

        if (!requester || requester.status !== "request_received") {
          setNotifications((prev) =>
            prev.filter((item) => item.id !== notification.id),
          );
          Alert.alert("알림", "이미 처리된 팔로우 요청이에요.");
          return;
        }

        await acceptFollowRequest(requester.id);
        upsertFriend({
          id: requester.id,
          nickname: requester.nickname,
          userId: requester.userId,
          avatarUrl: requester.profileImageUrl,
          comment: requester.oneLine,
          status: "friends",
        });
        setNotifications((prev) =>
          prev.filter((item) => item.id !== notification.id),
        );
        void loadFriends({ force: true });
      } catch (err: any) {
        console.warn(
          "팔로우 수락 에러:",
          err?.response?.status,
          err?.response?.data ?? err?.message,
        );
        Alert.alert("오류", "팔로우 수락 중 문제가 발생했어요.");
      } finally {
        setAcceptingById((prev) => ({
          ...prev,
          [notification.id]: false,
        }));
      }
    },
    [acceptingById, loadFriends, upsertFriend],
  );

  return (
    <ProfileLayout>
      <ProfileHeader title="알림" showBack />

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

      {!loading && !error && notifications.length === 0 && (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>알림이 없습니다.</Text>
        </View>
      )}

      {!loading &&
        !error &&
        notifications.map((notification) => {
          const isFollowRequest = notification.type === "follow_request";
          const isAccepting = acceptingById[notification.id] ?? false;

          return (
            <UserRow
              key={notification.id}
              nickname={notification.nickname}
              userId={notification.userId}
              bio={notification.oneLine ?? ""}
              avatarUri={notification.photo}
              actionLabel={
                isAccepting
                  ? "수락 중"
                  : isFollowRequest
                    ? "팔로우 수락"
                    : "확인"
              }
              actionDisabled={!isFollowRequest || isAccepting}
              onPressAction={() => handleAcceptFollowRequest(notification)}
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
