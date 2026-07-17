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
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, NativeModules, Linking, Platform } from "react-native";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { useRegisterPushToken } from "@/src/hooks/useRegisterPushToken";
import AnalyzeRewardGateModal from "@/src/components/ads/AnalyzeRewardGateModal";
import AnalyzeLoadingBottomSheet from "@/src/components/ads/AnalyzeLoadingBottomSheet";
import { useAnalyzeRewardGateStore } from "@/src/stores/useAnalyzeRewardGateStore";
import { useAnalyzeResultStore } from "@/src/stores/useAnalyzeResultStore";
import {
  analyzeInstagramUrl,
  checkExtractEligibility,
} from "@/src/lib/api/analyze";
import {
  isAnalyzeAdRequired,
  mapAnalyzeResponseToItems,
} from "@/src/lib/analyze/analyzeResult";

export default function RootLayout() {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const hydrate = useAuthStore((s) => s.hydrate);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const pendingAnalyzeTriggerRef = useRef(false);
  const didCheckInitialUrlRef = useRef(false);
  const pendingAnalyzeResumeRef = useRef<Promise<boolean> | null>(null);
  const [isResumingPendingAnalyze, setIsResumingPendingAnalyze] =
    useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    if (NativeModules.RNGoogleMobileAdsModule == null) return;

    void import("react-native-google-mobile-ads")
      .then(({ default: mobileAds }) => mobileAds().initialize())
      .catch((error) => {
        if (__DEV__) console.warn("Google Mobile Ads initialization skipped:", error);
      });
  }, []);

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

  const resumePendingAnalyze = useCallback(async () => {
    if (pendingAnalyzeResumeRef.current) {
      return pendingAnalyzeResumeRef.current;
    }

    const { SharedStore } = NativeModules;

    if (!SharedStore?.getPendingAnalyzeUrl) {
      console.warn("[AnalyzeRewardGate] SharedStore.getPendingAnalyzeUrl missing");
      return false;
    }

    const operation = (async () => {
      const pendingUrl = await SharedStore.getPendingAnalyzeUrl();

      if (typeof pendingUrl !== "string" || pendingUrl.length === 0) {
        console.log("[AnalyzeRewardGate] pendingAnalyzeUrl empty");
        return false;
      }

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

      setIsResumingPendingAnalyze(true);

      try {
        const savedTicketId =
          await SharedStore?.getPendingAnalyzeTicketId?.();

        if (typeof savedTicketId === "string" && savedTicketId.length > 0) {
          useAnalyzeRewardGateStore.getState().open(pendingUrl, savedTicketId);
          router.replace("/(tabs)/map");
          return true;
        }

        console.log("[AnalyzeRewardGate] resuming after login:", pendingUrl);
        const eligibility = await checkExtractEligibility(pendingUrl);

        if (eligibility.need_ad) {
          if (!eligibility.ticket_id) {
            throw new Error("추출 권한 티켓을 발급받지 못했습니다.");
          }

          await SharedStore?.setPendingAnalyzeTicketId?.(
            eligibility.ticket_id,
          );
          useAnalyzeRewardGateStore
            .getState()
            .open(pendingUrl, eligibility.ticket_id);
          router.replace("/(tabs)/map");
          return true;
        }

        const analyzeResult = await analyzeInstagramUrl(pendingUrl);
        if (isAnalyzeAdRequired(analyzeResult)) {
          throw new Error("추가 저장 권한 확인이 필요합니다.");
        }

        const items = mapAnalyzeResponseToItems(analyzeResult);
        if (!items.length) {
          throw new Error("분석 결과에 저장 가능한 장소가 없습니다.");
        }

        useAnalyzeResultStore.getState().openWithPlaces(items, {
          sourceUrl: pendingUrl,
          receivedAt: Date.now(),
        });
        await SharedStore?.clearPendingAnalyzeUrl?.();
        await SharedStore?.clearPendingAnalyzeTicketId?.();
        router.replace("/(tabs)/map");
        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "로그인 후 장소 저장을 이어가지 못했어요.";

        console.warn("[AnalyzeRewardGate] resume failed:", message);

        // 401 인터셉터가 인증을 비운 경우 pending URL은 유지하고 재로그인한다.
        if (!useAuthStore.getState().token) {
          router.replace({
            pathname: "/login",
            params: {
              returnTo: "/map",
              intent: "analyze-result",
            },
          });
          return true;
        }

        Alert.alert("저장 실패", message);
        router.replace("/(tabs)/map");
        return true;
      } finally {
        setIsResumingPendingAnalyze(false);
      }
    })();

    pendingAnalyzeResumeRef.current = operation;

    try {
      return await operation;
    } finally {
      pendingAnalyzeResumeRef.current = null;
    }
  }, [router, token]);

  const handleAnalyzeTrigger = useCallback(async () => {
    if (!hasHydrated) return false;

    const resumed = await resumePendingAnalyze();
    console.log("[AnalyzeRewardGate] handleAnalyzeTrigger resumed:", resumed);

    if (!resumed) {
      router.replace("/analyze-result");
    }

    return true;
  }, [hasHydrated, resumePendingAnalyze, router]);

  useEffect(() => {
    if (!hasHydrated || !pendingAnalyzeTriggerRef.current) return;

    pendingAnalyzeTriggerRef.current = false;
    void handleAnalyzeTrigger();
  }, [handleAnalyzeTrigger, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !token) return;

    let alive = true;

    (async () => {
      const resumed = await resumePendingAnalyze();
      if (!alive || !resumed) return;

      console.log("[AnalyzeRewardGate] initial pending check resumed");
    })();

    return () => {
      alive = false;
    };
  }, [hasHydrated, resumePendingAnalyze, token]);

  // ✅ 딥링크 수신: 콜드 스타트 + 런타임 둘 다 처리
  useEffect(() => {
    let alive = true;

    const onUrl = async ({ url }: { url: string }) => {
      if (!alive) return;
      const route = getRouteFromUrl(url);
      console.log("[AnalyzeRewardGate] Linking url:", url, "route:", route);
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
      console.log("[AnalyzeRewardGate] initial url:", initialUrl, "route:", route);
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

      const pendingUrl = await SharedStore?.getPendingAnalyzeUrl?.();
      console.log("[AnalyzeRewardGate] AppState pendingAnalyzeUrl:", pendingUrl);
      if (typeof pendingUrl === "string" && pendingUrl.length > 0) {
        const handled = await handleAnalyzeTrigger();
        if (!handled) pendingAnalyzeTriggerRef.current = true;
        return;
      }

      const json = await SharedStore?.getLatestAnalyzeResult?.();
      if (!json) return;

      router.replace("/analyze-result");
    });

    return () => sub.remove();
  }, [handleAnalyzeTrigger, router]);

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
        <AnalyzeLoadingBottomSheet visible={isResumingPendingAnalyze} />
        <AnalyzeRewardGateModal sharedStore={NativeModules.SharedStore} />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
