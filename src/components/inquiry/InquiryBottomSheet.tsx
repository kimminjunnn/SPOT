// src/components/inquiry/InquiryBottomSheet.tsx
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createInquiry, type InquiryCategory } from "@/src/lib/api/inquiry";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

const MAX_LENGTH = 500;

export type InquiryBottomSheetRef = {
  open: () => void;
  close: () => void;
};

type InquiryBottomSheetProps = {
  category: InquiryCategory;
  /**
   * extract: 게시물 URL / detail: 장소 ID
   * general(설정)은 전달하지 않는다.
   */
  refUrl?: string;
  /** 좌측 ‹ 버튼 — 없으면 시트만 닫는다. */
  onBack?: () => void;
  /** 우측 X 버튼 — 없으면 시트만 닫는다. */
  onClose?: () => void;
};

const InquiryBottomSheet = forwardRef<
  InquiryBottomSheetRef,
  InquiryBottomSheetProps
>(({ category, refUrl, onBack, onClose }, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState("");
  const [inputInstanceKey, setInputInstanceKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const trimmed = content.trim();
  const isSubmitDisabled = trimmed.length === 0 || isSubmitting;

  const resetForm = useCallback(() => {
    setContent("");
    // BottomSheetTextInput을 제어 컴포넌트로 두면 iOS 한글 조합 중
    // value 재주입 때문에 자모가 분리될 수 있다. 새 문의를 열 때만
    // 입력기를 다시 마운트해 네이티브 입력값도 함께 초기화한다.
    setInputInstanceKey((current) => current + 1);
    setIsSubmitting(false);
    setIsSubmitted(false);
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.present(),
    close: () => sheetRef.current?.dismiss(),
  }));

  const handleSubmit = async () => {
    if (isSubmitDisabled) return;

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      await createInquiry({
        category,
        content: trimmed,
        ...(refUrl ? { ref_url: refUrl } : {}),
      });
      setIsSubmitted(true);
    } catch (error: any) {
      console.warn("[Inquiry] Failed to create inquiry:", error);
      Alert.alert(
        "문의 접수 실패",
        error?.response?.data?.message ?? "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    sheetRef.current?.dismiss();
    onBack?.();
  };

  const handleClose = () => {
    sheetRef.current?.dismiss();
    onClose?.();
  };

  const renderBackdrop = useCallback(
    (backdropProps: any) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: Colors.white }}
      handleIndicatorStyle={{ backgroundColor: Colors.gray_300 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onDismiss={resetForm}
    >
      <BottomSheetView
        style={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="문의하기 닫기"
          >
            <Image
              source={require("@/assets/images/x-gray.png")}
              style={styles.closeIcon}
            />
          </Pressable>

          <View style={styles.titleRow}>
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="뒤로가기"
            >
              <Image
                source={require("@/assets/images/arrow-left-gray.png")}
                style={styles.backIcon}
              />
            </Pressable>

            <View style={styles.titleCenter}>
              <Text style={styles.title}>문의하기</Text>
              <Text style={styles.subTitle}>
                2~3영업일 이내에 이메일로 답변드려요
              </Text>
            </View>

            <View style={styles.backButton} />
          </View>
        </View>

        {isSubmitted ? (
          /* 접수 완료 */
          <View style={styles.doneContainer}>
            <Text style={styles.doneTitle}>문의 접수가 완료되었습니다!</Text>

            <Pressable
              style={styles.newInquiryButton}
              onPress={resetForm}
              accessibilityRole="button"
            >
              <Text style={styles.newInquiryButtonText}>새 문의 작성</Text>
            </Pressable>
          </View>
        ) : (
          /* 문의 작성 */
          <>
            <View style={styles.inputBox}>
              <BottomSheetTextInput
                key={inputInstanceKey}
                style={styles.input}
                defaultValue=""
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
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

InquiryBottomSheet.displayName = "InquiryBottomSheet";
export default InquiryBottomSheet;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray_100,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  closeIcon: {
    width: 16,
    height: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  titleCenter: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    ...TextStyles.Bold16,
    textAlign: "center",
    color: Colors.gray_600,
  },
  subTitle: {
    ...TextStyles.Regular12,
    marginTop: 4,
    textAlign: "center",
    color: Colors.gray_400,
  },
  inputBox: {
    height: 200,
    marginTop: 16,
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
  submitButton: {
    height: 48,
    marginTop: 16,
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
    height: 264,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 24,
  },
  doneTitle: {
    ...TextStyles.Bold16,
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
