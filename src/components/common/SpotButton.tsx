// src/components/common/SpotButton.tsx
import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TextStyle,
} from "react-native";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "small" | "medium" | "large";

// 내부적으로 disabled 상태까지 포함한 variant
type InternalVariant = ButtonVariant | "disabled" | "disabled-secondary";

type SpotButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  visuallyDisabled?: boolean;
};

export default function SpotButton({
  label,
  onPress,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  style,
  disabled = false,
  visuallyDisabled = false,
}: SpotButtonProps) {
  // disabled 또는 시각적 비활성 상태면 내부 variant를 교체
  const resolvedVariant: InternalVariant = disabled || visuallyDisabled
    ? variant === "secondary"
      ? "disabled-secondary"
      : "disabled"
    : variant;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[resolvedVariant],
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          textStyles[resolvedVariant],
          size === "small" && TextStyles.Bold12,
          size === "medium" && TextStyles.Bold12,
          size === "large" && TextStyles.Bold16,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  small: {
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  medium: {
    height: 32, // 프로필 수정 / 팔로우 수락 버튼 높이
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  large: {
    height: 53, // 모달 하단 CTA 같은 느낌
    paddingHorizontal: 18,
    borderRadius: 12,
  },
};

const variantStyles: Record<InternalVariant, ViewStyle> = StyleSheet.create({
  primary: {
    backgroundColor: "#303030",
  },
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray_100,
  },

  disabled: {
    backgroundColor: Colors.gray_200,
  },
  "disabled-secondary": {
    backgroundColor: Colors.gray_100,
    borderWidth: 1,
    borderColor: Colors.gray_100,
  },
});

const textStyles: Record<InternalVariant, TextStyle> = StyleSheet.create({
  primary: {
    color: Colors.white,
  },
  secondary: {
    color: Colors.gray_800,
  },

  disabled: {
    color: Colors.gray_400,
  },
  "disabled-secondary": {
    color: Colors.white,
  },
});

const styles = StyleSheet.create({
  base: {
    justifyContent: "center",
    alignItems: "center",
  },
  fullWidth: {
    width: "100%",
  },
  pressed: {
    opacity: 0.7,
  },
});
