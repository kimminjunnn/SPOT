import "react-native-reanimated";
import "@/src/config/disableFontScaling";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  Stack,
  SplashScreen,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState, NativeModules, Linking } from "react-native";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { useRegisterPushToken } from "@/src/hooks/useRegisterPushToken";

export default function RootLayout() {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const hydrate = useAuthStore((s) => s.hydrate);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const pendingAnalyzeTriggerRef = useRef(false);
  const didCheckInitialUrlRef = useRef(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const [fontsLoaded] = useFonts({
    PretendardRegular: require("@/assets/fonts/Pretendard-Regular.ttf"),
    PretendardMedium: require("@/assets/fonts/Pretendard-Medium.ttf"),
    PretendardBold: require("@/assets/fonts/Pretendard-Bold.ttf"),
    PretendardSemiBold: require("@/assets/fonts/Pretendard-SemiBold.ttf"),
    PretendardLight: require("@/assets/fonts/Pretendard-Light.ttf"),
    PretendardExtraBold: require("@/assets/fonts/Pretendard-ExtraBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded && hasHydrated) SplashScreen.hideAsync();
  }, [fontsLoaded, hasHydrated]);

  useRegisterPushToken({ enabled: hasHydrated && !!token });

  useEffect(() => {
    if (!fontsLoaded || !hasHydrated) return;

    const rootSegment = segments[0];
    const isAuthRoute = rootSegment === "login" || rootSegment === "oauth";

    if (!token && !isAuthRoute) {
      router.replace({
        pathname: "/login",
        params: {
          returnTo: pathname || "/",
        },
      });
      return;
    }

    if (token && rootSegment === "login") {
      router.replace("/(tabs)");
    }
  }, [fontsLoaded, hasHydrated, pathname, router, segments, token]);

  // ✅ spot://analyze-result 같은 딥링크에서 "route"만 뽑아내기
  const getRouteFromUrl = (url: string) => {
    try {
      const u = new URL(url);
      const path = (u.pathname ?? "").replace(/^\/+/, "");
      // ✅ spot://analyze-result 는 host에 들어오는 케이스가 많음
      return path || u.host || "";
    } catch {
      return url.replace("spot://", "").replace(/^\/+/, "");
    }
  };

  const handleAnalyzeTrigger = useCallback(async () => {
    if (!hasHydrated) return false;

    if (!token) {
      router.replace({
        pathname: "/login",
        params: {
          returnTo: "/map",
          intent: "analyze-result",
        },
      });
      return true;
    }

    router.replace("/(tabs)/map");
    return true;
  }, [hasHydrated, router, token]);

  useEffect(() => {
    if (!hasHydrated || !pendingAnalyzeTriggerRef.current) return;

    pendingAnalyzeTriggerRef.current = false;
    void handleAnalyzeTrigger();
  }, [handleAnalyzeTrigger, hasHydrated]);

  // ✅ 딥링크 수신: 콜드 스타트 + 런타임 둘 다 처리
  useEffect(() => {
    let alive = true;

    const onUrl = async ({ url }: { url: string }) => {
      if (!alive) return;
      const route = getRouteFromUrl(url);
      if (route !== "analyze-result") return;

      const handled = await handleAnalyzeTrigger();
      if (!handled) pendingAnalyzeTriggerRef.current = true;
    };

    const sub = Linking.addEventListener("url", onUrl);

    (async () => {
      if (didCheckInitialUrlRef.current) return;
      didCheckInitialUrlRef.current = true;

      const initialUrl = await Linking.getInitialURL();
      if (!alive || !initialUrl) return;

      const route = getRouteFromUrl(initialUrl);
      if (route !== "analyze-result") return;

      const handled = await handleAnalyzeTrigger();
      if (!handled) pendingAnalyzeTriggerRef.current = true;
    })();

    return () => {
      alive = false;
      sub.remove();
    };
  }, [handleAnalyzeTrigger]);

  // ✅ fallback: 앱이 active 될 때도 한번 체크 (딥링크 이벤트 씹히는 케이스 대비)
  useEffect(() => {
    const { SharedStore } = NativeModules;

    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;

      const json = await SharedStore?.getLatestAnalyzeResult?.();
      if (!json) return;

      await SharedStore?.clearLatestAnalyzeResult?.();

      const handled = await handleAnalyzeTrigger();
      if (!handled) pendingAnalyzeTriggerRef.current = true;
    });

    return () => sub.remove();
  }, [handleAnalyzeTrigger]);

  if (!fontsLoaded || !hasHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="oauth/kakao" options={{ headerShown: false }} />

          <Stack.Screen
            name="profile/notifications"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile/friends"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile/blocked"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile/setting"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile/accountSetting"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile/edit"
            options={{ headerShown: false, presentation: "card" }}
          />
        </Stack>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
