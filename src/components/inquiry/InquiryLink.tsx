// src/components/inquiry/InquiryLink.tsx
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

type InquiryLinkProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** "문제가 있나요? 문의하기" — 문의 바텀시트 진입 링크 */
export default function InquiryLink({ onPress, style }: InquiryLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.container, style]}
      accessibilityRole="button"
      accessibilityLabel="문의하기"
    >
      <Text style={styles.text}>
        문제가 있나요? <Text style={styles.link}>문의하기</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  text: {
    ...TextStyles.Medium12,
    color: Colors.gray_300,
  },
  link: {
    textDecorationLine: "underline",
  },
});
