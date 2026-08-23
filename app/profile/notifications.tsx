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
import { openFriendHome } from "@/src/lib/navigation/openFriendHome";
import {
  acceptFollowRequest,
  deleteFriend,
  getFriendStatus,
  searchFriends,
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

async function resolveFollowAction(
  notification: NotificationDetail,
  fallback: NotificationFollowAction,
): Promise<NotificationFollowAction | undefined> {
  const senderId = notification.senderId;
  if (senderId === null) return undefined;

  const keyword = notification.spotId?.trim();

  if (keyword) {
    try {
      const result = (await searchFriends(keyword)).find(
        (friend) => friend.id === senderId,
      );

      switch (result?.status) {
        case "friends":
          return "following";
        case "request_received":
          return "accept";
        case "none":
        case "request_sent":
          return "followBack";
        case "blocked":
          return undefined;
      }
    } catch (error) {
      console.warn("알림 팔로우 관계 검색 실패:", error);
    }
  }

  try {
    const relationship = await getFriendStatus(senderId);

    if (relationship.status === "friend") return "following";
    if (relationship.status === "block") return undefined;
    if (relationship.status === "none") return "followBack";
  } catch (error) {
    console.warn("알림 팔로우 관계 조회 실패:", error);
  }

  return fallback;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followActionBySenderId, setFollowActionBySenderId] = useState<
    Record<number, NotificationFollowAction | undefined>
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

  const reconcileFollowAction = useCallback(
    async (
      notification: NotificationDetail,
      fallback: NotificationFollowAction,
    ) => {
      const senderId = notification.senderId;
      if (senderId === null) return;

      const nextAction = await resolveFollowAction(notification, fallback);
      setFollowActionBySenderId((prev) => {
        return { ...prev, [senderId]: nextAction };
      });
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

          const followNotifications = [
            ...new Map(
              list
                .filter(
                  (notification) =>
                    notification.type === "follow_request" &&
                    notification.senderId !== null,
                )
                .map((notification) => [
                  notification.senderId as number,
                  notification,
                ]),
            ).values(),
          ];
          const resolvedActions = await Promise.all(
            followNotifications.map(async (notification) => ({
              senderId: notification.senderId as number,
              action: await resolveFollowAction(notification, "accept"),
            })),
          );
          if (!alive) return;

          setFollowActionBySenderId(
            Object.fromEntries(
              resolvedActions.map(({ senderId, action }) => [senderId, action]),
            ),
          );
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
      }

      try {
        if (action === "accept") {
          await acceptFollowRequest(senderId);
          setFollowAction(senderId, "followBack");
        } else if (action === "followBack") {
          await sendFollowRequest(senderId);
          if (notificationFriend) upsertFriend(notificationFriend);
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
          await reconcileFollowAction(notification, "followBack");
          void loadFriends({ force: true });
        } else if (
          action === "followBack" &&
          [400, 404, 409].includes(status)
        ) {
          await reconcileFollowAction(notification, "following");
          void loadFriends({ force: true });
        } else if (action === "following" && status === 404) {
          await reconcileFollowAction(notification, "followBack");
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
    [
      loadFriends,
      reconcileFollowAction,
      removeFriend,
      setFollowAction,
      upsertFriend,
    ],
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

  const handlePressPlace = useCallback((notification: NotificationDetail) => {
    if (notification.targetId === null) {
      return;
    }

    void openNotificationTarget({
      notificationId: notification.id,
      route: null,
      targetId: notification.targetId,
      targetType: "place",
      type: null,
    }).catch((error) => {
      console.warn("[Notifications] Failed to open place:", error);
    });
  }, []);

  const handlePressSender = useCallback((notification: NotificationDetail) => {
    const senderId = notification.senderId;
    if (senderId === null) return;

    openFriendHome({
      id: senderId,
      nickname:
        notification.spotNickname?.trim() ||
        notification.spotId?.trim() ||
        "사용자",
      userId: notification.spotId?.trim() ?? "",
      avatarUrl: notification.photo,
    });
  }, []);

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
                ? Object.prototype.hasOwnProperty.call(
                    followActionBySenderId,
                    senderId,
                  )
                  ? followActionBySenderId[senderId]
                  : "accept"
                : undefined;
            const canOpenPlace =
              notification.targetId !== null &&
              (notification.targetType === "place" ||
                !!notification.placeName?.trim());
            // 추출 완료 알림은 결과를 다시 열지 않는다.
            const opensNonPlaceTarget = notification.targetType === "map";
            const canOpenSenderProfile =
              notification.type !== "instagram_extract" && senderId !== null;

            return (
              <NotificationRow
                notification={notification}
                followAction={followAction}
                followActionLoading={
                  senderId !== null && actioningBySenderId[senderId] === true
                }
                onPress={
                  canOpenSenderProfile
                    ? () => handlePressSender(notification)
                    : opensNonPlaceTarget
                      ? () => handlePressNotification(notification)
                      : canOpenPlace
                        ? () => handlePressPlace(notification)
                        : undefined
                }
                onPressFollowAction={
                  followAction
                    ? () => handleFollowAction(notification, followAction)
                    : undefined
                }
                onPressPlace={
                  notification.type !== "instagram_extract" &&
                  notification.placeName?.trim() &&
                  canOpenPlace
                    ? () => handlePressPlace(notification)
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
