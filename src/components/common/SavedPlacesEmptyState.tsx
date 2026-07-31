import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

export default function SavedPlacesEmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>저장된 장소가 없어요</Text>
      <Text style={styles.description}>
        첫 장소를 저장하고, 여정을 시작해 보세요!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 150,
  },
  title: {
    ...TextStyles.SemiBold16,
    color: Colors.gray_300,
    fontSize: 20,
  },
  description: {
    ...TextStyles.Regular12,
    color: Colors.gray_300,
  },
});
