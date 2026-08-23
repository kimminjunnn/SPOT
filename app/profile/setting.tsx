import {
  Alert,
  AppState,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import ProfileLayout from "@/src/components/profile/Layout";
import ProfileHeader from "@/src/components/profile/Header";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationsEnabled,
} from "@/src/hooks/useRegisterPushToken";

type AppStoreLookupResponse = {
  results?: {
    trackViewUrl?: string;
    version?: string;
  }[];
};

const CURRENT_VERSION =
  Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "-";

const TERMS_URL =
  "https://confusion-toy-a06.notion.site/3b6cb581691b80328caac65e49336103";
const PRIVACY_POLICY_URL =
  "https://confusion-toy-a06.notion.site/3b6cb581691b80c8b499e6e5d279fdea";

async function openPolicyPage(url: string) {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.warn("[Settings] Failed to open policy page:", error);
    Alert.alert("페이지를 열 수 없어요", "잠시 후 다시 시도해 주세요.");
  }
}

function compareVersions(left: string, right: string) {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }

  return 0;
}

export default function SettingScreen() {
  const [openPolicy, setOpenPolicy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushModalVisible, setPushModalVisible] = useState(false);
  const [isChangingPushSetting, setIsChangingPushSetting] = useState(false);
  const [updateUrl, setUpdateUrl] = useState<string | null>(null);

  const refreshPushSetting = useCallback(async () => {
    try {
      setPushEnabled(await getPushNotificationsEnabled());
    } catch (error) {
      console.warn("[Settings] Failed to read push notification status:", error);
      setPushEnabled(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPushSetting();

      const subscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") void refreshPushSetting();
      });

      return () => subscription.remove();
    }, [refreshPushSetting]),
  );

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const bundleIdentifier = Constants.expoConfig?.ios?.bundleIdentifier;
    if (!bundleIdentifier) return;

    const controller = new AbortController();
    const lookupUrl = `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleIdentifier)}&country=kr`;

    void fetch(lookupUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<AppStoreLookupResponse>;
      })
      .then((data) => {
        const app = data.results?.[0];
        if (
          app?.version &&
          app.trackViewUrl &&
          compareVersions(app.version, CURRENT_VERSION) > 0
        ) {
          setUpdateUrl(app.trackViewUrl);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        console.warn("[Settings] Failed to check App Store version:", error);
      });

    return () => controller.abort();
  }, []);

  const handlePushValueChange = (nextValue: boolean) => {
    if (isChangingPushSetting) return;

    if (nextValue) {
      setPushModalVisible(true);
      return;
    }

    setPushEnabled(false);
    setIsChangingPushSetting(true);
    void disablePushNotifications()
      .catch((error) => {
        console.warn("[Settings] Failed to disable push notifications:", error);
        Alert.alert("알림 설정 실패", "잠시 후 다시 시도해 주세요.");
      })
      .finally(() => setIsChangingPushSetting(false));
  };

  const handleEnablePushNotifications = async () => {
    if (isChangingPushSetting) return;

    setPushModalVisible(false);
    setIsChangingPushSetting(true);

    try {
      const result = await enablePushNotifications();
      await refreshPushSetting();

      if (result === "denied") {
        Alert.alert(
          "푸시 알림 권한이 필요해요",
          "iPhone 설정에서 SPOT의 알림을 허용해 주세요.",
          [
            { text: "취소", style: "cancel" },
            {
              text: "설정으로 이동",
              onPress: () => void Linking.openSettings(),
            },
          ],
        );
      } else if (result === "failed") {
        Alert.alert(
          "알림 설정 지연",
          "권한은 허용됐지만 서버 연결에 실패했어요. 잠시 후 다시 시도할게요.",
        );
      } else if (result === "unavailable") {
        Alert.alert(
          "알림 설정을 사용할 수 없어요",
          "현재 기기에서는 푸시 알림을 설정할 수 없습니다.",
        );
      }
    } catch (error) {
      console.warn("[Settings] Failed to enable push notifications:", error);
      Alert.alert("알림 설정 실패", "잠시 후 다시 시도해 주세요.");
    } finally {
      setIsChangingPushSetting(false);
    }
  };

  return (
    <ProfileLayout>
      <Modal
        transparent
        visible={pushModalVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPushModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPushModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setPushModalVisible(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="푸시 알림 설정 닫기"
            >
              <Image
                source={require("@/assets/images/x-gray.png")}
                style={styles.modalCloseIcon}
              />
            </Pressable>

            <Text style={styles.modalTitle}>푸시 알림 설정</Text>

            <View style={styles.pushDescriptionBox}>
              <Image
                source={require("@/assets/images/bell-plain.png")}
                style={styles.bellIcon}
              />
              <Text style={styles.pushDescription}>
                스팟의 다양한 정보 알림(시스템 공지, 핫한 소식 등)을 푸시
                알림으로 받아요.
              </Text>
            </View>

            <Text style={styles.pushHint}>
              • 알림 설정은 프로필&gt;설정&gt;앱 푸시 알림에서 변경 가능합니다.
            </Text>

            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPushModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => void handleEnablePushNotifications()}
                accessibilityRole="button"
              >
                <Text style={styles.confirmButtonText}>확인</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 헤더 */}
      <ProfileHeader title="설정" showBack={true} />

      {/* 컨테이너 */}
      <View style={styles.sectionContainer}>
        {/* 앱 푸시 알림 */}
        <View style={styles.row}>
          <Text style={styles.rowText}>앱 푸시 알림</Text>
          <Switch
            value={pushEnabled}
            onValueChange={handlePushValueChange}
            disabled={isChangingPushSetting}
            trackColor={{
              false: Colors.gray_100,
              true: Colors.primary_500,
            }}
            thumbColor={Colors.white}
            ios_backgroundColor={Colors.gray_100}
            accessibilityLabel="앱 푸시 알림"
          />
        </View>

        {/* 계정 설정 */}
        <Pressable
          style={styles.row}
          onPress={() => router.push("/profile/accountSetting")}
        >
          <Text style={styles.rowText}>계정 설정</Text>
          <Image
            style={styles.arrowRight}
            source={require("@/assets/images/arrow-right-gray.png")}
          />
        </Pressable>

        {/* 차단 목록 */}
        <Pressable
          style={styles.row}
          onPress={() => router.push("/profile/blocked")}
        >
          <Text style={styles.rowText}>차단 목록</Text>

          <Image
            style={styles.arrowRight}
            source={require("@/assets/images/arrow-right-gray.png")}
          />
        </Pressable>

        {/* 이용약관 & 개인정보 정책 */}
        <Pressable
          style={styles.row}
          onPress={() => setOpenPolicy(!openPolicy)}
        >
          <Text style={[styles.rowText, openPolicy && styles.rowTextBold]}>
            이용약관 및 개인정보 정책
          </Text>

          {/* 펄침/접힘 이미지 */}
          {openPolicy ? (
            <Image
              style={styles.arrowRight}
              source={require("@/assets/images/arrow-up-black.png")}
            />
          ) : (
            <Image
              style={styles.arrowRight}
              source={require("@/assets/images/arrow-right-gray.png")}
            />
          )}
        </Pressable>

        {/* 펼쳐진 내용 */}
        {openPolicy && (
          <View style={styles.subContainer}>
            <Pressable
              style={styles.subRow}
              onPress={() => void openPolicyPage(TERMS_URL)}
              accessibilityRole="link"
            >
              <Text style={styles.subText}>• 이용약관</Text>
              <Image
                style={styles.arrowRight}
                source={require("@/assets/images/arrow-right-gray.png")}
              />
            </Pressable>

            <Pressable
              style={styles.subRow}
              onPress={() => void openPolicyPage(PRIVACY_POLICY_URL)}
              accessibilityRole="link"
            >
              <Text style={styles.subText}>• 개인정보 정책</Text>
              <Image
                style={styles.arrowRight}
                source={require("@/assets/images/arrow-right-gray.png")}
              />
            </Pressable>
          </View>
        )}

        {/* 문의 */}
        <Pressable
          style={styles.row}
          onPress={() => router.push("/profile/contact")}
        >
          <Text style={styles.rowText}>문의</Text>
          <Image
            style={styles.arrowRight}
            source={require("@/assets/images/arrow-right-gray.png")}
          />
        </Pressable>

        {/* 현재 버전 */}
        <View style={[styles.row, styles.versionRow]}>
          <Text style={styles.rowText}>현재 버전 {CURRENT_VERSION}</Text>
          <Pressable
            style={[
              styles.updateButton,
              !updateUrl && styles.updateButtonDisabled,
            ]}
            disabled={!updateUrl}
            onPress={() => {
              if (updateUrl) void Linking.openURL(updateUrl);
            }}
            accessibilityRole="button"
            accessibilityState={{ disabled: !updateUrl }}
          >
            <Text
              style={[
                styles.updateButtonText,
                !updateUrl && styles.updateButtonTextDisabled,
              ]}
            >
              업데이트
            </Text>
          </Pressable>
        </View>
      </View>
    </ProfileLayout>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 12,
    marginHorizontal: -16,
  },

  row: {
    minHeight: 64,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: Colors.gray_100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowText: {
    ...TextStyles.Medium16,
    color: Colors.gray_800,
  },

  rowTextBold: {
    ...TextStyles.Bold16,
    color: Colors.gray_800,
  },
  arrowRight: { width: 12, height: 24 },
  subContainer: {
    backgroundColor: "#E6E6E666",
    paddingLeft: 24,
    paddingRight: 16,
  },

  subRow: {
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 10,
  },

  subText: {
    ...TextStyles.Medium16,
    color: Colors.gray_800,
  },
  versionRow: {
    borderBottomWidth: 0,
  },
  updateButton: {
    minWidth: 86,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray_800,
  },
  updateButtonDisabled: {
    backgroundColor: Colors.gray_100,
  },
  updateButtonText: {
    ...TextStyles.SemiBold14,
    color: Colors.white,
  },
  updateButtonTextDisabled: {
    color: Colors.white,
  },
  modalBackdrop: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 344,
    borderRadius: 26,
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 22,
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  modalCloseButton: {
    position: "absolute",
    top: 18,
    right: 18,
  },
  modalCloseIcon: {
    width: 24,
    height: 24,
  },
  modalTitle: {
    ...TextStyles.SemiBold20,
    fontFamily: "PretendardBold",
    color: Colors.gray_800,
    textAlign: "center",
  },
  pushDescriptionBox: {
    minHeight: 74,
    marginTop: 24,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  bellIcon: {
    width: 28,
    height: 28,
    marginRight: 14,
    tintColor: Colors.gray_300,
  },
  pushDescription: {
    ...TextStyles.Medium14,
    flex: 1,
    color: Colors.gray_800,
  },
  pushHint: {
    ...TextStyles.Medium12,
    minHeight: 48,
    marginTop: 16,
    paddingHorizontal: 10,
    color: Colors.gray_300,
  },
  modalButtonRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 8,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: Colors.gray_100,
  },
  confirmButton: {
    backgroundColor: Colors.gray_800,
  },
  cancelButtonText: {
    ...TextStyles.Bold16,
    color: Colors.gray_800,
  },
  confirmButtonText: {
    ...TextStyles.Bold16,
    color: Colors.white,
  },
});
