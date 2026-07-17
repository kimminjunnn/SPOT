import type { SavePlaceItem } from "@/src/components/bottomSheet/SavePlacesBottomSheet";

export const ANALYZE_AD_REQUIRED_STATUS = "AD_REQUIRED";

export type AnalyzeApiResult = {
  id?: number;
  name?: string;
  category?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  photo?: string | string[] | null;
};

export type AnalyzeApiResponse = {
  status?: "OK" | typeof ANALYZE_AD_REQUIRED_STATUS | string;
  code?: string;
  extractScore?: number;
  threshold?: number;
  results?: (AnalyzeApiResult | AnalyzeApiResult[])[];
};

export function isAnalyzeAdRequired(response: AnalyzeApiResponse): boolean {
  return response.status === ANALYZE_AD_REQUIRED_STATUS;
}

export function normalizeAnalyzeResults(
  results: AnalyzeApiResponse["results"],
): AnalyzeApiResult[] {
  if (!Array.isArray(results)) return [];

  return results.flatMap((item) => {
    if (Array.isArray(item)) return item;
    if (item && typeof item === "object") return [item];
    return [];
  });
}

function getAnalyzeThumbnail(
  photo: AnalyzeApiResult["photo"],
): string | undefined {
  const candidates = Array.isArray(photo) ? photo : [photo];

  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );
}

export function mapAnalyzeResponseToItems(
  response: AnalyzeApiResponse,
): SavePlaceItem[] {
  const normalized = normalizeAnalyzeResults(response.results);

  return normalized
    .filter((item) => !!item.name && !!item.address)
    .map((item, index) => {
      const lat = item.latitude ?? 0;
      const lng = item.longitude ?? 0;
      const stableId =
        item.id != null
          ? String(item.id)
          : `${index}_${item.name}_${lat}_${lng}`;

      return {
        id: stableId,
        name: item.name ?? "이름 없음",
        category: item.category ?? "unknown",
        address: item.address ?? "주소 없음",
        thumbUrl: getAnalyzeThumbnail(item.photo),
      };
    });
}

export function parseAnalyzeJson(json: string): AnalyzeApiResponse {
  return JSON.parse(json) as AnalyzeApiResponse;
}
