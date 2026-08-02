const toNonNegativeInteger = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

/**
 * The profile API may omit friends who use the default profile image from
 * recent_friend_photos. Keep the preview count aligned with friend_count and
 * represent omitted photos as null so the UI can render its local fallback.
 */
export function getProfileFriendPhotoSlots(
  recentFriendPhotos: readonly unknown[],
  friendCount: number,
  maxSlots = 3,
): (string | null)[] {
  const slotCount = Math.min(
    toNonNegativeInteger(friendCount),
    toNonNegativeInteger(maxSlots),
  );

  return Array.from({ length: slotCount }, (_, index) => {
    const photo = recentFriendPhotos[index];

    if (typeof photo !== "string") return null;

    const trimmedPhoto = photo.trim();
    return trimmedPhoto.length > 0 ? trimmedPhoto : null;
  });
}
