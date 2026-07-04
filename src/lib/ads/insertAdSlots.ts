export type AdSlotListItem<T> =
  | {
      type: "content";
      key: string;
      item: T;
      contentIndex: number;
    }
  | {
      type: "ad";
      key: string;
      slotIndex: number;
      afterContentIndex: number;
    };

type InsertAdSlotsOptions<T> = {
  interval: number;
  adKeyPrefix: string;
  maxAds?: number;
  getItemKey: (item: T, index: number) => string;
};

export function insertAdSlots<T>(
  items: T[],
  options: InsertAdSlotsOptions<T>,
): AdSlotListItem<T>[] {
  const { interval, adKeyPrefix, getItemKey, maxAds = Infinity } = options;

  if (interval <= 0) return [];

  const result: AdSlotListItem<T>[] = [];
  let adCount = 0;

  items.forEach((item, index) => {
    result.push({
      type: "content",
      key: getItemKey(item, index),
      item,
      contentIndex: index,
    });

    const contentCount = index + 1;
    const shouldInsertAd =
      contentCount % interval === 0 && adCount < maxAds;

    if (shouldInsertAd) {
      adCount += 1;
      result.push({
        type: "ad",
        key: `${adKeyPrefix}-ad-${adCount}`,
        slotIndex: adCount,
        afterContentIndex: index,
      });
    }
  });

  return result;
}
