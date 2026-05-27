import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { useState } from "react";
import ProfileLayout from "@/src/components/profile/Layout";
import ProfileHeader from "@/src/components/profile/Header";
import { router } from "expo-router";
import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";

export default function SettingScreen() {
  const [openPolicy, setOpenPolicy] = useState(false);

  return (
    <ProfileLayout>
      {/* 헤더 */}
      <ProfileHeader title="설정" showBack={true} />

      {/* 컨테이너 */}
      <View style={styles.sectionContainer}>
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
              // onPress={() => router.push("/profile/terms")}
            >
              <Text style={styles.subText}>• 이용약관</Text>
              <Image
                style={styles.arrowRight}
                source={require("@/assets/images/arrow-right-gray.png")}
              />
            </Pressable>

            <Pressable
              style={styles.subRow}
              // onPress={() => router.push("/profile/privacy")}
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
          // onPress={() => router.push("/profile/contact")}
        >
          <Text style={styles.rowText}>문의</Text>
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
});
