import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

const DEFAULT_PROFILE_IMAGE = require("@/assets/images/default-profile.png");

export type SavedInfoSaver = {
  nickname: string;
  profileImageUrl: string | null;
};

type SavedInfoCardProps = {
  savers: SavedInfoSaver[];
};

const normalizeSaverProfileImage = (
  profileImageUrl: string | null,
): ImageSourcePropType => {
  if (!profileImageUrl) return DEFAULT_PROFILE_IMAGE;

  if (
    profileImageUrl.startsWith("http://") ||
    profileImageUrl.startsWith("https://")
  ) {
    return { uri: profileImageUrl };
  }

  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL_8000 ?? "";
  return baseUrl
    ? { uri: `${baseUrl}${profileImageUrl}` }
    : DEFAULT_PROFILE_IMAGE;
};

const getSavedInfoText = (savers: SavedInfoSaver[]) => {
  const [first, second] = savers;

  if (!first) return "";
  if (!second) return `${first.nickname}님이 저장한 장소예요.`;
  if (savers.length === 2) {
    return `${first.nickname}, ${second.nickname}님이 저장한 장소예요.`;
  }

  return `${first.nickname}, ${second.nickname} 외 ${savers.length - 2}명이 저장한 장소예요.`;
};

export default function SavedInfoCard({ savers }: SavedInfoCardProps) {
  if (savers.length === 0) return null;

  const saverAvatars = savers
    .slice(0, 3)
    .map((saver) => normalizeSaverProfileImage(saver.profileImageUrl));
  const extraSaverCount = Math.max(savers.length - saverAvatars.length, 0);
  const savedInfoText = getSavedInfoText(savers);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatarGroup}>
          {saverAvatars.map((source, index) => (
            <Image
              key={`${savers[index]?.nickname}-${index}`}
              source={source}
              style={[styles.avatar, { marginLeft: index === 0 ? 0 : -6 }]}
            />
          ))}
          {extraSaverCount > 0 && (
            <Text style={styles.extraSaverCount}>+{extraSaverCount}</Text>
          )}
        </View>

        <View style={styles.textWrapper}>
          <Text style={styles.savedText} numberOfLines={1}>
            {savedInfoText}
          </Text>
          <Text style={styles.ctaText} numberOfLines={1}>
            여정을 만들어 함께 방문해보세요!
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 30,
  },
  card: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: Colors.gray_100,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  avatarGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 100,
    borderWidth: 0.74,
    borderColor: "#FFFFFF",
    backgroundColor: "lightgray",
  },
  extraSaverCount: {
    ...TextStyles.Bold16,
    color: Colors.primary_500,
    marginLeft: 10,
  },
  textWrapper: {
    flex: 1,
    minWidth: 0,
  },
  savedText: {
    ...TextStyles.Regular12,
    color: Colors.gray_800,
  },
  ctaText: {
    ...TextStyles.SemiBold12,
    color: Colors.gray_800,
  },
});
