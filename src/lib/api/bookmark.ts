import { api8001 } from "./client";

export type BookmarkSourceType =
  | "instagram"
  | "search"
  | "friend_profile"
  | "comment";

export type BookmarkSource = {
  sourceType: BookmarkSourceType;
  sourceUserId?: number | null;
  sourceCommentId?: number | null;
};

type BookmarkToggleResponse = {
  isMarked?: boolean;
};

export async function toggleBookmarkApi(
  placeId: number,
  source: BookmarkSource,
): Promise<boolean | undefined> {
  const res = await api8001.post<BookmarkToggleResponse>(
    `/places/${placeId}/toggle`,
    {
      save_type: "spot",
      source_type: source.sourceType,
      source_user_id: source.sourceUserId ?? null,
      source_comment_id: source.sourceCommentId ?? null,
    },
  );

  return typeof res.data?.isMarked === "boolean"
    ? res.data.isMarked
    : undefined;
}
