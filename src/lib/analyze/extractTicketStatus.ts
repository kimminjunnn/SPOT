export type ExtractTicketStatus =
  | "pending"
  | "verified"
  | "expired"
  | "failed"
  | "invalid"
  | "used"
  | string;

export type ExtractTicketStatusResponse = {
  status?: ExtractTicketStatus;
};

export function isExtractTicketVerified(
  response: ExtractTicketStatusResponse,
): boolean {
  return normalizeStatus(response.status) === "verified";
}

export function isExtractTicketFailed(
  response: ExtractTicketStatusResponse,
): boolean {
  return ["expired", "failed", "invalid", "used"].includes(
    normalizeStatus(response.status),
  );
}

function normalizeStatus(status: unknown): string {
  return typeof status === "string" ? status.toLowerCase() : "";
}
