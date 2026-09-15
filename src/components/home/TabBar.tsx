import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { TextStyles } from "@/src/styles/TextStyles";
import { Colors } from "@/src/styles/Colors";

import { HOME_TABS } from "@/src/components/home/constants";
import { HomeTabKey } from "./types";
import { CONTENT_MAX_WIDTH } from "@/src/styles/Layout";

type TabBarProps = {
  activeTab: HomeTabKey;
  onPressTab: (tab: HomeTabKey) => void;
};
export const TabBar = ({ activeTab, onPressTab }: TabBarProps) => {
  return (
    <View style={styles.tabBar}>
      {HOME_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onPressTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabLabel,
                isActive ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              {tab.label}
            </Text>
            {isActive && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    justifyContent: "space-around",
    flexDirection: "row",
  },
  tabItem: { alignItems: "center", paddingHorizontal: 20 },
  tabLabel: { ...TextStyles.SemiBold16, marginBottom: 4 },
  tabLabelActive: { color: Colors.primary_500, fontWeight: "600" },
  tabLabelInactive: { color: Colors.gray_300 },
  tabUnderline: {
    width: 92,
    height: 4,
    backgroundColor: Colors.primary_500,
  },
});
