// src/lib/api/inquiry.ts
import { api8001 } from "@/src/lib/api/client";
import type { ApiEnvelope } from "@/src/lib/api/common";

// ============
// Create Inquiry
// POST /inquiries
// category: 'extract' | 'detail' | 'general'
//  - extract: ref_url 에 게시물 URL
//  - detail: ref_url 에 상세 페이지 route 주소
//  - general: ref_url 생략 가능
// ============
export type InquiryCategory = "extract" | "detail" | "general";

export type CreateInquiryBody = {
  category: InquiryCategory;
  content: string;
  ref_url?: string;
};

export type CreateInquiryResponse = ApiEnvelope<{
  message?: string;
}>;

export async function createInquiry(body: CreateInquiryBody) {
  const res = await api8001.post<CreateInquiryResponse>("/inquiries", body);
  return res.data;
}
