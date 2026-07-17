import { api8001 } from "@/src/lib/api/client";

// ============
// GET /notifications/details
// ============
export type ApiNotificationDetail = {
  created_at: string;
  is_read: boolean;
  notification_id: number;
  one_line: string | null;
  photo: string | null;
  sender_id: number | null;
  spot_id: string | null;
  spot_nickname: string | null;
  type: NotificationType;
};

export type NotificationDetailsResponse = {
  notifications: ApiNotificationDetail[];
};

export const IMPLEMENTED_NOTIFICATION_TYPES = [
  "instagram_extract",
  "follow_request",
  "follow_accept",
] as const;

export const PLANNED_NOTIFICATION_TYPES = [
  "place_bookmarked",
  "place_commented",
  "comment_liked",
  "friend_commented",
  "friend_saved_same_place",
  "system_update",
  "system_maintenance",
  "place_trending",
  "area_revisit_prompt",
] as const;

export type ImplementedNotificationType =
  (typeof IMPLEMENTED_NOTIFICATION_TYPES)[number];
export type PlannedNotificationType = (typeof PLANNED_NOTIFICATION_TYPES)[number];

// 서버가 이후 추가할 타입도 목록에서 유실되지 않도록 string을 허용한다.
export type NotificationType =
  | ImplementedNotificationType
  | PlannedNotificationType
  | (string & {});

export type NotificationDetail = {
  id: number;
  senderId: number | null;
  type: NotificationType;
  spotNickname: string | null;
  spotId: string | null;
  oneLine: string | null;
  photo: string | null;
  isRead: boolean;
  createdAt: string;
};

export function mapNotificationDetail(
  item: ApiNotificationDetail,
): NotificationDetail {
  return {
    id: item.notification_id,
    senderId: item.sender_id,
    type: item.type,
    spotNickname: item.spot_nickname,
    spotId: item.spot_id,
    oneLine: item.one_line,
    photo: item.photo,
    isRead: item.is_read,
    createdAt: item.created_at,
  };
}

export async function fetchNotificationDetails(): Promise<NotificationDetail[]> {
  const res = await api8001.get<
    NotificationDetailsResponse | ApiNotificationDetail[] | ApiNotificationDetail
  >(
    "/notifications/details",
  );

  const data = res.data;
  if (!data || typeof data !== "object") return [];

  const raw = Array.isArray(data)
    ? data
    : "notifications" in data && Array.isArray(data.notifications)
      ? data.notifications
      : "notification_id" in data
        ? [data]
        : [];

  return raw.map(mapNotificationDetail);
}

// ============
// POST /notifications/read
// ============
export type ReadNotificationsResponse = {
  message: string;
};

export async function readNotifications(): Promise<boolean> {
  try {
    await api8001.post<ReadNotificationsResponse>("/notifications/read");
    return true;
  } catch {
    return false;
  }
}

// ============
// GET /notifications/unread-count
// ============
export type UnreadNotificationCountResponse = {
  unread_count: number;
};

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await api8001.get<UnreadNotificationCountResponse>(
    "/notifications/unread-count",
  );

  return Number(res.data?.unread_count ?? 0);
}
