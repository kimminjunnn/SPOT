import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import ProfileLayout from "@/src/components/profile/Layout";
import ProfileHeader from "@/src/components/profile/Header";
import NotificationRow from "@/src/components/notification/NotificationRow";
import {
  fetchNotificationDetails,
  readNotifications,
  type NotificationDetail,
} from "@/src/lib/api/notification";
import { acceptFollowRequest } from "@/src/lib/api/friends";
import { useFriendsStore } from "@/src/stores/useFriendsStore";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptingById, setAcceptingById] = useState<Record<number, boolean>>(
    {},
  );
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

          setNotifications(list);

          if (list.some((notification) => !notification.isRead)) {
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
        if (notification.senderId === null) {
          throw new Error("팔로우 요청 알림에 sender_id가 없습니다.");
        }

        await acceptFollowRequest(notification.senderId);
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
        if (
          err?.response?.status === 400 ||
          err?.response?.status === 404 ||
          err?.response?.status === 409
        ) {
          setNotifications((prev) =>
            prev.filter((item) => item.id !== notification.id),
          );
          Alert.alert("알림", "이미 처리된 팔로우 요청이에요.");
        } else {
          Alert.alert("오류", "팔로우 수락 중 문제가 발생했어요.");
        }
      } finally {
        setAcceptingById((prev) => ({
          ...prev,
          [notification.id]: false,
        }));
      }
    },
    [acceptingById, loadFriends],
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

      {!loading && !error && notifications.length > 0 && (
        <FlatList
          data={notifications}
          keyExtractor={(notification) => String(notification.id)}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: notification }) => (
            <NotificationRow
              notification={notification}
              accepting={acceptingById[notification.id] ?? false}
              onAccept={
                notification.type === "follow_request" &&
                notification.senderId !== null
                  ? () => handleAcceptFollowRequest(notification)
                  : undefined
              }
            />
          )}
        />
      )}
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
