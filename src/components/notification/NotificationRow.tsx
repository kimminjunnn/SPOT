import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import SpotButton from "@/src/components/common/SpotButton";
import type { NotificationDetail } from "@/src/lib/api/notification";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

type NotificationRowProps = {
  notification: NotificationDetail;
  accepting?: boolean;
  onAccept?: () => void;
  onPress?: () => void;
};

const DEFAULT_PROFILE_IMAGE = require("@/assets/images/default-profile.png");
const SPOT_ICON = require("@/assets/images/icon.png");

function formatNotificationMessage(message: string | null) {
  return (message ?? "새 알림이 도착했어요.")
    .replace(/\\n/g, "\n")
    .replace(/:round_pushpin:/g, "📍")
    .trim();
}

function formatNotificationTime(value: string) {
  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "";

  const diffMs = Date.now() - parsed.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs >= 0 && diffMs < minute) return "방금 전";
  if (diffMs >= 0 && diffMs < hour) return `${Math.floor(diffMs / minute)}분 전`;
  if (diffMs >= 0 && diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;

  const now = new Date();
  const sameYear = parsed.getFullYear() === now.getFullYear();
  const month = parsed.getMonth() + 1;
  const date = parsed.getDate();

  return sameYear
    ? `${month}월 ${date}일`
    : `${parsed.getFullYear()}.${month}.${date}`;
}

export default function NotificationRow({
  notification,
  accepting = false,
  onAccept,
  onPress,
}: NotificationRowProps) {
  const isFollowNotification =
    notification.type === "follow_request" ||
    notification.type === "follow_accept";
  const canAccept = notification.type === "follow_request" && !!onAccept;
  const photoUri = notification.photo?.trim();
  const hasPhoto = !!photoUri;
  const imageSource = hasPhoto
    ? { uri: photoUri }
    : isFollowNotification
      ? DEFAULT_PROFILE_IMAGE
      : SPOT_ICON;
  const usesSpotIcon = !hasPhoto && !isFollowNotification;

  const fallbackMessage = formatNotificationMessage(notification.oneLine);
  const accessibilityLabel =
    notification.bodySegments.map((segment) => segment.text).join("") ||
    fallbackMessage;

  return (
    <View style={[styles.container, !notification.isRead && styles.unread]}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.targetArea,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.imageWrapper,
            usesSpotIcon && styles.spotImageWrapper,
          ]}
        >
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        </View>

        <View style={styles.content}>
          <Text style={styles.message}>
            {notification.bodySegments.length > 0
              ? notification.bodySegments.map((segment, index) => (
                  <Text
                    key={`${segment.text}-${index}`}
                    style={segment.bold ? styles.messageBold : undefined}
                  >
                    {segment.text}
                  </Text>
                ))
              : fallbackMessage}
          </Text>

          {notification.placeName ? (
            <Text style={styles.placeName} numberOfLines={1}>
              📍 {notification.placeName}
            </Text>
          ) : null}

          <Text style={styles.time}>
            {formatNotificationTime(notification.createdAt)}
          </Text>
        </View>
      </Pressable>

      {canAccept && (
        <View style={styles.buttonArea}>
          <SpotButton
            label={accepting ? "수락 중" : "팔로우 수락"}
            variant="primary"
            size="small"
            disabled={accepting}
            onPress={onAccept}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray_100,
  },
  unread: {
    backgroundColor: "#FFF8F5",
  },
  pressed: {
    opacity: 0.7,
  },
  targetArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  imageWrapper: {
    width: 44,
    height: 44,
    marginRight: 12,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.gray_100,
    backgroundColor: "#F5F5F5",
  },
  spotImageWrapper: {
    padding: 9,
    backgroundColor: "#FFF3EE",
    borderColor: Colors.primary_100,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  message: {
    ...TextStyles.Regular14,
    color: Colors.gray_800,
  },
  messageBold: {
    fontFamily: "PretendardBold",
  },
  placeName: {
    ...TextStyles.Regular12,
    color: Colors.gray_500,
  },
  time: {
    ...TextStyles.Regular10,
    color: Colors.gray_400,
  },
  buttonArea: {
    width: 80,
    height: 28,
    marginLeft: 10,
  },
});
