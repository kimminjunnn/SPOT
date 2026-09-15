import { router } from "expo-router";
import {
  StyleSheet,
  Pressable,
  Image,
  Text,
  useWindowDimensions,
} from "react-native";

import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";
import { CONTENT_MAX_WIDTH } from "@/src/styles/Layout";

export const MapSearchBar = () => {
  const { width: windowWidth } = useWindowDimensions();
  const searchWidth = Math.min(windowWidth - 34, CONTENT_MAX_WIDTH - 32);

  return (
    <Pressable
      style={[
        styles.searchInput,
        { width: searchWidth, left: (windowWidth - searchWidth) / 2 },
      ]}
      onPress={() => router.push("/searchPlace")}
    >
      <Image
        source={require("@/assets/images/search-input-icon-gray.png")}
        style={styles.searchIcon}
      />
      <Text style={[TextStyles.Medium16, { color: Colors.gray_300 }]}>
        지역, 상호명을 검색해보세요
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  searchInput: {
    position: "absolute",
    top: 60,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 13,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },

  searchIcon: {
    width: 24,
    height: 24,
    marginRight: 9,
  },
});
