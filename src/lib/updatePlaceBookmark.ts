import type { Place } from "@/src/types/place";

/** Preserve the array and untouched item identities when nothing changes. */
export function updatePlaceBookmark(
  places: Place[],
  placeId: Place["placeId"],
  isBookmarked: boolean,
): Place[] {
  let updated = places;
  for (let index = 0; index < places.length; index += 1) {
    const place = places[index];
    if (place.placeId !== placeId || place.isBookmarked === isBookmarked) continue;
    if (updated === places) updated = places.slice();
    updated[index] = { ...place, isBookmarked };
  }
  return updated;
}
