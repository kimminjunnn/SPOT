export type SocialLoginStatus = "LOGIN_SUCCESS" | "AGREEMENT_REQUIRED";

export type SocialLoginResult = {
  status: SocialLoginStatus;
  accessToken: string;
  email?: string;
  nickname?: string;
};

type SocialLoginResponse = {
  status?: unknown;
  accessToken?: unknown;
  token?: unknown;
  email?: unknown;
  nickname?: unknown;
  error?: unknown;
};

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeSocialLoginResponse(
  response: SocialLoginResponse,
): SocialLoginResult {
  const error = optionalString(response.error);
  if (error) {
    throw new Error(error);
  }

  if (
    response.status !== "LOGIN_SUCCESS" &&
    response.status !== "AGREEMENT_REQUIRED"
  ) {
    throw new Error("로그인 응답 상태를 확인할 수 없습니다.");
  }

  const accessToken =
    optionalString(response.accessToken) ?? optionalString(response.token);

  if (!accessToken) {
    throw new Error("로그인 응답에 토큰이 없습니다.");
  }

  return {
    status: response.status,
    accessToken,
    email: optionalString(response.email),
    nickname: optionalString(response.nickname),
  };
}

export function parseKakaoCallbackUrl(url: string): SocialLoginResult {
  const parsed = new URL(url);

  return normalizeSocialLoginResponse({
    status: parsed.searchParams.get("status"),
    accessToken: parsed.searchParams.get("accessToken"),
    token: parsed.searchParams.get("token"),
    email: parsed.searchParams.get("email"),
    nickname: parsed.searchParams.get("nickname"),
    error: parsed.searchParams.get("error"),
  });
}
