import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { CONTENT_MAX_WIDTH } from "@/src/styles/Layout";

export const TopBar = () => {
  return (
    <View style={styles.topBar}>
      <Image
        source={require("@/assets/images/SPOT.png")}
        style={styles.spotLogo}
      />

      <View style={styles.friendsIconContainer}>
        <TouchableOpacity onPress={() => router.push("/profile/friends")}>
          <Image
            source={require("@/assets/images/friends-icon-black.png")}
            style={styles.friendsIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/searchFriends")}>
          <Image
            source={require("@/assets/images/friends-add-icon-black.png")}
            style={styles.friendsIcon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  spotLogo: {
    width: 63,
    height: 29,
  },

  friendsIconContainer: {
    flexDirection: "row",
    gap: 16,
  },

  friendsIcon: {
    width: 24,
    height: 24,
  },
});
