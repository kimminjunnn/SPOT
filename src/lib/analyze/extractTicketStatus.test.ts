import {
  isExtractTicketFailed,
  isExtractTicketVerified,
} from "./extractTicketStatus";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nactual: ${actual}\nexpected: ${expected}`);
  }
}

assertEqual(
  isExtractTicketVerified({ status: "verified" }),
  true,
  "treats the Swagger verified status as ready for extraction",
);

assertEqual(
  isExtractTicketVerified({ status: "pending" }),
  false,
  "does not treat the Swagger pending status as ready",
);

assertEqual(
  isExtractTicketFailed({ status: "expired" }),
  true,
  "treats expired tickets as failed",
);

assertEqual(
  isExtractTicketFailed({ status: "verified" }),
  false,
  "does not treat verified tickets as failed",
);
