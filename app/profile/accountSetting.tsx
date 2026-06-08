import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { useState } from "react";
import ProfileLayout from "@/src/components/profile/Layout";
import ProfileHeader from "@/src/components/profile/Header";
import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";
import ConfirmModal from "@/src/components/common/ConfirmModal";
import { logout } from "@/src/lib/api/settings";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { deactivateLastRegisteredPushToken } from "@/src/hooks/useRegisterPushToken";

export default function AccountSettingScreen() {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);

  return (
    <ProfileLayout>
      {/* 로그아웃 모달 */}
      <ConfirmModal
        visible={logoutVisible}
        title="로그아웃 합니다"
        onCancel={() => setLogoutVisible(false)}
        onConfirm={() => {
          setLogoutVisible(false);
          void (async () => {
            await deactivateLastRegisteredPushToken();
            await logout();
            await clearAuth();
            router.replace("/login");
          })();
        }}
      />

      {/* 계정 탈퇴 모달 */}
      <ConfirmModal
        visible={withdrawVisible}
        title="계정을 탈퇴 합니다"
        description="탈퇴하면 계정 정보 복구가 불가능합니다"
        onCancel={() => setWithdrawVisible(false)}
        onConfirm={() => {
          setWithdrawVisible(false);
          // TODO: 계정 탈퇴 API
        }}
      />

      {/* 헤더 */}
      <ProfileHeader title="계정설정" showBack={true} />

      {/* 컨테이너 */}
      <View style={styles.sectionContainer}>
        {/* 계정 탈퇴 */}
        <Pressable style={styles.row} onPress={() => setWithdrawVisible(true)}>
          <Text style={styles.rowText}>계정 탈퇴</Text>
          <Image
            style={styles.arrowRight}
            source={require("@/assets/images/arrow-right-gray.png")}
          />
        </Pressable>

        {/* 로그아웃 */}
        <Pressable style={styles.row} onPress={() => setLogoutVisible(true)}>
          <Text style={styles.rowText}>로그아웃</Text>
          <Image
            style={styles.arrowRight}
            source={require("@/assets/images/arrow-right-gray.png")}
          />
        </Pressable>
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

  arrowRight: {
    width: 12,
    height: 24,
  },
});
