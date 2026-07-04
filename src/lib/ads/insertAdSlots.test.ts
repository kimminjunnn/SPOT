import { insertAdSlots } from "./insertAdSlots";

type Place = {
  id: number;
};

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nactual: ${actualJson}\nexpected: ${expectedJson}`);
  }
}

const result = insertAdSlots<Place>(
  Array.from({ length: 11 }, (_, index) => ({ id: index + 1 })),
  {
    interval: 5,
    adKeyPrefix: "place-list",
    getItemKey: (place) => `place-${place.id}`,
  },
);

assertEqual(
  result.map((item) => item.type),
  [
    "content",
    "content",
    "content",
    "content",
    "content",
    "ad",
    "content",
    "content",
    "content",
    "content",
    "content",
    "ad",
    "content",
  ],
  "inserts one ad slot after every five content items",
);

assertEqual(
  result.filter((item) => item.type === "ad").map((item) => item.key),
  ["place-list-ad-1", "place-list-ad-2"],
  "uses stable ad slot keys",
);

const capped = insertAdSlots<Place>(
  Array.from({ length: 20 }, (_, index) => ({ id: index + 1 })),
  {
    interval: 5,
    maxAds: 2,
    adKeyPrefix: "place-list",
    getItemKey: (place) => `place-${place.id}`,
  },
);

assertEqual(
  capped.filter((item) => item.type === "ad").length,
  2,
  "respects the maxAds limit",
);
