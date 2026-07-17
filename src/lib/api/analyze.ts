import { api8001 } from "@/src/lib/api/client";
import type { AnalyzeApiResponse } from "@/src/lib/analyze/analyzeResult";
import type { ExtractTicketStatusResponse } from "@/src/lib/analyze/extractTicketStatus";

export type ExtractEligibilityResponse = {
  current_score: number;
  need_ad: boolean;
  score_cost: number;
  ticket_id: string;
};

export async function analyzeInstagramUrl(url: string): Promise<AnalyzeApiResponse> {
  const res = await api8001.post<AnalyzeApiResponse>("/analyze", { url });
  return res.data;
}

export async function checkExtractEligibility(
  url: string,
): Promise<ExtractEligibilityResponse> {
  const res = await api8001.post<ExtractEligibilityResponse>(
    "/extract/eligibility",
    { url },
  );

  return res.data;
}

export async function getExtractTicketStatus(
  ticketId: string,
): Promise<ExtractTicketStatusResponse> {
  const res = await api8001.get<ExtractTicketStatusResponse>(
    `/ads/ticket/${encodeURIComponent(ticketId)}/status`,
  );

  return res.data;
}

export async function forceVerifyExtractTicket(
  ticketId: string,
): Promise<ExtractTicketStatusResponse> {
  const res = await api8001.post<ExtractTicketStatusResponse>(
    `/debug/force-verify/${encodeURIComponent(ticketId)}`,
  );

  return res.data;
}
