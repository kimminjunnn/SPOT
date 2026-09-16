import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import Feather from "@expo/vector-icons/Feather";
import SpotButton from "@/src/components/common/SpotButton";
import { FORM_MAX_WIDTH } from "@/src/styles/Layout";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

export type TermsConsentBottomSheetRef = {
  open: () => void;
  close: () => void;
};

type TermsConsentBottomSheetProps = {
  termsUrl: string;
  privacyPolicyUrl: string;
  onConfirm: () => void;
  onDismiss?: () => void;
};

const arrowRightIcon = require("@/assets/images/terms-arrow-right.png");

function TermsCheckbox({ checked }: { checked: boolean }) {
  return (
    <View
      style={[
        styles.checkboxIcon,
        checked ? styles.checkboxChecked : styles.checkboxUnchecked,
      ]}
    >
      <Feather name="check" size={14} color={Colors.white} />
    </View>
  );
}

const TermsConsentBottomSheet = forwardRef<
  TermsConsentBottomSheetRef,
  TermsConsentBottomSheetProps
>(({ termsUrl, privacyPolicyUrl, onConfirm, onDismiss }, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const shouldConfirmRef = useRef(false);
  const { width: windowWidth } = useWindowDimensions();
  const sheetWidth = Math.min(windowWidth, FORM_MAX_WIDTH);
  const sheetScale = sheetWidth / 375;
  const sheetHeight = 347 * sheetScale;
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const allAgreed = termsAgreed && privacyAgreed;

  const reset = useCallback(() => {
    setTermsAgreed(false);
    setPrivacyAgreed(false);
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => {
      shouldConfirmRef.current = false;
      reset();
      sheetRef.current?.present();
    },
    close: () => sheetRef.current?.dismiss(),
  }));

  const handleToggleAll = () => {
    const next = !allAgreed;
    setTermsAgreed(next);
    setPrivacyAgreed(next);
  };

  const handleConfirm = () => {
    if (!allAgreed) return;

    shouldConfirmRef.current = true;
    sheetRef.current?.dismiss();
  };

  const handleDismiss = () => {
    const shouldConfirm = shouldConfirmRef.current;
    shouldConfirmRef.current = false;
    reset();

    if (shouldConfirm) {
      onConfirm();
      return;
    }

    onDismiss?.();
  };

  const renderBackdrop = useCallback(
    (backdropProps: any) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.43}
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
      backgroundStyle={[
        styles.sheetBackground,
        {
          borderTopLeftRadius: 30 * sheetScale,
          borderTopRightRadius: 30 * sheetScale,
        },
      ]}
      handleComponent={() => null}
      onDismiss={handleDismiss}
    >
      <BottomSheetView
        style={[styles.sheetViewport, { width: sheetWidth, height: sheetHeight }]}
      >
        <View
          style={[
            styles.container,
            { transform: [{ scale: sheetScale }] },
          ]}
        >
          <Text style={styles.title}>
            이용약관에 동의하시면{"\n"}SPOT을 시작할 수 있어요
          </Text>

          <View style={styles.allAgreementWrapper}>
            <Pressable
              style={styles.allAgreementButton}
              onPress={handleToggleAll}
              accessibilityRole="checkbox"
              accessibilityLabel="약관 전체 동의하기"
              accessibilityState={{ checked: allAgreed }}
            >
              <TermsCheckbox checked={allAgreed} />
              <Text style={styles.allAgreementText}>약관 전체 동의하기</Text>
            </Pressable>
          </View>

          <View style={styles.agreementList}>
            <View style={styles.agreementRow}>
              <Pressable
                style={styles.agreementCheckButton}
                onPress={() => setTermsAgreed((current) => !current)}
                accessibilityRole="checkbox"
                accessibilityLabel="SPOT 이용약관 동의 필수"
                accessibilityState={{ checked: termsAgreed }}
              >
                <TermsCheckbox checked={termsAgreed} />
                <Text style={styles.agreementText}>
                  SPOT 이용약관 동의(필수)
                </Text>
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={() => void Linking.openURL(termsUrl)}
                accessibilityRole="link"
                accessibilityLabel="SPOT 이용약관 보기"
              >
                <Image source={arrowRightIcon} style={styles.arrowIcon} />
              </Pressable>
            </View>

            <View style={styles.agreementRow}>
              <Pressable
                style={styles.agreementCheckButton}
                onPress={() => setPrivacyAgreed((current) => !current)}
                accessibilityRole="checkbox"
                accessibilityLabel="SPOT 개인정보 수집 이용 동의 필수"
                accessibilityState={{ checked: privacyAgreed }}
              >
                <TermsCheckbox checked={privacyAgreed} />
                <Text style={styles.agreementText}>
                  SPOT 개인정보 수집 이용 동의(필수)
                </Text>
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={() => void Linking.openURL(privacyPolicyUrl)}
                accessibilityRole="link"
                accessibilityLabel="SPOT 개인정보 수집 이용 동의 보기"
              >
                <Image source={arrowRightIcon} style={styles.arrowIcon} />
              </Pressable>
            </View>
          </View>

          <View style={styles.confirmWrapper}>
            <SpotButton
              label="확인"
              size="large"
              fullWidth
              disabled={!allAgreed}
              onPress={handleConfirm}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

TermsConsentBottomSheet.displayName = "TermsConsentBottomSheet";

export default TermsConsentBottomSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.white,
  },
  sheetViewport: {
    alignSelf: "center",
    overflow: "hidden",
  },
  container: {
    position: "relative",
    width: 375,
    height: 347,
    paddingTop: 33,
    paddingBottom: 37,
    transformOrigin: "top left",
  },
  title: {
    ...TextStyles.Bold18,
    color: Colors.gray_800,
    textAlign: "center",
  },
  allAgreementWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
  },
  allAgreementButton: {
    minHeight: 53,
    borderRadius: 14,
    backgroundColor: "rgba(230, 230, 230, 0.5)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  checkboxIcon: {
    width: 20,
    height: 20,
    flexShrink: 0,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary_500,
  },
  checkboxUnchecked: {
    backgroundColor: Colors.gray_200,
  },
  allAgreementText: {
    ...TextStyles.Bold14,
    color: Colors.gray_600,
    marginLeft: 11,
  },
  agreementList: {
    gap: 14,
    paddingLeft: 41,
    paddingRight: 26,
    marginTop: 10,
  },
  agreementRow: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agreementCheckButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  agreementText: {
    ...TextStyles.SemiBold14,
    lineHeight: 14 * 1.3,
    color: Colors.gray_600,
    marginLeft: 11,
  },
  arrowIcon: {
    width: 24,
    height: 24,
  },
  confirmWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
    backgroundColor: "transparent",
  },
  confirmButton: {
    height: 53,
    borderRadius: 10,
  },
});
