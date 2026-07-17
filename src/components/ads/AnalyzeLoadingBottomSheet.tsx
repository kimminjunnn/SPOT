import { useEffect, useState } from "react";
import { Image, Modal, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/src/styles/Colors";

const loadingFrames = [
  require("../../../ios/SpotShare/share-loading-1.png"),
  require("../../../ios/SpotShare/share-loading-2.png"),
  require("../../../ios/SpotShare/share-loading-3.png"),
  require("../../../ios/SpotShare/share-loading-2.png"),
] as const;

type AnalyzeLoadingBottomSheetProps = {
  visible: boolean;
};

export default function AnalyzeLoadingBottomSheet({
  visible,
}: AnalyzeLoadingBottomSheetProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!visible) {
      setFrame(0);
      return;
    }

    const timer = setInterval(() => {
      setFrame((current) => (current + 1) % loadingFrames.length);
    }, 225);

    return () => clearInterval(timer);
  }, [visible]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Image source={loadingFrames[frame]} style={styles.spinner} />
          <Text style={styles.title}>저장 중...</Text>
          <Text style={styles.subtitle}>게시물 속 장소를 저장 중이에요</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    minHeight: "61.5%",
    alignItems: "center",
    paddingTop: 106,
    paddingHorizontal: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.white,
  },
  spinner: {
    width: 72,
    height: 72,
    resizeMode: "contain",
  },
  title: {
    marginTop: 22,
    color: "#212121",
    fontFamily: "PretendardSemiBold",
    fontSize: 22,
    lineHeight: 29,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    color: "#474747",
    fontFamily: "PretendardRegular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
