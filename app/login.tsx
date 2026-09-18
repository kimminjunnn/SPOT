import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { router, useLocalSearchParams, type Href } from "expo-router";
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";
import {
  loginWithApple,
  submitRequiredAgreements,
} from "@/src/lib/api/auth";
import {
  parseKakaoCallbackUrl,
  type SocialLoginResult,
} from "@/src/lib/auth/socialLogin";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { FORM_MAX_WIDTH } from "@/src/styles/Layout";
import TermsConsentBottomSheet, {
  type TermsConsentBottomSheetRef,
} from "@/src/components/auth/TermsConsentBottomSheet";

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
  const { width: windowWidth } = useWindowDimensions();
  const canvasWidth = Math.min(windowWidth, FORM_MAX_WIDTH);
  const canvasScale = canvasWidth / 375;
  const canvasHeight = 812 * canvasScale;
  const termsConsentSheetRef = useRef<TermsConsentBottomSheetRef>(null);
  const agreementSheetPresentedRef = useRef(false);
  const agreementSubmissionRef = useRef(false);
  const [isAppleLoginAvailable, setIsAppleLoginAvailable] = useState(false);
  const [isAppleLoginPending, setIsAppleLoginPending] = useState(false);
  const [isKakaoLoginPending, setIsKakaoLoginPending] = useState(false);
  const [isAgreementSubmitting, setIsAgreementSubmitting] = useState(false);
  const pendingAgreement = useAuthStore((state) => state.pendingAgreement);
  const { returnTo } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();

  const nextReturnTo = Array.isArray(returnTo)
    ? returnTo[0]
    : (returnTo ?? "/");
  useEffect(() => {
    if (Platform.OS !== "ios") return;

    void AppleAuthentication.isAvailableAsync()
      .then(setIsAppleLoginAvailable)
      .catch(() => setIsAppleLoginAvailable(false));
  }, []);

  useEffect(() => {
    if (!pendingAgreement) {
      agreementSheetPresentedRef.current = false;
      return;
    }

    if (agreementSheetPresentedRef.current) return;
    agreementSheetPresentedRef.current = true;
    termsConsentSheetRef.current?.open();
  }, [pendingAgreement]);

  const finishSocialLogin = async (result: SocialLoginResult) => {
    if (result.status === "LOGIN_SUCCESS") {
      await useAuthStore.getState().setAuth({
        token: result.accessToken,
        email: result.email,
        nickname: result.nickname,
      });
      router.replace(resolveReturnTo(nextReturnTo));
      return;
    }

    useAuthStore.getState().setPendingAgreement({
      temporaryToken: result.accessToken,
      email: result.email,
      nickname: result.nickname,
    });
  };

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

      const result = await loginWithApple({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        nonce,
        appleUserId: credential.user,
        email: credential.email,
        fullName: credential.fullName
          ? AppleAuthentication.formatFullName(credential.fullName)
          : null,
      });

      await finishSocialLogin(result);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ERR_REQUEST_CANCELED"
      ) {
        return;
      }

      console.warn(
        "[Apple Login] error:",
        error instanceof Error ? error.message : error,
      );
      Alert.alert(
        "Apple 로그인 실패",
        "로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsAppleLoginPending(false);
    }
  };

  const handleKakaoLogin = async () => {
    if (isKakaoLoginPending) return;

    setIsKakaoLoginPending(true);

    try {
      await WebBrowser.warmUpAsync();

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        Linking.createURL("/oauth/kakao"),
      );

      if (result.type === "success" && result.url) {
        const loginResult = parseKakaoCallbackUrl(result.url);
        await finishSocialLogin(loginResult);
      } else if (result.type === "cancel") {
        console.log("⚠️ 사용자가 로그인 취소");
      } else {
        console.log("❌ 로그인 실패 또는 중단");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.";
      console.warn("[KAKAO][AuthSession] error:", message);
      Alert.alert("카카오 로그인 실패", message);
    } finally {
      await WebBrowser.coolDownAsync();
      setIsKakaoLoginPending(false);
    }
  };

  const handleTermsConfirmed = async () => {
    const pending = useAuthStore.getState().pendingAgreement;
    if (!pending || agreementSubmissionRef.current) return;

    agreementSubmissionRef.current = true;
    setIsAgreementSubmitting(true);

    try {
      const result = await submitRequiredAgreements(pending.temporaryToken);

      await useAuthStore.getState().setAuth({
        token: result.accessToken,
        email: result.email ?? pending.email,
        nickname: result.nickname ?? pending.nickname,
      });

      termsConsentSheetRef.current?.close();
      router.replace(resolveReturnTo(nextReturnTo));
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;

      if (status === 401) {
        useAuthStore.getState().clearPendingAgreement();
        termsConsentSheetRef.current?.close();
        Alert.alert(
          "다시 로그인이 필요해요",
          "약관 동의 시간이 만료됐어요. 소셜 로그인을 다시 진행해 주세요.",
        );
      } else {
        console.warn(
          "[Agreements] error:",
          error instanceof Error ? error.message : error,
        );
        Alert.alert(
          "약관 동의 실패",
          "동의 내용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      }
    } finally {
      agreementSubmissionRef.current = false;
      setIsAgreementSubmitting(false);
    }
  };

  const renderKakaoLoginButton = (label = "카카오로 계속하기") => (
    <Pressable
      disabled={isKakaoLoginPending || isAppleLoginPending}
      style={[
        styles.kakaoLoginButton,
        (isKakaoLoginPending || isAppleLoginPending) &&
          styles.loginButtonPending,
      ]}
      onPress={() => void handleKakaoLogin()}
    >
      <View pointerEvents="none" style={styles.signUpOverlay}>
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
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.canvasViewport,
            { width: canvasWidth, height: canvasHeight },
          ]}
        >
          <View
            style={[
              styles.phoneCanvas,
              { transform: [{ scale: canvasScale }] },
            ]}
          >
            <Text style={styles.headerText}>
              더 똑똑하게{"\n"}친구들과 장소를 공유해봐요.
            </Text>
            <View style={styles.imageContainer}>
              <Image
                style={styles.loginImage}
                source={require("@/assets/images/loginImage.png")}
                resizeMode="contain"
              />
            </View>
            <View style={styles.loginButtonContainer}>
              {renderKakaoLoginButton()}
              {isAppleLoginAvailable ? (
                <Pressable
                  disabled={isAppleLoginPending || isKakaoLoginPending}
                  style={({ pressed }) => [
                    styles.appleLoginButton,
                    (pressed || isAppleLoginPending || isKakaoLoginPending) &&
                      styles.loginButtonPending,
                  ]}
                  onPress={() => void handleAppleLogin()}
                >
                  <Image
                    style={styles.appleIcon}
                    source={require("@/assets/images/apple-icon.png")}
                  />
                  <Text style={styles.appleLoginButtonText}>
                    Apple로 계속하기
                  </Text>
                </Pressable>
              ) : null}
              {/* <Pressable style={styles.googleLoginButton}>
                <Image
                  style={styles.googleIcon}
                  source={require("@/assets/images/google-icon.png")}
                ></Image>
                <Text style={styles.googleLoginButtonText}>
                  Google로 계속하기
                </Text>
              </Pressable> */}
            </View>
          </View>
        </View>
      </ScrollView>
      <TermsConsentBottomSheet
        ref={termsConsentSheetRef}
        termsUrl={TERMS_URL}
        privacyPolicyUrl={PRIVACY_POLICY_URL}
        isSubmitting={isAgreementSubmitting}
        onConfirm={() => void handleTermsConfirmed()}
        onDismiss={() => {
          agreementSheetPresentedRef.current = false;
          if (!useAuthStore.getState().token) {
            useAuthStore.getState().clearPendingAgreement();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  canvasViewport: {
    alignSelf: "center",
    overflow: "hidden",
  },
  phoneCanvas: {
    position: "relative",
    width: 375,
    height: 812,
    overflow: "hidden",
    backgroundColor: Colors.white,
    transformOrigin: "top left",
  },
  headerText: {
    position: "absolute",
    top: 137,
    left: 16,
    right: 16,
    ...TextStyles.Bold24,
    color: "#2E3133",
  },
  imageContainer: {
    position: "absolute",
    top: 219,
    left: "50%",
    width: 410,
    height: 453,
    transform: [{ translateX: -205 }],
  },
  loginImage: {
    width: 410,
    height: 453,
  },
  loginButtonContainer: {
    position: "absolute",
    top: 624.6,
    left: 16,
    right: 16,
    gap: 12,
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
  signUpOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  signUpImage: {
    position: "absolute",
    left: 5.75,
    bottom: 42,
    width: 128,
    height: 56.5,
  },
  kakaoIcon: { width: 18, height: 18, marginRight: 6 },
  kakaoLoginButtonText: {
    ...TextStyles.SemiBold14,
    color: "#181A1C",
  },
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
});
