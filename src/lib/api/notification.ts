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
  sender_id: number;
  spot_id: string;
  spot_nickname: string;
  type: string;
};

export type NotificationDetailsResponse = {
  notifications: ApiNotificationDetail[];
};

export type NotificationDetail = {
  id: number;
  senderId: number;
  type: string;
  nickname: string;
  userId: string;
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
    nickname: item.spot_nickname,
    userId: item.spot_id,
    oneLine: item.one_line,
    photo: item.photo,
    isRead: item.is_read,
    createdAt: item.created_at,
  };
}

export async function fetchNotificationDetails(): Promise<
  NotificationDetail[]
> {
  const res = await api8001.get<NotificationDetailsResponse>(
    "/notifications/details",
  );

  const raw = Array.isArray(res.data?.notifications)
    ? res.data.notifications
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
