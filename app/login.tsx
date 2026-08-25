import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { router, useLocalSearchParams, type Href } from "expo-router";
import {
  Alert,
  Image,
  Linking as NativeLinking,
  Platform,
  StyleSheet,
  View,
  Text,
  Pressable,
  NativeModules,
} from "react-native";
import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";
import { loginWithApple } from "@/src/lib/api/auth";
import { useAuthStore } from "@/src/stores/useAuthStore";

const { SharedStore } = NativeModules;

const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY!;
const KAKAO_REDIRECT_URI = process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI!;
const TERMS_URL =
  "https://confusion-toy-a06.notion.site/3b6cb581691b80328caac65e49336103";
const PRIVACY_POLICY_URL =
  "https://confusion-toy-a06.notion.site/3b6cb581691b80c8b499e6e5d279fdea";

const authUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(
  KAKAO_REDIRECT_URI,
)}`;

function resolveReturnTo(value: string): Href {
  switch (value) {
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

function createNonce(): string {
  return Array.from(Crypto.getRandomBytes(32), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export default function Login() {
  const [isAppleLoginAvailable, setIsAppleLoginAvailable] = useState(false);
  const [isAppleLoginPending, setIsAppleLoginPending] = useState(false);
  const { returnTo, intent } = useLocalSearchParams<{
    returnTo?: string | string[];
    intent?: string | string[];
  }>();

  const nextReturnTo = Array.isArray(returnTo)
    ? returnTo[0]
    : (returnTo ?? "/");
  const nextIntent = Array.isArray(intent) ? intent[0] : (intent ?? "");

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    void AppleAuthentication.isAvailableAsync()
      .then(setIsAppleLoginAvailable)
      .catch(() => setIsAppleLoginAvailable(false));
  }, []);

  const handleAppleLogin = async () => {
    if (isAppleLoginPending) return;

    setIsAppleLoginPending(true);

    try {
      const nonce = createNonce();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      if (!credential.identityToken) {
        throw new Error("Apple identity token을 받지 못했습니다.");
      }

      const session = await loginWithApple({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        nonce,
        appleUserId: credential.user,
        email: credential.email,
        fullName: credential.fullName
          ? AppleAuthentication.formatFullName(credential.fullName)
          : null,
      });

      await useAuthStore.getState().setAuth(session);
      router.replace(resolveReturnTo(nextReturnTo));
    } catch (error: any) {
      if (error?.code === "ERR_REQUEST_CANCELED") return;

      console.warn("[Apple Login] error:", error?.message ?? error);
      Alert.alert(
        "Apple 로그인 실패",
        "로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsAppleLoginPending(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      await WebBrowser.warmUpAsync();

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        Linking.createURL("/oauth/kakao"),
      );

      if (result.type === "success" && result.url) {
        const parsed = new URL(result.url);
        const token = parsed.searchParams.get("token") ?? "";
        const email = parsed.searchParams.get("email") ?? "";
        const nickname = parsed.searchParams.get("nickname") ?? "";

        SharedStore?.setAccessToken?.(token);

        // ✅ 콜백 라우트로 직접 이동 (슬래시 1개여도 OK)
        router.replace({
          pathname: "/oauth/kakao",
          params: {
            token,
            email,
            nickname,
            returnTo: nextReturnTo,
            intent: nextIntent,
          },
        });
      } else if (result.type === "cancel") {
        console.log("⚠️ 사용자가 로그인 취소");
      } else {
        console.log("❌ 로그인 실패 또는 중단");
      }
    } catch (e) {
      console.warn("[KAKAO][AuthSession] error:", e);
    } finally {
      await WebBrowser.coolDownAsync();
    }
  };

  const renderKakaoLoginButton = (label = "카카오로 계속하기") => (
    <Pressable style={styles.kakaoLoginButton} onPress={handleKakaoLogin}>
      <View pointerEvents="none">
        <Image
          style={styles.signUpImage}
          source={require("@/assets/images/login-3second.png")}
        />
      </View>

      <Image
        style={styles.kakaoIcon}
        source={require("@/assets/images/kakao-icon.png")}
      />

      <Text style={styles.kakaoLoginButtonText}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>
          더 똑똑하게{"\n"}친구들과 장소를 공유해봐요.
        </Text>
        <View style={styles.imageContainer}>
          <Image
            style={styles.loginImage}
            source={require("@/assets/images/loginImage.png")}
          />
        </View>
        <View style={styles.loginButtonContainer}>
          {renderKakaoLoginButton()}
          {isAppleLoginAvailable ? (
            <Pressable
              disabled={isAppleLoginPending}
              style={({ pressed }) => [
                styles.appleLoginButton,
                (pressed || isAppleLoginPending) && styles.loginButtonPending,
              ]}
              onPress={handleAppleLogin}
            >
              <Image
                style={styles.appleIcon}
                source={require("@/assets/images/apple-icon.png")}
              />
              <Text style={styles.appleLoginButtonText}>Apple로 계속하기</Text>
            </Pressable>
          ) : null}
          {/* <Pressable style={styles.googleLoginButton}>
            <Image
              style={styles.googleIcon}
              source={require("@/assets/images/google-icon.png")}
            ></Image>
            <Text style={styles.googleLoginButtonText}>Google로 계속하기</Text>
          </Pressable> */}
        </View>
        <View style={styles.termsNoticeTextContainer}>
          <Text style={styles.termsNoticeText}>
            진행 시{" "}
            <Text
              style={styles.termsNoticeLink}
              onPress={() => void NativeLinking.openURL(TERMS_URL)}
              accessibilityRole="link"
            >
              약관
            </Text>{" "}
            및{" "}
            <Text
              style={styles.termsNoticeLink}
              onPress={() => void NativeLinking.openURL(PRIVACY_POLICY_URL)}
              accessibilityRole="link"
            >
              개인정보 보호정책
            </Text>
            에 동의합니다
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 137,
    paddingBottom: 30,
    paddingHorizontal: 24,
    backgroundColor: "white",
    justifyContent: "space-between",
  },
  headerContainer: {},
  headerText: {
    ...TextStyles.Bold24,
    color: Colors.gray_900,
    marginBottom: 32,
  },
  imageContainer: {
    alignItems: "center",
  },
  loginImage: {
    width: 410,
    height: 453,
  },
  loginButtonContainer: {
    alignItems: "center",
    gap: 12,
    bottom: 20,
    marginTop: 20,
  },
  kakaoLoginButton: {
    backgroundColor: "#FFE500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 48,
    borderRadius: 10,
  },
  signUpImage: {
    position: "absolute",
    right: -20,
    bottom: 23,
    width: 135,
    height: 50.6,
  },
  kakaoIcon: { width: 18, height: 18, marginRight: 6 },
  kakaoLoginButtonText: { ...TextStyles.SemiBold14 },
  appleLoginButton: {
    backgroundColor: "#000000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 48,
    borderRadius: 10,
  },
  appleIcon: { width: 14.61, height: 18, marginRight: 6 },
  appleLoginButtonText: { ...TextStyles.SemiBold14, color: "white" },
  loginButtonPending: { opacity: 0.6 },
  googleLoginButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  googleIcon: { width: 18, height: 18, marginRight: 6 },
  googleLoginButtonText: { ...TextStyles.SemiBold14 },
  termsNoticeTextContainer: {
    alignItems: "center",
  },
  termsNoticeText: {
    ...TextStyles.Regular12,
    color: Colors.gray_300,
  },
  termsNoticeLink: {
    ...TextStyles.Bold12,
    textDecorationLine: "underline",
  },
});
