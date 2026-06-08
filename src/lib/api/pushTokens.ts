import { api8001 } from "@/src/lib/api/client";

export type SavePushTokenRequest = {
  app_version: string;
  device_type: "ios";
  expo_push_token: string;
  is_active: boolean;
};

export type SavePushTokenResponse = {
  message: string;
};

export async function savePushToken(
  body: SavePushTokenRequest,
): Promise<boolean> {
  try {
    await api8001.post<SavePushTokenResponse>("/push-tokens", body);
    return true;
  } catch {
    return false;
  }
}
