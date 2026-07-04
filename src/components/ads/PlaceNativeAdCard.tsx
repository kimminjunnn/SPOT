import { useEffect, useState } from "react";
import {
  Image,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";
import {
  AD_CHOICES_RESERVED_SIZE,
  NATIVE_AD_VIEW_HEIGHT,
  NATIVE_AD_MEDIA_HEIGHT,
  NATIVE_AD_MEDIA_WIDTH,
} from "@/src/lib/ads/nativeAdLayout";

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");
type NativeAdInstance = Awaited<
  ReturnType<GoogleMobileAdsModule["NativeAd"]["createForAdRequest"]>
>;

const IOS_PLACE_NATIVE_AD_UNIT_ID =
  "ca-app-pub-8541783556954989/3836979247";

const hasGoogleMobileAdsNativeModules = () =>
  NativeModules.RNGoogleMobileAdsModule != null &&
  NativeModules.RNGoogleMobileAdsNativeModule != null;

const getGoogleMobileAdsModule =
  async (): Promise<GoogleMobileAdsModule | null> => {
    if (!hasGoogleMobileAdsNativeModules()) return null;

    try {
      return await import("react-native-google-mobile-ads");
    } catch (error) {
      if (__DEV__) {
        console.warn("Google Mobile Ads native module unavailable:", error);
      }
      return null;
    }
  };

export default function PlaceNativeAdCard() {
  const [googleMobileAds, setGoogleMobileAds] =
    useState<GoogleMobileAdsModule | null>(null);
  const [nativeAd, setNativeAd] = useState<NativeAdInstance | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    if (!hasGoogleMobileAdsNativeModules()) return;

    let mounted = true;
    let loadedAd: NativeAdInstance | null = null;

    void getGoogleMobileAdsModule().then(async (module) => {
      if (!module || !mounted) return;

      setGoogleMobileAds(module);

      try {
        const requestOptions = {
          requestNonPersonalizedAdsOnly: true,
          adChoicesPlacement: module.NativeAdChoicesPlacement.TOP_RIGHT,
        };

        loadedAd = await module.NativeAd.createForAdRequest(
          __DEV__ ? module.TestIds.NATIVE : IOS_PLACE_NATIVE_AD_UNIT_ID,
          requestOptions,
        );

        if (mounted) {
          setNativeAd(loadedAd);
        } else {
          loadedAd.destroy();
        }
      } catch (error) {
        if (__DEV__) console.warn("Place native ad failed:", error);
      }
    });

    return () => {
      mounted = false;
      loadedAd?.destroy();
    };
  }, []);

  if (Platform.OS !== "ios") return null;
  if (!googleMobileAds || !nativeAd) return null;

  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } =
    googleMobileAds;

  return (
    <View style={styles.listItem}>
      <NativeAdView nativeAd={nativeAd} style={styles.adView}>
        <View style={styles.topRow}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={1}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>
          <View style={styles.adLabel}>
            <Text style={styles.adLabelText}>광고</Text>
          </View>
          <View pointerEvents="none" style={styles.adChoicesSpacer} />
        </View>

        <View style={styles.mainRow}>
          {nativeAd.mediaContent ? (
            <NativeMediaView resizeMode="cover" style={styles.media} />
          ) : nativeAd.icon ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.media} />
            </NativeAsset>
          ) : (
            <View style={styles.mediaPlaceholder} />
          )}

          <View style={styles.metaColumn}>
            <View>
              {nativeAd.advertiser && (
                <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                  <Text style={styles.advertiser} numberOfLines={1}>
                    {nativeAd.advertiser}
                  </Text>
                </NativeAsset>
              )}

              {nativeAd.body && (
                <NativeAsset assetType={NativeAssetType.BODY}>
                  <Text style={styles.body} numberOfLines={3}>
                    {nativeAd.body}
                  </Text>
                </NativeAsset>
              )}
            </View>

            {nativeAd.callToAction && (
              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <Text style={styles.ctaButton} numberOfLines={1}>
                  {nativeAd.callToAction}
                </Text>
              </NativeAsset>
            )}
          </View>
        </View>
      </NativeAdView>
    </View>
  );
}

const styles = StyleSheet.create({
  listItem: {
    width: "100%",
    marginVertical: 15,
    paddingHorizontal: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E6E666",
    backgroundColor: Colors.white,
  },
  adView: {
    width: "100%",
    minHeight: NATIVE_AD_MEDIA_HEIGHT + 42,
    height: NATIVE_AD_VIEW_HEIGHT,
    paddingTop: 8,
    paddingBottom: 8,
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  topRow: {
    height: AD_CHOICES_RESERVED_SIZE,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  adLabel: {
    marginLeft: 8,
    marginTop: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.primary_500,
  },
  adLabelText: {
    ...TextStyles.Bold12,
    color: Colors.white,
  },
  headline: {
    ...TextStyles.Bold18,
    flexShrink: 1,
    color: Colors.gray_900,
  },
  adChoicesSpacer: {
    width: AD_CHOICES_RESERVED_SIZE,
    height: AD_CHOICES_RESERVED_SIZE,
    marginLeft: "auto",
  },
  mainRow: {
    height: NATIVE_AD_MEDIA_HEIGHT,
    flexDirection: "row",
    marginBottom: 8,
  },
  media: {
    width: NATIVE_AD_MEDIA_WIDTH,
    height: NATIVE_AD_MEDIA_HEIGHT,
    marginRight: 12,
    borderRadius: 16.73,
    overflow: "hidden",
    backgroundColor: Colors.gray_100,
  },
  mediaPlaceholder: {
    width: NATIVE_AD_MEDIA_WIDTH,
    height: NATIVE_AD_MEDIA_HEIGHT,
    marginRight: 12,
    borderRadius: 16.73,
    backgroundColor: Colors.gray_100,
  },
  metaColumn: {
    flex: 1,
    minHeight: NATIVE_AD_MEDIA_HEIGHT,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  advertiser: {
    ...TextStyles.Medium12,
    marginBottom: 5,
    color: Colors.gray_400,
  },
  body: {
    ...TextStyles.Regular14,
    flexShrink: 1,
    color: Colors.gray_700,
  },
  ctaButton: {
    ...TextStyles.SemiBold14,
    alignSelf: "stretch",
    color: Colors.white,
    textAlign: "center",
    textAlignVertical: "center",
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: Colors.gray_900,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
});
