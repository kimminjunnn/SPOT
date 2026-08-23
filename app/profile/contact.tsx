import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import ProfileLayout from "@/src/components/profile/Layout";
import ProfileHeader from "@/src/components/profile/Header";
import { createInquiry } from "@/src/lib/api/inquiry";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

const MAX_LENGTH = 500;

export default function ContactScreen() {
  const inputRef = useRef<TextInput>(null);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const trimmed = content.trim();
  const isSubmitDisabled = trimmed.length === 0 || isSubmitting;

  const dismissKeyboard = useCallback(() => {
    // 실기기에서는 Keyboard.dismiss()만으로 multiline TextInput의 포커스가
    // 남는 경우가 있어, 입력 포커스도 함께 명시적으로 해제한다.
    inputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  useEffect(() => dismissKeyboard, [dismissKeyboard]);

  const handleSubmit = async () => {
    if (isSubmitDisabled) return;

    dismissKeyboard();
    setIsSubmitting(true);

    try {
      await createInquiry({ category: "general", content: trimmed });
      setIsSubmitted(true);
    } catch (error: any) {
      console.warn("[Contact] Failed to create inquiry:", error);
      Alert.alert(
        "문의 접수 실패",
        error?.response?.data?.message ?? "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWriteNewInquiry = () => {
    dismissKeyboard();
    setContent("");
    setIsSubmitted(false);
  };

  const handleBack = () => {
    dismissKeyboard();
    router.back();
  };

  return (
    <ProfileLayout>
      {/* 헤더 */}
      <ProfileHeader title="문의하기" showBack={true} onBack={handleBack} />

      {isSubmitted ? (
        /* 접수 완료 */
        <View style={styles.doneContainer}>
          <Text style={styles.doneTitle}>문의 접수가 완료되었습니다!</Text>

          <Pressable
            style={styles.newInquiryButton}
            onPress={handleWriteNewInquiry}
            accessibilityRole="button"
          >
            <Text style={styles.newInquiryButtonText}>새 문의 작성</Text>
          </Pressable>
        </View>
      ) : (
        /* 문의 작성 */
        <KeyboardAwareScrollView
          style={styles.formContainer}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          enableOnAndroid
          extraScrollHeight={24}
        >
          <View style={styles.inputBox}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={content}
              onChangeText={setContent}
              placeholder="문의하실 내용을 작성해주세요"
              placeholderTextColor={Colors.gray_300}
              multiline
              maxLength={MAX_LENGTH}
              textAlignVertical="top"
              editable={!isSubmitting}
            />

            <Text style={styles.counter}>
              <Text style={styles.counterCurrent}>{content.length}</Text>
              {`/${MAX_LENGTH}`}
            </Text>
          </View>

          <View style={styles.spacer} />

          <Text style={styles.replyNotice}>
            2~3영업일 이내에 이메일로 답변드려요
          </Text>

          <Pressable
            style={styles.submitButton}
            onPress={() => void handleSubmit()}
            disabled={isSubmitDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitDisabled }}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>접수하기</Text>
            )}
          </Pressable>
        </KeyboardAwareScrollView>
      )}
    </ProfileLayout>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
  },
  inputBox: {
    height: 365,
    marginTop: 24,
    borderRadius: 12,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F5F5F5",
  },
  input: {
    ...TextStyles.Medium14,
    flex: 1,
    padding: 0,
    color: Colors.gray_800,
  },
  counter: {
    ...TextStyles.Medium12,
    marginTop: 8,
    textAlign: "right",
    color: Colors.gray_300,
  },
  counterCurrent: {
    color: Colors.gray_800,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  replyNotice: {
    ...TextStyles.Medium12,
    marginBottom: 16,
    textAlign: "center",
    color: Colors.gray_300,
  },
  submitButton: {
    height: 48,
    marginBottom: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray_800,
  },
  submitButtonText: {
    ...TextStyles.Bold16,
    color: Colors.white,
  },
  doneContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 56,
  },
  doneTitle: {
    ...TextStyles.Bold18,
    color: Colors.gray_800,
    textAlign: "center",
  },
  newInquiryButton: {
    height: 40,
    marginTop: 24,
    borderRadius: 10,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray_800,
  },
  newInquiryButtonText: {
    ...TextStyles.Bold14,
    color: Colors.white,
  },
});
