import { buildRewardedInterstitialRequestOptions } from "./rewardedInterstitialOptions";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nactual: ${actualJson}\nexpected: ${expectedJson}`);
  }
}

assertEqual(
  buildRewardedInterstitialRequestOptions("ticket-123"),
  {
    requestNonPersonalizedAdsOnly: true,
    serverSideVerificationOptions: {
      customData: "ticket-123",
    },
  },
  "passes the extract ticket id as AdMob SSV custom data",
);
