import type { RequestOptions } from "react-native-google-mobile-ads";

export function buildRewardedInterstitialRequestOptions(
  ticketId: string,
): RequestOptions {
  return {
    requestNonPersonalizedAdsOnly: true,
    serverSideVerificationOptions: {
      customData: ticketId,
    },
  };
}
