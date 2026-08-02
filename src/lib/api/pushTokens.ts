import { isAxiosError } from "axios";

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

export type DeactivatePushTokenRequest = {
  expo_push_token: string;
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

export async function deactivatePushToken(
  expoPushToken: string,
): Promise<boolean> {
  const body: DeactivatePushTokenRequest = {
    expo_push_token: expoPushToken,
  };

  try {
    await api8001.delete("/push-tokens", { data: body });
    return true;
  } catch (error) {
    return isAxiosError(error) && error.response?.status === 404;
  }
}
