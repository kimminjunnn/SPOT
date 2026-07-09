import { getAdUnitId } from "./adUnitIds";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nactual: ${actual}\nexpected: ${expected}`);
  }
}

const productionId = "production-ad-unit";
const testId = "test-ad-unit";

assertEqual(
  getAdUnitId({ productionId, testId, useTestAds: true }),
  testId,
  "uses the test ad unit when test ads are enabled",
);

assertEqual(
  getAdUnitId({ productionId, testId, useTestAds: false }),
  productionId,
  "uses the production ad unit when test ads are disabled",
);

assertEqual(
  getAdUnitId({ productionId, testId, isDev: true }),
  testId,
  "uses the test ad unit in local development by default",
);
