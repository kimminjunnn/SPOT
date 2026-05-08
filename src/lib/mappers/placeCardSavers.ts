import type { ImageSourcePropType } from "react-native";

export type PlaceCardSavedUser =
  | ImageSourcePropType
  | {
      nickname?: string;
      profileImageUrl?: string | null;
    };

type PlaceCardSaverSource = {
  savers?: unknown;
  saversCount?: unknown;
  memPhotos?: unknown;
  savedCount?: unknown;
};

type PlaceCardSaverProps = {
  savedUsers: PlaceCardSavedUser[];
  savedCount: number;
};

const isNumericCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeSavers = (savers: unknown): PlaceCardSavedUser[] => {
  if (!Array.isArray(savers)) return [];

  return savers
    .map((saver) => {
      if (typeof saver === "string") {
        return { profileImageUrl: saver };
      }

      return saver as PlaceCardSavedUser;
    })
    .filter(Boolean);
};

const normalizeMemPhotos = (memPhotos: unknown): PlaceCardSavedUser[] => {
  if (!Array.isArray(memPhotos)) return [];

  return memPhotos
    .filter((photo): photo is string => typeof photo === "string")
    .map((photo) => ({ profileImageUrl: photo }));
};

export function getPlaceCardSaverProps(
  source: PlaceCardSaverSource,
): PlaceCardSaverProps {
  const savers = normalizeSavers(source.savers);

  if (savers.length > 0 || isNumericCount(source.saversCount)) {
    return {
      savedUsers: savers,
      savedCount: isNumericCount(source.saversCount)
        ? source.saversCount
        : savers.length,
    };
  }

  const memPhotos = normalizeMemPhotos(source.memPhotos);

  return {
    savedUsers: memPhotos,
    savedCount: isNumericCount(source.savedCount)
      ? source.savedCount
      : memPhotos.length,
  };
}
