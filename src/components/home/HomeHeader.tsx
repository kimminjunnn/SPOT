import { View, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import StoryList from "@/src/components/home/StoryList";
import UserCard from "@/src/components/common/UserCard";

import { Colors } from "@/src/styles/Colors";
import { useMyProfileStore } from "@/src/stores/useMyProfileStore";
import { useFriendsStore } from "@/src/stores/useFriendsStore";

import type { SelectedUser as StorySelectedUser } from "@/src/components/home/StoryList";
import { blockFriend } from "@/src/lib/api/friends";

type HomeHeaderProps = {
  friends: any[];
  selectedUser: StorySelectedUser | null;
  onSelectStory: (user: StorySelectedUser | null) => void;
  showStoryList?: boolean;
  showUserCard?: boolean;
};

export const HomeHeader = ({
  friends,
  selectedUser,
  onSelectStory,
  showStoryList = true,
  showUserCard = true,
}: HomeHeaderProps) => {
  const DEFAULT_MY_IMAGE = require("@/assets/images/default-profile.png");

  const profile = useMyProfileStore((s) => s.profile);
  const friendCount = useMyProfileStore((s) => s.friendCount);
  const recentFriendPhotos = useMyProfileStore((s) => s.recentFriendPhotos);

  const myNickname = profile?.spotNickname ?? "내 닉네임";
  const myUserId = profile?.spotId ?? "";
  const myBio = profile?.oneLine ?? "";
  const myAvatarSource =
    profile?.photo && profile.photo.length > 0
      ? { uri: profile.photo }
      : DEFAULT_MY_IMAGE;

  const myFriendAvatars = recentFriendPhotos.map((photo, index) =>
    photo && photo.length > 0
      ? { uri: photo }
      : {
          uri: `fallback-${index}`,
        },
  );

  const loadFriends = useFriendsStore((s) => s.loadFriends);
  const handlePressEditProfile = () => {
    router.push("/profile/edit");
  };

  const handlePressBlock = () => {
    Alert.alert("차단하기", "이 사용자를 차단하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "차단",
        style: "destructive",
        onPress: async () => {
          if (!selectedUser?.userId) return;

          try {
            await blockFriend(selectedUser.userId);
            loadFriends({ force: true });
            onSelectStory(null);
          } catch (e) {
            Alert.alert("차단 실패", "다시 시도해주세요");
          }
        },
      },
    ]);
  };

  const handlePressReport = () => {
    Alert.alert("신고하기", "이 사용자를 신고하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "신고",
        style: "destructive",
        onPress: () => {
          console.log("신고 실행");
        },
      },
    ]);
  };

  const isMySelectedCard = selectedUser?.scope === "me";

  const selectedProfileImage = isMySelectedCard
    ? myAvatarSource
    : (selectedUser?.profileImage ?? DEFAULT_MY_IMAGE);

  const selectedNickname = isMySelectedCard
    ? myNickname
    : (selectedUser?.nickname ?? "");

  const selectedUserId = isMySelectedCard
    ? myUserId
    : selectedUser?.scope === "friend"
      ? String(selectedUser.userId ?? "")
      : (selectedUser?.userIdText ?? "");

  const selectedBio = isMySelectedCard ? myBio : (selectedUser?.bio ?? "");

  const selectedFriendCount = isMySelectedCard ? friendCount : 0;
  const selectedFriendAvatars = isMySelectedCard ? myFriendAvatars : [];

  return (
    <View style={styles.headerContainer}>
      {showStoryList && (
        <StoryList
          myNickname={myNickname}
          myUserId={myUserId}
          myBio={myBio}
          myAvatarSource={myAvatarSource}
          friends={friends}
          selectedUser={selectedUser}
          onSelectStory={onSelectStory}
        />
      )}

      {showUserCard && selectedUser ? (
        <View style={styles.userCardWrapper}>
          <UserCard
            variant="story"
            profileImage={selectedProfileImage}
            nickname={selectedNickname}
            userid={selectedUserId}
            bio={selectedBio}
            friendAvatars={selectedFriendAvatars}
            friendCount={selectedFriendCount}
            isMyCard={isMySelectedCard}
            onPressEditProfile={handlePressEditProfile}
            onPressBlock={handlePressBlock}
            onPressReport={handlePressReport}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.white,
    paddingLeft: 16,
  },

  userCardWrapper: {
    paddingRight: 16,
    paddingTop: 12,
  },
});
