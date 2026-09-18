import { REQUIRED_AGREEMENTS } from "./auth";

const expected = [
  { type: "TERMS", version: "v1", required: true, agreed: true },
  { type: "PRIVACY", version: "v1", required: true, agreed: true },
];

if (JSON.stringify(REQUIRED_AGREEMENTS) !== JSON.stringify(expected)) {
  throw new Error("required agreement payload must match the backend contract");
}
