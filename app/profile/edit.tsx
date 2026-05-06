import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  Alert,
} from "react-native";

import ProfileLayout from "@/src/components/profile/Layout";
import ProfileHeader from "@/src/components/profile/Header";
import SpotButton from "@/src/components/common/SpotButton";
import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";

import { updateMyProfile, checkSpotId } from "@/src/lib/api/profile";
import { useMyProfileStore } from "@/src/stores/useMyProfileStore";

const NICKNAME_MAX = 15;
const ID_MAX = 15;
const INTRO_MAX = 30;

const VALID_COLOR = "#2EBD5C";
const ERROR_COLOR = "#FF5A3C";

export default function EditScreen() {
  const profile = useMyProfileStore((s) => s.profile);
  const fetchMyProfile = useMyProfileStore((s) => s.fetchMyProfile);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nickname, setNickname] = useState("");
  const [userId, setUserId] = useState("");
  const [intro, setIntro] = useState("");

  const [focusNickname, setFocusNickname] = useState(false);
  const [focusUserId, setFocusUserId] = useState(false);
  const [focusIntro, setFocusIntro] = useState(false);

  const [idCheckStatus, setIdCheckStatus] = useState<
    "idle" | "checking" | "available" | "duplicated" | "error"
  >("idle");
  const [lastCheckedId, setLastCheckedId] = useState("");
  useEffect(() => {
    if (!profile) return;

    setNickname(profile.spotNickname ?? "");
    setUserId(profile.spotId ?? "");
    setIntro(profile.oneLine ?? "");
    setAvatarUri(profile.photo ?? null);

    setAvatarChanged(false);
    setAvatarRemoved(false);
  }, [profile]);

  useEffect(() => {
    if (profile) return;
    fetchMyProfile();
  }, [profile, fetchMyProfile]);

  const openPhotoMenu = () => setPhotoMenuVisible(true);
  const closePhotoMenu = () => setPhotoMenuVisible(false);

  const handlePickFromGallery = async () => {
    try {
      closePhotoMenu();

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("갤러리 접근 권한을 허용해 주세요.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setAvatarUri(result.assets[0].uri);
        setAvatarChanged(true);
        setAvatarRemoved(false);
      }
    } catch {
      Alert.alert("사진을 불러오는 중 오류가 발생했어요.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      closePhotoMenu();

      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("카메라 접근 권한을 허용해 주세요.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setAvatarUri(result.assets[0].uri);
        setAvatarChanged(true);
        setAvatarRemoved(false);
      }
    } catch {
      Alert.alert("사진 촬영 중 문제가 발생했어요.");
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUri(null);
    setAvatarChanged(false);
    setAvatarRemoved(true);
    closePhotoMenu();
  };

  const nicknameLen = nickname.length;
  const nicknameStatus =
    nicknameLen === 0
      ? "empty"
      : nicknameLen <= NICKNAME_MAX
        ? "valid"
        : "tooLong";

  const nicknameIsError = nicknameStatus === "tooLong";

  const nicknameHelperColor =
    nicknameStatus === "valid"
      ? VALID_COLOR
      : nicknameStatus === "tooLong"
        ? ERROR_COLOR
        : Colors.gray_400;

  const nicknameHelperText =
    nicknameStatus === "tooLong"
      ? "15자를 초과했어요"
      : "15자 이내로 입력해 주세요";

  const idLen = userId.length;

  let idStatus:
    | "empty"
    | "valid"
    | "tooShort"
    | "tooLong"
    | "invalidChar"
    | "invalidCombo" = "empty";

  const onlyEngOrNum = /^[a-zA-Z0-9]*$/.test(userId);
  const hasLetter = /[a-zA-Z]/.test(userId);
  const hasNumber = /[0-9]/.test(userId);

  if (idLen === 0) {
    idStatus = "empty";
  } else if (!onlyEngOrNum) {
    idStatus = "invalidChar";
  } else if (idLen > ID_MAX) {
    idStatus = "tooLong";
  } else if (idLen < 4) {
    idStatus = "tooShort";
  } else if (!hasLetter || !hasNumber) {
    idStatus = "invalidCombo";
  } else {
    idStatus = "valid";
  }

  const idIsError =
    idStatus === "invalidChar" ||
    idStatus === "tooLong" ||
    idStatus === "tooShort" ||
    idStatus === "invalidCombo";

  const idHelperColor =
    idStatus === "valid"
      ? idCheckStatus === "available" || profile?.spotId === userId.trim()
        ? VALID_COLOR
        : idCheckStatus === "duplicated" || idCheckStatus === "error"
          ? ERROR_COLOR
          : Colors.gray_400
      : ERROR_COLOR;

  const idHelperText =
    idStatus === "invalidChar"
      ? "특수문자 사용은 불가능해요"
      : idStatus === "tooLong"
        ? "15자를 초과했어요"
        : idStatus === "tooShort"
          ? "4자 이상 입력해 주세요"
          : idStatus === "invalidCombo"
            ? "영문과 숫자를 모두 포함해야 해요"
            : profile?.spotId === userId.trim()
              ? "현재 사용 중인 아이디예요"
              : idCheckStatus === "checking"
                ? "아이디 중복 여부를 확인하고 있어요"
                : idCheckStatus === "available"
                  ? "사용 가능한 ID입니다."
                  : idCheckStatus === "duplicated"
                    ? "이미 사용 중인 ID입니다."
                    : idCheckStatus === "error"
                      ? "중복확인에 실패했어요"
                      : "중복확인을 진행해 주세요";

  const introLen = intro.length;
  const introStatus =
    introLen === 0 ? "empty" : introLen <= INTRO_MAX ? "valid" : "tooLong";

  const introIsError = introStatus === "tooLong";

  const introHelperColor =
    introStatus === "valid"
      ? VALID_COLOR
      : introStatus === "tooLong"
        ? ERROR_COLOR
        : Colors.gray_400;

  const introHelperText =
    introStatus === "tooLong"
      ? "30자를 초과했어요"
      : "30자 이내로 입력해 주세요";

  const isFormValid =
    nicknameStatus === "valid" &&
    idStatus === "valid" &&
    introStatus !== "tooLong";

  const handleSubmit = async () => {
    if (!isFormValid || saving) return;

    const spotNickname = nickname.trim();
    const spotId = userId.trim();
    const oneLine = intro.trim();

    const shouldUploadFile =
      avatarChanged &&
      !!avatarUri &&
      (avatarUri.startsWith("file:") || avatarUri.startsWith("content:"));

    setSaving(true);

    try {
      const result = await updateMyProfile({
        spotId,
        spotNickname,
        oneLine: oneLine.length ? oneLine : null,
        file: shouldUploadFile
          ? {
              uri: avatarUri,
              name: `profile-${Date.now()}.jpg`,
              type: "image/jpeg",
            }
          : null,
      });

      if (!result) {
        Alert.alert("실패", "프로필 업데이트에 실패했습니다");
        return;
      }

      await fetchMyProfile();

      if (avatarRemoved) {
        Alert.alert("완료", "업데이트에 성공했습니다.", [
          { text: "확인", onPress: () => router.back() },
        ]);
        return;
      }

      Alert.alert("완료", "업데이트에 성공했습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("실패", "프로필 업데이트에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckDuplicate = async () => {
    const trimmedId = userId.trim();

    if (idStatus !== "valid") {
      Alert.alert("안내", "아이디 형식을 먼저 맞춰주세요.");
      return;
    }

    if (profile?.spotId === trimmedId) {
      setIdCheckStatus("available");
      setLastCheckedId(trimmedId);
      Alert.alert("안내", "현재 사용 중인 아이디입니다.");
      return;
    }

    try {
      setIdCheckStatus("checking");

      const result = await checkSpotId(trimmedId);

      if (!result) {
        setIdCheckStatus("error");
        Alert.alert("실패", "중복확인에 실패했어요.");
        return;
      }

      setLastCheckedId(trimmedId);

      if (result.can_use_id) {
        setIdCheckStatus("available");
        Alert.alert("완료", result.message || "사용 가능한 ID입니다.");
        return;
      }

      setIdCheckStatus("duplicated");
      Alert.alert("안내", result.message || "이미 사용 중인 ID입니다.");
    } catch {
      setIdCheckStatus("error");
      Alert.alert("실패", "중복확인에 실패했어요.");
    }
  };

  return (
    <ProfileLayout>
      <ProfileHeader title="프로필 수정" showBack={true} />

      <View style={styles.content}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={openPhotoMenu}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarCircle}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Image
                      style={{ width: 60, height: 60 }}
                      source={require("@/assets/images/default-profile.png")}
                    />
                  )}
                </View>

                <Pressable style={styles.cameraButton} onPress={openPhotoMenu}>
                  <Image
                    style={{ width: 24, height: 24 }}
                    source={require("@/assets/images/camera-icon.png")}
                  />
                </Pressable>
              </View>
            </View>
          </Pressable>

          {photoMenuVisible && (
            <Pressable
              style={styles.cameraMenuOverlay}
              onPress={closePhotoMenu}
            >
              <View style={styles.cameraMenuContainer}>
                <Pressable
                  style={styles.cameraMenuItem}
                  onPress={handlePickFromGallery}
                >
                  <Text style={styles.cameraMenuText}>갤러리에서 선택</Text>
                </Pressable>

                <Pressable
                  style={styles.cameraMenuItem}
                  onPress={handleTakePhoto}
                >
                  <Text style={styles.cameraMenuText}>사진 찍기</Text>
                </Pressable>

                <Pressable
                  style={styles.cameraMenuItem}
                  onPress={handleRemovePhoto}
                >
                  <Text style={styles.cameraMenuText}>현재 사진 삭제</Text>
                </Pressable>
              </View>
            </Pressable>
          )}

          <View style={styles.sectionContainer}>
            <View
              style={[
                styles.fieldBlock,
                {
                  borderBottomColor: nicknameIsError
                    ? ERROR_COLOR
                    : focusNickname
                      ? Colors.gray_800
                      : Colors.gray_100,
                },
              ]}
            >
              <View style={styles.fieldHeader}>
                <Text style={styles.label}>닉네임</Text>
                <Text
                  style={[
                    styles.counter,
                    nicknameIsError && { color: ERROR_COLOR },
                  ]}
                >
                  {nicknameLen}/{NICKNAME_MAX}
                </Text>
              </View>

              <TextInput
                style={styles.input}
                value={nickname}
                onFocus={() => setFocusNickname(true)}
                onBlur={() => setFocusNickname(false)}
                onChangeText={setNickname}
                placeholder="닉네임을 입력해 주세요"
                placeholderTextColor={Colors.gray_400}
              />
            </View>

            <View style={styles.helperRow}>
              <Text style={[styles.helperIcon, { color: nicknameHelperColor }]}>
                {nicknameIsError ? "✗" : "✓"}
              </Text>
              <Text style={[styles.helperText, { color: nicknameHelperColor }]}>
                {nicknameHelperText}
              </Text>
            </View>

            <View
              style={[
                styles.fieldBlock,
                {
                  borderBottomColor: idIsError
                    ? ERROR_COLOR
                    : focusUserId
                      ? Colors.gray_800
                      : Colors.gray_100,
                },
              ]}
            >
              <View style={styles.fieldHeader}>
                <Text style={styles.label}>아이디</Text>
                <Text
                  style={[styles.counter, idIsError && { color: ERROR_COLOR }]}
                >
                  {idLen}/{ID_MAX}
                </Text>
              </View>

              <View style={styles.idRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={userId}
                  onFocus={() => setFocusUserId(true)}
                  onBlur={() => setFocusUserId(false)}
                  onChangeText={(value) => {
                    setUserId(value);
                    setIdCheckStatus("idle");
                    setLastCheckedId("");
                  }}
                  placeholder="아이디를 입력해 주세요"
                  placeholderTextColor={Colors.gray_400}
                  autoCapitalize="none"
                />

                <Pressable
                  style={styles.dupButton}
                  onPress={handleCheckDuplicate}
                  disabled={
                    idStatus !== "valid" || idCheckStatus === "checking"
                  }
                >
                  <Text style={styles.dupButtonText}>
                    {idCheckStatus === "checking" ? "확인 중..." : "중복확인"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.helperRow}>
              <Text style={[styles.helperIcon, { color: idHelperColor }]}>
                {idIsError ? "✗" : "✓"}
              </Text>
              <Text style={[styles.helperText, { color: idHelperColor }]}>
                {idHelperText}
              </Text>
            </View>

            <View
              style={[
                styles.fieldBlock,
                {
                  borderBottomColor: introIsError
                    ? ERROR_COLOR
                    : focusIntro
                      ? Colors.gray_800
                      : Colors.gray_100,
                },
              ]}
            >
              <View style={styles.fieldHeader}>
                <Text style={styles.label}>한 줄 소개</Text>
                <Text
                  style={[
                    styles.counter,
                    introIsError && { color: ERROR_COLOR },
                  ]}
                >
                  {introLen}/{INTRO_MAX}
                </Text>
              </View>

              <TextInput
                style={styles.input}
                value={intro}
                onFocus={() => setFocusIntro(true)}
                onBlur={() => setFocusIntro(false)}
                onChangeText={(value) => {
                  const introWithoutLineBreaks = value.replace(/[\r\n]/g, "");
                  setIntro(introWithoutLineBreaks);
                }}
                placeholder="나를 한 줄로 소개해 보세요"
                placeholderTextColor={Colors.gray_300}
              />
            </View>

            <View style={styles.helperRow}>
              <Text style={[styles.helperIcon, { color: introHelperColor }]}>
                {introIsError ? "✗" : "✓"}
              </Text>
              <Text style={[styles.helperText, { color: introHelperColor }]}>
                {introHelperText}
              </Text>
            </View>
          </View>
        </KeyboardAwareScrollView>

        <SpotButton
          label={saving ? "저장 중..." : "확인"}
          variant="primary"
          size="large"
          disabled={!isFormValid || saving}
          onPress={handleSubmit}
        />
      </View>
    </ProfileLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 25,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarCircle: {
    width: 112,
    height: 112,
    borderRadius: 60,
    backgroundColor: Colors.gray_100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.gray_100,
  },
  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraMenuOverlay: {
    zIndex: 10,
    position: "absolute",
    top: -20,
    left: 0,
    right: -10,
    bottom: 0,
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  cameraMenuContainer: {
    width: 170,
    marginTop: 120,
    marginRight: 32,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#0000001F",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cameraMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E6E680",
  },
  cameraMenuText: {
    ...TextStyles.Medium14,
    color: Colors.gray_800,
  },
  sectionContainer: {},
  fieldBlock: {
    paddingVertical: 8,
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray_100,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    ...TextStyles.SemiBold20,
    color: Colors.gray_800,
  },
  counter: {
    ...TextStyles.Medium14,
    color: Colors.gray_400,
  },
  input: {
    ...TextStyles.Medium16,
    color: Colors.gray_800,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },
  dupButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#303030",
  },
  dupButtonText: {
    ...TextStyles.Medium12,
    color: Colors.white,
  },
  helperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  helperIcon: {
    ...TextStyles.Medium12,
    marginRight: 4,
  },
  helperText: {
    ...TextStyles.Medium12,
  },
});
