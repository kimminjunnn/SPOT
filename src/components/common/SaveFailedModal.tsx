import React from "react";
import { Modal, View, Text, StyleSheet, Image, Pressable } from "react-native";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

interface SaveFailedModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SaveeFaildModal({
  visible,
  onClose,
}: SaveFailedModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Image
            source={require("@/assets/images/save-fail.png")} // * 아이콘 파일명 맞춰서 넣기
            style={styles.icon}
          />
          <Text style={[TextStyles.Medium24, styles.title]}>
            저장에 실패했어요
          </Text>
          <Text style={[TextStyles.Medium14, styles.subtitle]}>
            주소가 없거나 인식이 어려운 게시물은{"\n"}저장이 불가능해요
          </Text>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={[TextStyles.Bold16, styles.backButtonText]}>
              뒤로가기
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 305,
    minHeight: 315,
    backgroundColor: "white",
    borderRadius: 20,
    paddingTop: 41,
    paddingBottom: 28,
    paddingHorizontal: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  icon: {
    width: 73,
    height: 75,
    marginBottom: 26,
  },
  title: {
    color: Colors.gray_900,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.gray_600,
    textAlign: "center",
    marginBottom: 26,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: Colors.primary_500,
    borderRadius: 8,
    paddingVertical: 11.5,
    width: "100%",
  },
  backButtonText: {
    color: "white",
    textAlign: "center",
  },
});
