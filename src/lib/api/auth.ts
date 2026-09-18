import axios from "axios";
import {
  normalizeSocialLoginResponse,
  type SocialLoginResult,
} from "@/src/lib/auth/socialLogin";

export type AppleLoginRequest = {
  identityToken: string;
  authorizationCode: string | null;
  nonce: string;
  appleUserId: string;
  email: string | null;
  fullName: string | null;
};

const APPLE_LOGIN_PATH =
  process.env.EXPO_PUBLIC_APPLE_LOGIN_PATH ?? "/api/auth/apple";
const AGREEMENTS_PATH = "/api/auth/agreements";

const authApi8080 = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL_8080,
  timeout: 10_000,
});

export const REQUIRED_AGREEMENTS = [
  { type: "TERMS", version: "v1", required: true, agreed: true },
  { type: "PRIVACY", version: "v1", required: true, agreed: true },
] as const;

/**
 * Apple에서 받은 credential을 SPOT 세션으로 교환한다.
 * Apple identity token 자체를 앱 로그인 토큰으로 저장하면 안 된다.
 */
export async function loginWithApple(
  payload: AppleLoginRequest,
): Promise<SocialLoginResult> {
  const { data } = await authApi8080.post(APPLE_LOGIN_PATH, payload);

  return normalizeSocialLoginResponse(data);
}

export async function submitRequiredAgreements(
  temporaryToken: string,
): Promise<SocialLoginResult> {
  const { data } = await authApi8080.post(
    AGREEMENTS_PATH,
    { agreements: REQUIRED_AGREEMENTS },
    { headers: { Authorization: `Bearer ${temporaryToken}` } },
  );

  const result = normalizeSocialLoginResponse(data);
  if (result.status !== "LOGIN_SUCCESS") {
    throw new Error("약관 동의 후 최종 로그인이 완료되지 않았습니다.");
  }

  return result;
}
