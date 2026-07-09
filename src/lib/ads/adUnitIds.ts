type GetAdUnitIdOptions = {
  productionId: string;
  testId: string;
  useTestAds?: boolean;
  isDev?: boolean;
};

export const USE_TEST_ADS =
  process.env.EXPO_PUBLIC_USE_TEST_ADS === "true";

const IS_DEV = typeof __DEV__ !== "undefined" && __DEV__;

export function getAdUnitId({
  productionId,
  testId,
  isDev = IS_DEV,
  useTestAds = isDev || USE_TEST_ADS,
}: GetAdUnitIdOptions) {
  return useTestAds ? testId : productionId;
}
