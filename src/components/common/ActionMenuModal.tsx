import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

const MENU_WIDTH = 142;
const MENU_GAP = 4;
const SCREEN_EDGE_MARGIN = 20;

export type ActionMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ActionMenuItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  menus: ActionMenuItem[];
  anchor?: ActionMenuAnchor | null;
};

export default function ActionMenuModal({
  visible,
  onClose,
  menus,
  anchor,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();

  const handlePressMenu = (onPress: () => void) => {
    onClose();
    onPress();
  };

  const positionStyle = anchor
    ? {
        top: anchor.y + anchor.height + MENU_GAP,
        left: Math.min(
          Math.max(
            anchor.x + anchor.width - MENU_WIDTH,
            SCREEN_EDGE_MARGIN,
          ),
          Math.max(
            SCREEN_EDGE_MARGIN,
            windowWidth - MENU_WIDTH - SCREEN_EDGE_MARGIN,
          ),
        ),
      }
    : styles.fallbackPosition;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.shadowWrapper, positionStyle]}>
          <Pressable style={styles.menuContainer} onPress={() => {}}>
            {menus.map((menu, index) => {
              const isLast = index === menus.length - 1;

              return (
                <View key={`${menu.label}-${index}`}>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => handlePressMenu(menu.onPress)}
                  >
                    <Text
                      style={[
                        styles.menuText,
                        menu.destructive && styles.destructiveText,
                      ]}
                    >
                      {menu.label}
                    </Text>
                  </Pressable>

                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  shadowWrapper: {
    position: "absolute",
    width: MENU_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 12,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
  },
  fallbackPosition: {
    top: 265,
    right: SCREEN_EDGE_MARGIN,
  },
  menuContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuText: {
    ...TextStyles.Medium14,
    color: Colors.gray_800,
  },
  destructiveText: {
    color: Colors.gray_800,
  },
  divider: {
    height: 1,
    backgroundColor: "#E6E6E680",
  },
});
