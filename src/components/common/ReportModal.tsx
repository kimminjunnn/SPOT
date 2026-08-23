import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

export const REPORT_REASONS = [
  { label: "스팸", value: "spam" },
  { label: "괴롭힘", value: "harassment" },
  { label: "혐오·차별", value: "hate_discrimination" },
  { label: "사칭", value: "impersonation" },
  { label: "허위 활동", value: "fake_activity" },
  { label: "개인정보 침해", value: "privacy_violation" },
  { label: "서비스 악용", value: "service_abuse" },
  { label: "기타", value: "etc" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

type ReportModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, label: string) => Promise<void>;
};

export default function ReportModal({
  visible,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason>("spam");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedReason("spam");
      setIsSubmitting(false);
    }
  }, [visible]);

  const selectedLabel =
    REPORT_REASONS.find((reason) => reason.value === selectedReason)?.label ??
    "스팸";

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(selectedReason, selectedLabel);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="신고 모달 닫기"
          >
            <Image
              source={require("@/assets/images/x-gray.png")}
              style={styles.closeIcon}
            />
          </Pressable>

          <Text style={styles.title}>신고사유</Text>

          <View style={styles.reasonGrid}>
            {REPORT_REASONS.map((reason) => {
              const isSelected = reason.value === selectedReason;

              return (
                <Pressable
                  key={reason.value}
                  style={styles.reasonOption}
                  onPress={() => setSelectedReason(reason.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={[styles.radio, isSelected && styles.radioSelected]}
                  >
                    {isSelected ? <View style={styles.radioCheck} /> : null}
                  </View>
                  <Text style={styles.reasonLabel}>{reason.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.submitButton]}
              onPress={() => void handleSubmit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>신고하기</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 30,
    paddingTop: 38,
    paddingHorizontal: 29,
    paddingBottom: 24,
    backgroundColor: Colors.white,
  },
  closeButton: {
    position: "absolute",
    top: 24,
    right: 22,
    padding: 2,
  },
  closeIcon: { width: 18, height: 18 },
  title: {
    ...TextStyles.SemiBold20,
    color: Colors.gray_800,
    textAlign: "center",
    marginBottom: 24,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
    marginBottom: 40,
  },
  reasonOption: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 34,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray_100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioSelected: {
    borderColor: Colors.primary_500,
    backgroundColor: Colors.primary_500,
  },
  radioCheck: {
    width: 11,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.white,
    transform: [{ rotate: "-45deg" }, { translateY: -1 }],
  },
  reasonLabel: {
    ...TextStyles.Medium16,
    color: Colors.gray_800,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: { backgroundColor: Colors.gray_100 },
  submitButton: { backgroundColor: Colors.gray_700 },
  cancelButtonText: {
    ...TextStyles.Bold16,
    color: Colors.gray_800,
  },
  submitButtonText: {
    ...TextStyles.Bold16,
    color: Colors.white,
  },
});
