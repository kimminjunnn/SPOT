import { useEffect, useRef } from "react";
import { ActivityIndicator, View, Alert } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { normalizeSocialLoginResponse } from "@/src/lib/auth/socialLogin";
import { useAuthStore } from "@/src/stores/useAuthStore";

function toStr(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0];
  return v ?? "";
}

function resolveReturnTo(value: string): Href {
  switch (value) {
    case "/":
      return "/";
    case "/home":
      return "/home";
    case "/map":
      return "/map";
    case "/profile":
      return "/profile";
    default:
      return "/";
  }
}

export default function KakaoOAuthRedirect() {
  const router = useRouter();
  const { status, accessToken, token, email, nickname, error, returnTo, intent } =
    useLocalSearchParams<{
      status?: string | string[];
      accessToken?: string | string[];
      token?: string | string[];
      email?: string | string[];
      nickname?: string | string[];
      error?: string | string[];
      returnTo?: string | string[];
      intent?: string | string[];
    }>();

  const ranRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (ranRef.current) return;
      ranRef.current = true;

      const rawReturnTo = toStr(returnTo);
      const rawIntent = toStr(intent);
      const next = resolveReturnTo(rawReturnTo);

      try {
        const result = normalizeSocialLoginResponse({
          status: toStr(status),
          accessToken: toStr(accessToken),
          token: toStr(token),
          email: toStr(email),
          nickname: toStr(nickname),
          error: toStr(error),
        });

        if (result.status === "AGREEMENT_REQUIRED") {
          useAuthStore.getState().setPendingAgreement({
            temporaryToken: result.accessToken,
            email: result.email,
            nickname: result.nickname,
          });
          router.replace({
            pathname: "/login",
            params: {
              returnTo: rawReturnTo || "/",
              ...(rawIntent ? { intent: rawIntent } : {}),
            },
          });
          return;
        }

        await useAuthStore.getState().setAuth({
          token: result.accessToken,
          email: result.email,
          nickname: result.nickname,
        });

        router.replace(next);
      } catch (err) {
        useAuthStore.getState().clearPendingAgreement();
        const message =
          err instanceof Error
            ? err.message
            : "로그인 응답을 처리하지 못했습니다.";
        console.warn("[Kakao OAuth] 로그인 처리 실패:", message);
        Alert.alert("로그인 실패", message);
        router.replace({
          pathname: "/login",
          params: { returnTo: rawReturnTo || "/" },
        });
      }
    };

    run();
  }, [
    status,
    accessToken,
    token,
    email,
    nickname,
    error,
    returnTo,
    intent,
    router,
  ]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
