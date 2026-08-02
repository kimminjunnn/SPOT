import type {
  FriendStatus,
  RelationshipInfo,
} from "../../types/friends";

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

export function toFriendSearchStatusFromRelationship(
  relationship: RelationshipInfo,
): FriendStatus {
  if (relationship.blocked_by_me || relationship.blocked_by_target) {
    return "blocked";
  }

  // 받은 요청은 사용자가 바로 수락할 수 있도록 다른 팔로우 상태보다 우선한다.
  if (relationship.incoming === "requested") {
    return "request_received";
  }

  if (relationship.outgoing === "following") {
    return "friends";
  }

  if (relationship.outgoing === "requested") {
    return "request_sent";
  }

  return "none";
}
