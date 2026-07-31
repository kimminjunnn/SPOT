import type { FriendStatus } from "../../types/friends";

export type FriendRelationshipStatus =
  | "friend"
  | "waiting"
  | "block"
  | "none";

export function toFriendSearchStatus(
  relationshipStatus: FriendRelationshipStatus,
): FriendStatus {
  switch (relationshipStatus) {
    case "friend":
      return "friends";
    case "waiting":
      return "request_sent";
    case "block":
      return "blocked";
    case "none":
    default:
      return "none";
  }
}
