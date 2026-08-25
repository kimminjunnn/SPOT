import { api8080 } from "@/src/lib/api/client";

export type AppleLoginRequest = {
  identityToken: string;
  authorizationCode: string | null;
  nonce: string;
  appleUserId: string;
  email: string | null;
  fullName: string | null;
};

type AppleLoginResponse = {
  accessToken: string;
  tokenType: "Bearer" | string;
};

const APPLE_LOGIN_PATH =
  process.env.EXPO_PUBLIC_APPLE_LOGIN_PATH ?? "/api/auth/apple";

/**
 * Apple에서 받은 credential을 SPOT 세션으로 교환한다.
 * Apple identity token 자체를 앱 로그인 토큰으로 저장하면 안 된다.
 */
export async function loginWithApple(
  payload: AppleLoginRequest,
): Promise<{ token: string }> {
  const { data } = await api8080.post<AppleLoginResponse>(
    APPLE_LOGIN_PATH,
    payload,
  );

  if (!data?.accessToken) {
    throw new Error("Apple 로그인 응답에 SPOT 토큰이 없습니다.");
  }

  return { token: data.accessToken };
}
