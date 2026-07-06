import { api8001 } from "@/src/lib/api/client";
import type { AnalyzeApiResponse } from "@/src/lib/analyze/analyzeResult";

const ENABLE_REWARD_COMPLETE_API =
  process.env.EXPO_PUBLIC_ENABLE_REWARD_COMPLETE_API === "true";

export async function analyzeInstagramUrl(url: string): Promise<AnalyzeApiResponse> {
  const res = await api8001.post<AnalyzeApiResponse>("/analyze", { url });
  return res.data;
}

export async function completeExtractScoreReward(): Promise<void> {
  if (!ENABLE_REWARD_COMPLETE_API) return;

  await api8001.post("/ads/reward-complete", {
    rewardType: "extract_score_reset",
  });
}
