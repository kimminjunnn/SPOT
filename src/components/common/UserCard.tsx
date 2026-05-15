import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ImageSourcePropType,
} from "react-native";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";
import ActionMenuModal from "@/src/components/common/ActionMenuModal";

type Props = {
  variant?: "profile" | "story";

  profileImage: ImageSourcePropType;
  nickname: string;
  userid: string;
  bio: string;

  friendCount?: number;
  friendAvatars: ImageSourcePropType[];

  isMyCard?: boolean;
  onPressEditProfile?: () => void;
  onPressBlock?: () => void;
  onPressReport?: () => void;
  onPressFriendCount?: () => void;
};

export default function UserCard({
  variant = "profile",
  nickname,
  userid,
  bio,
  friendCount,
  friendAvatars,
  profileImage,
  isMyCard = false,
  onPressEditProfile,
  onPressBlock,
  onPressReport,
  onPressFriendCount,
}: Props) {
  const moreIcon = require("@/assets/images/3dot.png");
  const isStory = variant === "story";

  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const handleOpenMenu = () => setMenuVisible(true);
  const handleCloseMenu = () => setMenuVisible(false);

  const menus = isMyCard
    ? [
        {
          label: "프로필 수정",
          onPress: () => {
            onPressEditProfile?.();
          },
        },
      ]
    : [
        {
          label: "차단하기",
          onPress: () => {
            onPressBlock?.();
          },
          destructive: true,
        },
        {
          label: "신고하기",
          onPress: () => {
            onPressReport?.();
          },
          destructive: true,
        },
      ];

  return (
    <>
      <View
        style={[
          styles.container,
          isStory ? styles.containerProfile : styles.containerStory,
        ]}
      >
        {isStory ? (
          <>
            <View style={styles.leftProfile}>
              <View style={styles.profileImageFrame}>
                <Image source={profileImage} style={styles.profileImage} />
              </View>
            </View>

            <View style={styles.center}>
              <Text style={styles.nickname} numberOfLines={1}>
                {nickname}
              </Text>
              <Text style={styles.userid} numberOfLines={1}>
                {userid}
              </Text>
              <Text style={styles.bio} numberOfLines={2}>
                {bio}
              </Text>

              {/* profile은 스샷처럼 친구 row 없음 */}
            </View>

            <View style={styles.rightProfile}>
              <Pressable
                onPress={handleOpenMenu}
                hitSlop={10}
                style={styles.moreBtn}
              >
                <Image source={moreIcon} style={styles.moreIcon} />
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.left}>
              <Text style={styles.nickname} numberOfLines={1}>
                {nickname}
              </Text>
              <Text style={styles.useridStory} numberOfLines={1}>
                @{userid}
              </Text>
              <Text style={styles.bioStory} numberOfLines={2}>
                {bio}
              </Text>

              <Pressable
                onPress={onPressFriendCount}
                disabled={!onPressFriendCount}
                style={styles.friendRow}
                hitSlop={8}
              >
                <View style={styles.avatarGroup}>
                  {friendAvatars.map((src, i) => (
                    <Image
                      key={i}
                      source={src}
                      style={[styles.avatar, { marginLeft: i === 0 ? 0 : -6 }]}
                    />
                  ))}
                </View>

                <Text style={styles.friendCount}>친구 {friendCount}명</Text>
              </Pressable>
            </View>

            <View style={styles.right}>
              <View style={[styles.profileImageFrame, styles.profileImageStory]}>
                <Image source={profileImage} style={styles.profileImage} />
              </View>
            </View>
          </>
        )}
      </View>

      <ActionMenuModal
        visible={menuVisible}
        onClose={handleCloseMenu}
        menus={menus}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
  },

  // ===== profile (스샷) =====
  containerProfile: {
    alignItems: "center",
    paddingVertical: 10,
  },

  leftProfile: {
    marginRight: 16,
  },

  center: {
    flex: 1,
    minWidth: 0,
  },

  rightProfile: {
    marginLeft: 12,
    justifyContent: "flex-start",
    alignItems: "center",
  },

  moreBtn: {
    padding: 6,
    marginTop: -44,
  },

  moreIcon: {
    width: 30,
    height: 30,
  },

  // ===== story (기존) =====
  containerStory: {},

  left: {
    flex: 1,
    minWidth: 0,
  },

  // 공통 텍스트
  nickname: {
    ...TextStyles.Bold16,
    color: Colors.gray_800,
    marginBottom: 2,
  },

  userid: {
    ...TextStyles.Regular10,
    color: Colors.gray_400,
    marginBottom: 8,
  },

  bio: {
    ...TextStyles.Regular14,
    color: Colors.gray_800,
  },

  // story용(간격 조금 더)
  useridStory: {
    ...TextStyles.Regular10,
    color: Colors.gray_400,
    marginBottom: 8,
  },

  bioStory: {
    ...TextStyles.Regular14,
    color: Colors.gray_800,
    marginBottom: 14,
  },

  friendRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarGroup: {
    flexDirection: "row",
    marginRight: 6,
  },

  avatar: {
    width: 18,
    height: 18,
    borderRadius: 100,
    borderWidth: 0.74,
    borderColor: "#FFFFFF",
    backgroundColor: "lightgray",
  },

  friendCount: {
    ...TextStyles.Regular12,
    color: Colors.gray_600,
  },

  right: {
    justifyContent: "center",
    alignItems: "center",
  },

  profileImageFrame: {
    width: 77,
    height: 77,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.gray_100,
    overflow: "hidden",
    backgroundColor: Colors.white,
  },

  // 이미지 공통
  profileImage: {
    width: "100%",
    height: "100%",
  },

  // story는 살짝 작게
  profileImageStory: {
    width: 64,
    height: 64,
  },
});
