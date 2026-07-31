import { useCallback, useRef, useState } from "react";
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
import NotificationRow, {
  type NotificationFollowAction,
} from "@/src/components/notification/NotificationRow";
import {
  fetchNotificationDetails,
  readNotifications,
  type NotificationDetail,
} from "@/src/lib/api/notification";
import { openNotificationTarget } from "@/src/lib/navigation/openNotificationTarget";
import {
  acceptFollowRequest,
  deleteFriend,
  sendFollowRequest,
  type Friend,
} from "@/src/lib/api/friends";
import { useFriendsStore } from "@/src/stores/useFriendsStore";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

function toNotificationFriend(notification: NotificationDetail): Friend | null {
  if (notification.senderId === null) return null;

  return {
    id: notification.senderId,
    nickname:
      notification.spotNickname?.trim() ||
      notification.spotId?.trim() ||
      "사용자",
    userId: notification.spotId?.trim() ?? "",
    avatarUrl: notification.photo,
    status: "friends",
  };
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followActionBySenderId, setFollowActionBySenderId] = useState<
    Record<number, NotificationFollowAction>
  >({});
  const [actioningBySenderId, setActioningBySenderId] = useState<
    Record<number, boolean>
  >({});
  const actioningSenderIdsRef = useRef(new Set<number>());
  const loadFriends = useFriendsStore((state) => state.loadFriends);
  const upsertFriend = useFriendsStore((state) => state.upsertFriend);
  const removeFriend = useFriendsStore((state) => state.removeFriend);

  const setFollowAction = useCallback(
    (senderId: number, action: NotificationFollowAction) => {
      setFollowActionBySenderId((prev) => ({
        ...prev,
        [senderId]: action,
      }));
    },
    [],
  );

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

          if (list.some((notification) => notification.type === "follow_accept")) {
            void loadFriends({ force: true });
          }

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
    }, [loadFriends]),
  );

  const handleFollowAction = useCallback(
    async (
      notification: NotificationDetail,
      action: NotificationFollowAction,
    ) => {
      const senderId = notification.senderId;
      if (senderId === null || actioningSenderIdsRef.current.has(senderId)) {
        return;
      }

      actioningSenderIdsRef.current.add(senderId);
      setActioningBySenderId((prev) => ({ ...prev, [senderId]: true }));
      const previousFriend = useFriendsStore
        .getState()
        .friends.find((friend) => friend.id === senderId);
      const notificationFriend = toNotificationFriend(notification);

      if (action === "following") {
        removeFriend(senderId);
      } else if (notificationFriend) {
        upsertFriend(notificationFriend);
      }

      try {
        if (action === "accept") {
          await acceptFollowRequest(senderId);
          setFollowAction(senderId, "followBack");
        } else if (action === "followBack") {
          await sendFollowRequest(senderId);
          setFollowAction(senderId, "following");
        } else {
          await deleteFriend(senderId);
          setFollowAction(senderId, "followBack");
        }

        void loadFriends({ force: true });
      } catch (err: any) {
        const status = err?.response?.status;
        console.warn(
          "알림 팔로우 상태 변경 에러:",
          status,
          err?.response?.data ?? err?.message,
        );

        if (action === "accept" && [400, 404, 409].includes(status)) {
          setFollowAction(senderId, "followBack");
          void loadFriends({ force: true });
          Alert.alert("알림", "이미 처리된 팔로우 요청이에요.");
        } else if (action === "followBack" && status === 409) {
          setFollowAction(senderId, "following");
          void loadFriends({ force: true });
        } else if (action === "following" && status === 404) {
          setFollowAction(senderId, "followBack");
          void loadFriends({ force: true });
        } else {
          if (previousFriend) {
            upsertFriend(previousFriend);
          } else {
            removeFriend(senderId);
          }
          Alert.alert("오류", "팔로우 상태 변경 중 문제가 발생했어요.");
        }
      } finally {
        actioningSenderIdsRef.current.delete(senderId);
        setActioningBySenderId((prev) => {
          const next = { ...prev };
          delete next[senderId];
          return next;
        });
      }
    },
    [loadFriends, removeFriend, setFollowAction, upsertFriend],
  );

  const handlePressNotification = useCallback(
    (notification: NotificationDetail) => {
      void openNotificationTarget({
        notificationId: notification.id,
        route: null,
        targetId: notification.targetId,
        targetType: notification.targetType,
        type: notification.type,
      }).catch((error) => {
        console.warn("[Notifications] Failed to open target:", error);
      });
    },
    [],
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
          renderItem={({ item: notification }) => {
            const senderId = notification.senderId;
            const followAction =
              notification.type === "follow_request" && senderId !== null
                ? (followActionBySenderId[senderId] ?? "accept")
                : undefined;

            return (
              <NotificationRow
                notification={notification}
                followAction={followAction}
                followActionLoading={
                  senderId !== null && actioningBySenderId[senderId] === true
                }
                onPress={
                  notification.type === "instagram_extract" ||
                  notification.targetType === "place" ||
                  notification.targetType === "map"
                    ? () => handlePressNotification(notification)
                    : undefined
                }
                onPressFollowAction={
                  followAction
                    ? () => handleFollowAction(notification, followAction)
                    : undefined
                }
              />
            );
          }}
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
