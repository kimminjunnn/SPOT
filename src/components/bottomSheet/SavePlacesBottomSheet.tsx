// src/components/bottomSheet/SavePlacesBottomSheet.tsx
import React, {
  useMemo,
  useCallback,
  useRef,
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
import InquiryLink from "@/src/components/inquiry/InquiryLink";

export type SavePlaceItem = {
  id: string;
  name: string;
  category: string;
  address: string;
  thumbUrl?: string;
};

type Props = {
  places: SavePlaceItem[];
  selectedIds: string[];
  totalSelectedCount: number;
  currentPage?: number;
  totalPages?: number;
  saving?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose: () => void;
  onChangeSelection: (ids: string[]) => void;
  onConfirm?: () => void;
  onPressInquiry?: () => void;
};

const FOOTER_HEIGHT = 116;

function SavePlacesBottomSheet({
  places,
  selectedIds,
  totalSelectedCount,
  currentPage = 1,
  totalPages = 1,
  saving = false,
  onPrevious,
  onNext,
  onClose,
  onChangeSelection,
  onConfirm,
  onPressInquiry,
}: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  const snapPoints = useMemo(() => ["6.7%", "50%", "75%"], []);
  const maxSelect = places.length;
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleOne = useCallback(
    (id: string) => {
      const next = new Set(selected);

      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= maxSelect) {
          Alert.alert("선택 제한", `최대 ${maxSelect}개까지 선택 가능`);
          return;
        }
        next.add(id);
      }

      onChangeSelection(Array.from(next));
    },
    [maxSelect, onChangeSelection, selected],
  );

  const isAllChecked = selected.size > 0 && selected.size === places.length;

  const toggleAll = useCallback(() => {
    if (!places.length) return;

    onChangeSelection(
      isAllChecked
        ? []
        : places.map((p) => p.id).slice(0, maxSelect),
    );
  }, [isAllChecked, maxSelect, onChangeSelection, places]);

  const handleConfirm = useCallback(() => {
    if (saving) return;
    onConfirm?.();
  }, [onConfirm, saving]);

  const hasMultiplePages = totalPages > 1;
  const canGoPrevious = currentPage > 1 && !saving;
  const canGoNext = currentPage < totalPages && !saving;

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View style={styles.footer}>
          <Pressable
            onPress={handleConfirm}
            style={[
              styles.cta,
              (totalSelectedCount === 0 || saving) && styles.ctaDisabled,
            ]}
            disabled={totalSelectedCount === 0 || saving}
            accessibilityRole="button"
            accessibilityLabel={`선택한 장소 ${totalSelectedCount}곳 저장하기`}
            accessibilityState={{
              disabled: totalSelectedCount === 0 || saving,
              busy: saving,
            }}
          >
            <Text style={styles.ctaText}>
              {saving
                ? "저장 중..."
                : `장소 ${totalSelectedCount}곳 저장하기`}
            </Text>
          </Pressable>

          {onPressInquiry ? <InquiryLink onPress={onPressInquiry} /> : null}
        </View>
      </BottomSheetFooter>
    ),
    [handleConfirm, onPressInquiry, saving, totalSelectedCount],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={2}
      snapPoints={snapPoints}
      enablePanDownToClose={!saving}
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
          <Pressable
            onPress={onClose}
            disabled={saving}
            hitSlop={12}
            style={[styles.closeButton, saving && styles.disabledControl]}
            accessibilityRole="button"
            accessibilityLabel="추출 결과 닫기"
          >
            <Image
              source={require("@/assets/images/x-gray.png")}
              style={styles.closeIcon}
            />
          </Pressable>

          <View style={styles.navigationRow}>
            <Pressable
              onPress={onPrevious}
              disabled={!canGoPrevious}
              hitSlop={12}
              style={[
                styles.navigationButton,
                !hasMultiplePages && styles.hiddenControl,
                !canGoPrevious && hasMultiplePages && styles.disabledControl,
              ]}
              accessibilityRole="button"
              accessibilityLabel="이전 추출 결과"
              accessibilityState={{ disabled: !canGoPrevious }}
            >
              <Image
                source={require("@/assets/images/arrow-left-gray.png")}
                style={styles.navigationIcon}
              />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>장소 선택하기</Text>
              {hasMultiplePages ? (
                <Text style={styles.pageIndicator}>
                  {currentPage} / {totalPages}
                </Text>
              ) : null}
              <Text style={styles.headerSubTitle}>
                SPOT에 저장할 장소를 선택해주세요
              </Text>
            </View>

            <Pressable
              onPress={onNext}
              disabled={!canGoNext}
              hitSlop={12}
              style={[
                styles.navigationButton,
                !hasMultiplePages && styles.hiddenControl,
                !canGoNext && hasMultiplePages && styles.disabledControl,
              ]}
              accessibilityRole="button"
              accessibilityLabel="다음 추출 결과"
              accessibilityState={{ disabled: !canGoNext }}
            >
              <Image
                source={require("@/assets/images/arrow-right-gray.png")}
                style={styles.navigationIcon}
              />
            </Pressable>
          </View>

          <View style={styles.rowBetween}>
            <Pressable
              onPress={toggleAll}
              disabled={saving}
              style={styles.checkAll}
              accessibilityRole="checkbox"
              accessibilityLabel="장소 전체 선택"
              accessibilityState={{ checked: isAllChecked, disabled: saving }}
            >
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
              disabled={saving}
              style={styles.card}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: saving }}
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
  navigationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  navigationButton: {
    width: 40,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  navigationIcon: {
    width: 24,
    height: 24,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  hiddenControl: {
    opacity: 0,
  },
  disabledControl: {
    opacity: 0.3,
  },
  headerTitle: {
    textAlign: "center",
    ...TextStyles.Bold16,
    color: Colors.gray_600,
  },
  pageIndicator: {
    ...TextStyles.Medium12,
    color: Colors.gray_400,
    marginTop: 2,
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
