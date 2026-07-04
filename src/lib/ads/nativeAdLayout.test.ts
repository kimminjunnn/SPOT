import {
  AD_CHOICES_RESERVED_SIZE,
  NATIVE_AD_VIEW_HEIGHT,
  NATIVE_AD_MEDIA_HEIGHT,
  NATIVE_AD_MEDIA_WIDTH,
} from "./nativeAdLayout";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(
  NATIVE_AD_MEDIA_WIDTH >= 120,
  "native ad media width must be at least 120pt",
);

assert(
  NATIVE_AD_MEDIA_HEIGHT >= 120,
  "native ad media height must be at least 120pt",
);

assert(
  AD_CHOICES_RESERVED_SIZE >= 32,
  "native ad must reserve enough top-right space for AdChoices",
);

assert(
  NATIVE_AD_VIEW_HEIGHT >=
    NATIVE_AD_MEDIA_HEIGHT + AD_CHOICES_RESERVED_SIZE + 48,
  "native ad view must be tall enough to contain all registered asset views",
);
