import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import { router, type Href } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { savePushToken } from "@/src/lib/api/pushTokens";

type ExpoNotificationsModule = typeof import("expo-notifications");

const LAST_REGISTERED_PUSH_TOKEN_KEY = "lastRegisteredPushToken";
const PENDING_NOTIFICATION_ROUTE_KEY = "pendingNotificationRoute";

type LastRegisteredPushToken = {
  appVersion: string;
  expoPushToken: string;
};

type UseRegisterPushTokenOptions = {
  enabled: boolean;
};

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

async function setPendingNotificationRoute(route: string) {
  await AsyncStorage.setItem(PENDING_NOTIFICATION_ROUTE_KEY, route);
}

async function clearPendingNotificationRoute() {
  await AsyncStorage.removeItem(PENDING_NOTIFICATION_ROUTE_KEY);
}

function getRouteFromNotificationData(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const route = (data as { route?: unknown }).route;
  if (typeof route !== "string" || !route.startsWith("/")) return null;

  return route;
}

async function registerPushToken() {
  if (Platform.OS !== "ios") return;

  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const projectId = getProjectId();
  if (!projectId) {
    console.warn("[PushToken] Expo projectId is missing.");
    return;
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermission.status;

  if (finalStatus !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== "granted") return;

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
    return;
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
  }
}

export async function deactivateLastRegisteredPushToken() {
  try {
    if (Platform.OS !== "ios") return;

    const lastRegistered = await getLastRegisteredPushToken();
    if (!lastRegistered) return;

    const saved = await savePushToken({
      app_version: getAppVersion(),
      device_type: "ios",
      expo_push_token: lastRegistered.expoPushToken,
      is_active: false,
    });

    if (saved) {
      await AsyncStorage.removeItem(LAST_REGISTERED_PUSH_TOKEN_KEY);
    }
  } catch (error) {
    console.warn("[PushToken] Failed to deactivate push token:", error);
  }
}

export function useRegisterPushToken({ enabled }: UseRegisterPushTokenOptions) {
  const isRegisteringRef = useRef(false);

  useEffect(() => {
    if (!enabled || isRegisteringRef.current) return;

    isRegisteringRef.current = true;
    void registerPushToken()
      .catch((error) => {
        console.warn("[PushToken] Failed to register push token:", error);
      })
      .finally(() => {
        isRegisteringRef.current = false;
      });
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
    let subscription: { remove: () => void } | null = null;

    void getNotificationsModule().then((Notifications) => {
      if (!Notifications || !isMounted) return;

      setForegroundNotificationHandler(Notifications);

      subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const route = getRouteFromNotificationData(
            response.notification.request.content.data,
          );

          if (route) {
            void setPendingNotificationRoute(route);
            router.push(route as Href);
          }
        },
      );

      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!isMounted) return;
        if (!response) return;

        const route = getRouteFromNotificationData(
          response.notification.request.content.data,
        );

        if (route) {
          void setPendingNotificationRoute(route);
          router.push(route as Href);
          void Notifications.clearLastNotificationResponseAsync();
        }
      });
    });

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, [enabled]);
}
