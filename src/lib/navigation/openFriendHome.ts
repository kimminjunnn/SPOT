import { router } from "expo-router";

export type FriendHomeTarget = {
  id: number;
  nickname: string;
  userId: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

export function openFriendHome(friend: FriendHomeTarget) {
  router.replace({
    pathname: "/(tabs)",
    params: {
      selectedFriendId: String(friend.id),
      selectedFriendNickname: friend.nickname,
      selectedFriendUserId: friend.userId,
      selectedFriendBio: friend.bio ?? "",
      selectedFriendAvatarUrl: friend.avatarUrl ?? "",
      friendSelectionKey: `${friend.id}-${Date.now()}`,
    },
  });
}
