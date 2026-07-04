import { useEffect, useState } from "react";
import { NativeModules, Platform, StyleSheet, View } from "react-native";

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");

const IOS_PROFILE_BANNER_AD_UNIT_ID =
  "ca-app-pub-8541783556954989/3844838241";

const hasGoogleMobileAdsNativeModule = () =>
  NativeModules.RNGoogleMobileAdsModule != null;

const getGoogleMobileAdsModule = async () => {
  if (!hasGoogleMobileAdsNativeModule()) return null;

  try {
    return await import("react-native-google-mobile-ads");
  } catch (error) {
    if (__DEV__) console.warn("Google Mobile Ads native module unavailable:", error);
    return null;
  }
};

export default function ProfileAdBanner() {
  const [googleMobileAds, setGoogleMobileAds] =
    useState<GoogleMobileAdsModule | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    if (!hasGoogleMobileAdsNativeModule()) return;

    void getGoogleMobileAdsModule().then(setGoogleMobileAds);
  }, []);

  if (Platform.OS !== "ios") return null;

  if (!googleMobileAds) return null;

  const { BannerAd, BannerAdSize, TestIds } = googleMobileAds;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={__DEV__ ? TestIds.BANNER : IOS_PROFILE_BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          if (__DEV__) console.warn("Profile banner ad failed:", error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
  },
});
