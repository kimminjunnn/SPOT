import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import { router, type Href } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import {
  deactivatePushToken,
  savePushToken,
} from "@/src/lib/api/pushTokens";
import {
  openNotificationTarget,
  parseNotificationTarget,
} from "@/src/lib/navigation/openNotificationTarget";
import { useFriendsStore } from "@/src/stores/useFriendsStore";

type ExpoNotificationsModule = typeof import("expo-notifications");

const LAST_REGISTERED_PUSH_TOKEN_KEY = "lastRegisteredPushToken";
const PENDING_NOTIFICATION_ROUTE_KEY = "pendingNotificationRoute";
const PUSH_NOTIFICATION_ENABLED_KEY = "pushNotificationEnabled";

type LastRegisteredPushToken = {
  appVersion: string;
  expoPushToken: string;
};

type UseRegisterPushTokenOptions = {
  enabled: boolean;
};

export type EnablePushNotificationsResult =
  | "enabled"
  | "denied"
  | "unavailable"
  | "failed";

async function getNotificationsModule() {
  const pushTokenManager = requireOptionalNativeModule("ExpoPushTokenManager");
  const permissionsModule = requireOptionalNativeModule(
    "ExpoNotificationPermissionsModule",
  );

  if (!pushTokenManager || !permissionsModule) {
    console.warn(
      "[PushToken] expo-notifications native modules are unavailable. Rebuild the iOS app to enable push notifications.",
    );
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");

    if (
      typeof Notifications.getPermissionsAsync !== "function" ||
      typeof Notifications.requestPermissionsAsync !== "function" ||
      typeof Notifications.getExpoPushTokenAsync !== "function"
    ) {
      console.warn(
        "[PushToken] expo-notifications JS API is unavailable. Rebuild the iOS app to enable push notifications.",
      );
      return null;
    }

    return Notifications;
  } catch (error) {
    console.warn("[PushToken] expo-notifications is unavailable:", error);
    return null;
  }
}

function setForegroundNotificationHandler(
  Notifications: ExpoNotificationsModule,
) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function getAppVersion() {
  return Constants.expoConfig?.version ?? "1.0.0";
}

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  );
}

async function getLastRegisteredPushToken() {
  const raw = await AsyncStorage.getItem(LAST_REGISTERED_PUSH_TOKEN_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LastRegisteredPushToken;
  } catch {
    await AsyncStorage.removeItem(LAST_REGISTERED_PUSH_TOKEN_KEY);
    return null;
  }
}

async function setLastRegisteredPushToken(value: LastRegisteredPushToken) {
  await AsyncStorage.setItem(
    LAST_REGISTERED_PUSH_TOKEN_KEY,
    JSON.stringify(value),
  );
}

async function getPendingNotificationRoute() {
  return AsyncStorage.getItem(PENDING_NOTIFICATION_ROUTE_KEY);
}

async function clearPendingNotificationRoute() {
  await AsyncStorage.removeItem(PENDING_NOTIFICATION_ROUTE_KEY);
}

function getRouteFromNotificationData(data: unknown) {
  return parseNotificationTarget(data);
}

function refreshFriendsForRelationshipNotification(data: unknown) {
  const target = getRouteFromNotificationData(data);

  if (target?.type === "follow_accept") {
    void useFriendsStore.getState().loadFriends({ force: true });
  }

  return target;
}

async function isPushNotificationPreferenceEnabled() {
  const value = await AsyncStorage.getItem(PUSH_NOTIFICATION_ENABLED_KEY);
  return value !== "false";
}

async function registerPushToken(): Promise<EnablePushNotificationsResult> {
  if (Platform.OS !== "ios") return "unavailable";

  const Notifications = await getNotificationsModule();
  if (!Notifications) return "unavailable";

  const projectId = getProjectId();
  if (!projectId) {
    console.warn("[PushToken] Expo projectId is missing.");
    return "unavailable";
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermission.status;

  if (finalStatus !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== "granted") return "denied";

  const appVersion = getAppVersion();
  const expoPushToken = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;
  const lastRegistered = await getLastRegisteredPushToken();

  if (
    lastRegistered?.appVersion === appVersion &&
    lastRegistered.expoPushToken === expoPushToken
  ) {
    console.log("[PushToken] expo_push_token:", expoPushToken);
    return "enabled";
  }

  console.log("[PushToken] expo_push_token:", expoPushToken);

  const saved = await savePushToken({
    app_version: appVersion,
    device_type: "ios",
    expo_push_token: expoPushToken,
    is_active: true,
  });

  if (saved) {
    await setLastRegisteredPushToken({ appVersion, expoPushToken });
    return "enabled";
  }

  return "failed";
}

export async function getPushNotificationsEnabled() {
  if (Platform.OS !== "ios") return false;
  if (!(await isPushNotificationPreferenceEnabled())) return false;

  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

  const permission = await Notifications.getPermissionsAsync();
  return permission.status === "granted";
}

export async function enablePushNotifications() {
  await AsyncStorage.setItem(PUSH_NOTIFICATION_ENABLED_KEY, "true");
  return registerPushToken();
}

export async function disablePushNotifications() {
  await AsyncStorage.setItem(PUSH_NOTIFICATION_ENABLED_KEY, "false");
  await deactivateLastRegisteredPushToken();
}

export async function deactivateLastRegisteredPushToken() {
  try {
    if (Platform.OS !== "ios") return;

    const lastRegistered = await getLastRegisteredPushToken();
    if (!lastRegistered) return;

    const deactivated = await deactivatePushToken(
      lastRegistered.expoPushToken,
    );

    if (deactivated) {
      await AsyncStorage.removeItem(LAST_REGISTERED_PUSH_TOKEN_KEY);
    }
  } catch (error) {
    console.warn("[PushToken] Failed to deactivate push token:", error);
  }
}

async function syncPushNotificationPreference() {
  if (await isPushNotificationPreferenceEnabled()) {
    await registerPushToken();
    return;
  }

  await deactivateLastRegisteredPushToken();
}

export function useRegisterPushToken({ enabled }: UseRegisterPushTokenOptions) {
  const isRegisteringRef = useRef(false);
  const handledNotificationIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || isRegisteringRef.current) return;

    isRegisteringRef.current = true;
    void syncPushNotificationPreference()
      .catch((error) => {
        console.warn("[PushToken] Failed to register push token:", error);
      })
      .finally(() => {
        isRegisteringRef.current = false;
      });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener("change", (nextState) => {
      const returnedToForeground =
        previousState !== "active" && nextState === "active";
      previousState = nextState;

      if (returnedToForeground) {
        void useFriendsStore.getState().loadFriends({ force: true });
        void syncPushNotificationPreference().catch((error) => {
          console.warn("[PushToken] Failed to sync push preference:", error);
        });
      }
    });

    return () => subscription.remove();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    void getPendingNotificationRoute().then((route) => {
      if (!isMounted || !route) return;

      router.push(route as Href);
      void clearPendingNotificationRoute();
    });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    const subscriptions: { remove: () => void }[] = [];

    void getNotificationsModule().then((Notifications) => {
      if (!Notifications || !isMounted) return;

      setForegroundNotificationHandler(Notifications);

      subscriptions.push(
        Notifications.addNotificationReceivedListener((notification) => {
          refreshFriendsForRelationshipNotification(
            notification.request.content.data,
          );
        }),
      );

      subscriptions.push(
        Notifications.addNotificationResponseReceivedListener((response) => {
          const requestId = response.notification.request.identifier;
          if (handledNotificationIdsRef.current.has(requestId)) return;
          handledNotificationIdsRef.current.add(requestId);

          const target = refreshFriendsForRelationshipNotification(
            response.notification.request.content.data,
          );

          if (target) {
            void openNotificationTarget(target).catch((error) => {
              console.warn("[PushNotification] Failed to open target:", error);
            });
          }
        }),
      );

      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!isMounted) return;
        if (!response) return;

        const requestId = response.notification.request.identifier;
        if (handledNotificationIdsRef.current.has(requestId)) return;
        handledNotificationIdsRef.current.add(requestId);

        const target = refreshFriendsForRelationshipNotification(
          response.notification.request.content.data,
        );

        if (target) {
          void openNotificationTarget(target).catch((error) => {
            console.warn("[PushNotification] Failed to open target:", error);
          });
          void Notifications.clearLastNotificationResponseAsync();
        }
      });
    });

    return () => {
      isMounted = false;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [enabled]);
}
