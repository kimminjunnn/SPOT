export type AppleMapPlace = {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
};

function hasValidCoordinates({ lat, lng }: AppleMapPlace): boolean {
  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
  );
}

function buildSearchQuery({ name, address }: AppleMapPlace): string {
  return [name.trim(), address.trim()].filter(Boolean).join(" ");
}

export function buildAppleMapLink(place: AppleMapPlace): string {
  const { name, lat, lng } = place;

  if (hasValidCoordinates(place)) {
    return `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(name.trim())}`;
  }

  return `https://maps.apple.com/?q=${encodeURIComponent(buildSearchQuery(place))}`;
}
