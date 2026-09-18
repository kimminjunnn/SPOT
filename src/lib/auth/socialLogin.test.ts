import {
  normalizeSocialLoginResponse,
  parseKakaoCallbackUrl,
} from "./socialLogin";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nactual: ${actual}\nexpected: ${expected}`);
  }
}

function assertThrows(run: () => unknown, message: string) {
  try {
    run();
  } catch {
    return;
  }

  throw new Error(message);
}

const completed = normalizeSocialLoginResponse({
  status: "LOGIN_SUCCESS",
  accessToken: "final-token",
});
assertEqual(completed.status, "LOGIN_SUCCESS", "accepts a completed login");
assertEqual(completed.accessToken, "final-token", "keeps the final token");

const agreementRequired = parseKakaoCallbackUrl(
  "spot:///oauth/kakao?status=AGREEMENT_REQUIRED&token=temporary-token",
);
assertEqual(
  agreementRequired.status,
  "AGREEMENT_REQUIRED",
  "accepts an agreement-required callback",
);
assertEqual(
  agreementRequired.accessToken,
  "temporary-token",
  "supports the legacy Kakao token parameter",
);

assertThrows(
  () => normalizeSocialLoginResponse({ accessToken: "token-without-status" }),
  "must reject a response without status",
);
assertThrows(
  () =>
    normalizeSocialLoginResponse({
      status: "LOGIN_SUCCESS",
      accessToken: "",
    }),
  "must reject a response without a token",
);
assertThrows(
  () =>
    normalizeSocialLoginResponse({
      status: "UNKNOWN",
      accessToken: "unsafe-token",
    }),
  "must reject an unknown status",
);
