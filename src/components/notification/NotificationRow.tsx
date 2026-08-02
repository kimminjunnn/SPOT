import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import SpotButton from "@/src/components/common/SpotButton";
import type { NotificationDetail } from "@/src/lib/api/notification";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

type NotificationRowProps = {
  notification: NotificationDetail;
  followAction?: NotificationFollowAction;
  followActionLoading?: boolean;
  onPressFollowAction?: () => void;
  onPressPlace?: () => void;
  onPress?: () => void;
};

export type NotificationFollowAction =
  | "accept"
  | "followBack"
  | "following";

const FOLLOW_ACTION_META: Record<
  NotificationFollowAction,
  { label: string; loadingLabel: string; visuallyDisabled: boolean }
> = {
  accept: {
    label: "팔로우 수락",
    loadingLabel: "수락 중",
    visuallyDisabled: false,
  },
  followBack: {
    label: "맞팔로우",
    loadingLabel: "처리 중",
    visuallyDisabled: false,
  },
  following: {
    label: "팔로잉",
    loadingLabel: "처리 중",
    visuallyDisabled: true,
  },
};

const DEFAULT_PROFILE_IMAGE = require("@/assets/images/default-profile.png");
const SPOT_ICON = require("@/assets/images/icon.png");
const ANONYMOUS_NOTIFICATION_MESSAGE =
  "누군가님에게서 알림이 도착했습니다.";

function stripTrailingPlaceName(
  message: string,
  placeName: string | null,
) {
  const trimmedPlaceName = placeName?.trim();
  if (!trimmedPlaceName) return message;

  const trimmedMessage = message.trimEnd();
  const suffix = `(${trimmedPlaceName})`;
  return trimmedMessage.endsWith(suffix)
    ? trimmedMessage.slice(0, -suffix.length).trimEnd()
    : message;
}

function stripTrailingPlaceNameFromSegments(
  segments: NotificationDetail["bodySegments"],
  placeName: string | null,
) {
  const message = segments.map((segment) => segment.text).join("");
  const strippedMessage = stripTrailingPlaceName(message, placeName);
  if (strippedMessage === message) return segments;

  let remainingLength = strippedMessage.length;
  return segments.flatMap((segment) => {
    if (remainingLength <= 0) return [];

    const text = segment.text.slice(0, remainingLength);
    remainingLength -= text.length;
    return text ? [{ ...segment, text }] : [];
  });
}

function getNotificationBodySegments(notification: NotificationDetail) {
  const segments = stripTrailingPlaceNameFromSegments(
    notification.bodySegments,
    notification.placeName,
  );
  const message = segments.map((segment) => segment.text).join("").trim();
  const displayedMessage =
    message ||
    stripTrailingPlaceName(
      formatNotificationMessage(notification.oneLine),
      notification.placeName,
    );
  const isAnonymousFallback =
    displayedMessage === ANONYMOUS_NOTIFICATION_MESSAGE;

  if (!isAnonymousFallback) {
    return segments;
  }

  return [
    {
      bold: false,
      text:
        notification.type === "instagram_extract"
          ? "인스타그램 장소 분석이 완료되었어요."
          : "새로운 알림이 도착했어요.",
    },
  ];
}

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
  followAction,
  followActionLoading = false,
  onPressFollowAction,
  onPressPlace,
  onPress,
}: NotificationRowProps) {
  const isInstagramExtract = notification.type === "instagram_extract";
  const hasSender = notification.senderId !== null;
  const actionMeta = followAction
    ? FOLLOW_ACTION_META[followAction]
    : undefined;
  const rawPhoto =
    isInstagramExtract ? notification.placePhoto : notification.photo;
  const photoUri = typeof rawPhoto === "string" ? rawPhoto.trim() : "";
  const hasPhoto = !!photoUri;
  const imageSource = hasPhoto
    ? { uri: photoUri }
    : hasSender
      ? DEFAULT_PROFILE_IMAGE
      : SPOT_ICON;
  const usesSpotIcon = !hasPhoto && !hasSender;

  const fallbackMessage = stripTrailingPlaceName(
    formatNotificationMessage(notification.oneLine),
    notification.placeName,
  );
  const bodySegments = getNotificationBodySegments(notification);
  const hasExtractTitleAndBody =
    isInstagramExtract && bodySegments.length > 1;
  const accessibilityLabel =
    bodySegments.map((segment) => segment.text).join("") ||
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
          {hasExtractTitleAndBody ? (
            <View style={styles.extractMessage}>
              <Text
                style={[
                  styles.message,
                  bodySegments[0].bold && styles.messageBold,
                ]}
                numberOfLines={1}
              >
                {bodySegments[0].text.trim()}
              </Text>

              <Text
                style={styles.message}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {bodySegments.slice(1).map((segment, index) => (
                  <Text
                    key={`${segment.text}-${index}`}
                    style={segment.bold ? styles.messageBold : undefined}
                  >
                    {index === 0 ? segment.text.trimStart() : segment.text}
                  </Text>
                ))}
              </Text>
            </View>
          ) : (
            <Text style={styles.message}>
              {bodySegments.length > 0
                ? bodySegments.map((segment, index) => (
                    <Text
                      key={`${segment.text}-${index}`}
                      style={segment.bold ? styles.messageBold : undefined}
                    >
                      {segment.text}
                    </Text>
                  ))
                : fallbackMessage}
            </Text>
          )}

          {notification.placeName && onPressPlace ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onPressPlace();
              }}
              accessibilityRole="link"
              accessibilityLabel={`${notification.placeName} 장소 상세 보기`}
              hitSlop={4}
              style={({ pressed }) => [
                styles.placeLink,
                pressed && styles.placeLinkPressed,
              ]}
            >
              <Text style={styles.placeName} numberOfLines={1}>
                {notification.placeName}
              </Text>
            </Pressable>
          ) : notification.placeName ? (
            <Text style={styles.placeName} numberOfLines={1}>
              {notification.placeName}
            </Text>
          ) : null}

          <Text style={styles.time}>
            {formatNotificationTime(notification.createdAt)}
          </Text>
        </View>
      </Pressable>

      {actionMeta && onPressFollowAction ? (
        <View style={styles.buttonArea}>
          <SpotButton
            label={
              followActionLoading ? actionMeta.loadingLabel : actionMeta.label
            }
            variant="primary"
            size="small"
            disabled={followActionLoading}
            visuallyDisabled={actionMeta.visuallyDisabled}
            onPress={onPressFollowAction}
          />
        </View>
      ) : null}
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
  extractMessage: {
    gap: 2,
  },
  message: {
    ...TextStyles.Regular14,
    color: Colors.gray_800,
  },
  messageBold: {
    fontFamily: "PretendardBold",
  },
  placeName: {
    ...TextStyles.Medium14,
    color: Colors.black,
  },
  placeLink: {
    minHeight: 24,
    alignSelf: "flex-start",
    maxWidth: "100%",
    justifyContent: "center",
  },
  placeLinkPressed: {
    opacity: 0.6,
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
