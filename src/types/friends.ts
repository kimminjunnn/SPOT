export type FriendStatus =
  | "none"
  | "friends"
  | "request_sent"
  | "request_received"
  | "blocked";

export type RelationshipStatus = "none" | "requested" | "following";

export type RelationshipInfo = {
  outgoing: RelationshipStatus;
  incoming: RelationshipStatus;
  blocked_by_me: boolean;
  blocked_by_target: boolean;
};
