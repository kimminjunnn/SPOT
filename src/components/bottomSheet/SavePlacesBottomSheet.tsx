// src/components/bottomSheet/SavePlacesBottomSheet.tsx
import React, {
  useMemo,
  useCallback,
  useRef,
  useState,
  useEffect,
  memo,
} from "react";
import { View, Text, Image, StyleSheet, Pressable, Alert } from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetFooter,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

export type SavePlaceItem = {
  id: string;
  name: string;
  category: string;
  address: string;
  thumbUrl?: string;
};

type Props = {
  visible: boolean;
  places: SavePlaceItem[];
  initialSelectedIds?: string[];
  onClose: () => void;
  onChangeSelection?: (ids: string[]) => void;
  onConfirm?: (ids: string[]) => void;
};

const FOOTER_HEIGHT = 84;

function SavePlacesBottomSheet({
  visible,
  places,
  initialSelectedIds = [],
  onClose,
  onChangeSelection,
  onConfirm,
}: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  const snapPoints = useMemo(() => ["6.7%", "50%", "75%"], []);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedIds),
  );

  const onChangeSelectionRef = useRef(onChangeSelection);
  const maxSelect = places.length;
  useEffect(() => {
    onChangeSelectionRef.current = onChangeSelection;
  }, [onChangeSelection]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  useEffect(() => {
    onChangeSelectionRef.current?.(selectedIds);
  }, [selectedIds]);

  const toggleOne = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);

        if (next.has(id)) {
          next.delete(id);
        } else {
          if (next.size >= maxSelect) {
            Alert.alert("선택 제한", `최대 ${maxSelect}개까지 선택 가능`);
            return prev;
          }
          next.add(id);
        }

        return next;
      });
    },
    [maxSelect],
  );

  const isAllChecked = selected.size > 0 && selected.size === places.length;

  const toggleAll = useCallback(() => {
    if (!places.length) return;

    setSelected(
      isAllChecked
        ? new Set()
        : new Set(places.map((p) => p.id).slice(0, maxSelect)),
    );
  }, [isAllChecked, places, maxSelect]);

  const handleConfirm = useCallback(() => {
    onConfirm?.(selectedIds);
    sheetRef.current?.close();
  }, [onConfirm, selectedIds]);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View style={styles.footer}>
          <Pressable
            onPress={handleConfirm}
            style={[styles.cta, selectedIds.length === 0 && styles.ctaDisabled]}
            disabled={selectedIds.length === 0}
          >
            <Text style={styles.ctaText}>
              장소 {selectedIds.length}곳 저장하기
            </Text>
          </Pressable>
        </View>
      </BottomSheetFooter>
    ),
    [selectedIds.length, handleConfirm],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={2}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: Colors.white }}
      handleIndicatorStyle={{ backgroundColor: Colors.gray_300 }}
      footerComponent={renderFooter}
      enableDynamicSizing={false}
    >
      <BottomSheetScrollView
        stickyHeaderIndices={[0]}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: FOOTER_HEIGHT + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>장소 선택하기</Text>
          <Text style={styles.headerSubTitle}>
            SPOT에 저장할 장소를 선택해주세요
          </Text>

          <View style={styles.rowBetween}>
            <Pressable onPress={toggleAll} style={styles.checkAll}>
              <View
                style={[
                  styles.checkbox,
                  isAllChecked && styles.checkboxChecked,
                ]}
              >
                {isAllChecked && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.checkAllText}>전체선택</Text>
            </Pressable>
            <Text style={TextStyles.Medium14}>
              {selectedIds.length} / {maxSelect}
            </Text>
          </View>
        </View>

        {places.map((item) => {
          const checked = selected.has(item.id);

          return (
            <Pressable
              key={item.id}
              onPress={() => toggleOne(item.id)}
              style={styles.card}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={`${item.name} 선택`}
            >
              <Image
                source={
                  item.thumbUrl
                    ? { uri: item.thumbUrl }
                    : require("@/assets/images/default-place.png")
                }
                style={styles.thumb}
              />
              <View style={styles.info}>
                <View style={styles.infoRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCategory}>{item.category}</Text>
                </View>
                <View style={styles.addressContainer}>
                  <Image
                    style={styles.addressIcon}
                    source={require("@/assets/images/marker-gray.png")}
                  />
                  <Text
                    style={styles.itemAddress}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.address}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.checkboxLarge,
                  checked && styles.checkboxChecked,
                ]}
              >
                {checked && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

export default memo(SavePlacesBottomSheet);

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
  },
  headerTitle: {
    textAlign: "center",
    ...TextStyles.Bold16,
    color: Colors.gray_600,
  },
  headerSubTitle: {
    textAlign: "center",
    ...TextStyles.Regular12,
    color: Colors.gray_400,
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
  },
  checkAll: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  thumb: {
    width: 80,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 12,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  itemName: {
    ...TextStyles.Bold16,
    color: Colors.gray_800,
    marginRight: 5,
  },
  itemCategory: {
    marginTop: 4,
    ...TextStyles.Regular12,
    color: Colors.gray_300,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    minWidth: 0,
  },
  addressIcon: {
    marginTop: 3,
    width: 15,
    height: 15,
  },
  itemAddress: {
    flex: 1,
    minWidth: 0,
    ...TextStyles.Regular12,
    color: Colors.gray_800,
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.gray_200,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxLarge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.gray_200,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#303030",
    borderColor: "#303030",
  },
  checkboxTick: {
    color: "#fff",
    fontWeight: "700",
  },
  checkAllText: {
    ...TextStyles.Medium14,
    color: Colors.gray_300,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
  },
  cta: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: {
    backgroundColor: "#EFEFEF",
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700",
  },
});
