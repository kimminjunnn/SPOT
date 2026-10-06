import { REQUIRED_AGREEMENTS } from "./auth";

const expected = [
  { type: "TERMS", version: "v1" },
  { type: "PRIVACY", version: "v1" },
];

if (JSON.stringify(REQUIRED_AGREEMENTS) !== JSON.stringify(expected)) {
  throw new Error("required agreement payload must match the backend contract");
}
