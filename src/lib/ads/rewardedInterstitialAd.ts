import { NativeModules, Platform } from "react-native";

const IOS_INSTAGRAM_EXTRACT_REWARDED_INTERSTITIAL_AD_UNIT_ID =
  "ca-app-pub-8541783556954989/8035666010";

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");
type RewardedInterstitialAdInstance = ReturnType<
  GoogleMobileAdsModule["RewardedInterstitialAd"]["createForAdRequest"]
>;
type Reward = {
  amount: number;
  type: string;
};

export type ShowRewardedInterstitialResult =
  | { status: "earned"; reward: Reward }
  | { status: "closed" };

function hasRewardedInterstitialNativeModule() {
  return (
    Platform.OS === "ios" &&
    NativeModules.RNGoogleMobileAdsModule != null &&
    NativeModules.RNGoogleMobileAdsRewardedInterstitialModule != null
  );
}

async function loadGoogleMobileAds(): Promise<GoogleMobileAdsModule | null> {
  if (!hasRewardedInterstitialNativeModule()) return null;

  try {
    return await import("react-native-google-mobile-ads");
  } catch (error) {
    if (__DEV__) console.warn("Rewarded interstitial import failed:", error);
    return null;
  }
}

export async function showInstagramExtractRewardedInterstitial(): Promise<ShowRewardedInterstitialResult> {
  const module = await loadGoogleMobileAds();

  if (!module) {
    throw new Error("보상형 광고를 사용할 수 없습니다.");
  }

  const adUnitId = __DEV__
    ? module.TestIds.REWARDED_INTERSTITIAL
    : IOS_INSTAGRAM_EXTRACT_REWARDED_INTERSTITIAL_AD_UNIT_ID;

  const rewardedInterstitial =
    module.RewardedInterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

  return new Promise((resolve, reject) => {
    let settled = false;
    let earnedReward: Reward | null = null;
    const unsubscribers: (() => void)[] = [];

    const cleanup = () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };

    const settle = (result: ShowRewardedInterstitialResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const addListener = <
      EventType extends
        | GoogleMobileAdsModule["AdEventType"][keyof GoogleMobileAdsModule["AdEventType"]]
        | GoogleMobileAdsModule["RewardedAdEventType"][keyof GoogleMobileAdsModule["RewardedAdEventType"]],
    >(
      type: EventType,
      listener: Parameters<RewardedInterstitialAdInstance["addAdEventListener"]>[1],
    ) => {
      const unsubscribe = rewardedInterstitial.addAdEventListener(
        type as never,
        listener as never,
      );
      unsubscribers.push(unsubscribe);
    };

    addListener(module.RewardedAdEventType.LOADED, () => {
      rewardedInterstitial.show().catch(fail);
    });

    addListener(module.RewardedAdEventType.EARNED_REWARD, (reward) => {
      earnedReward = reward as Reward;
    });

    addListener(module.AdEventType.CLOSED, () => {
      settle(
        earnedReward
          ? { status: "earned", reward: earnedReward }
          : { status: "closed" },
      );
    });

    addListener(module.AdEventType.ERROR, (error) => {
      fail(error);
    });

    rewardedInterstitial.load();
  });
}
