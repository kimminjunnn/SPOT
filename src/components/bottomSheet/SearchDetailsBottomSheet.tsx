// src/components/bottomSheet/SearchDetailsBottomSheet.tsx
import React, { useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Image,
} from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useSearchStore } from "@/src/stores/useSearchStore";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";
import PlaceCard from "@/src/components/common/PlaceCard";
import { getPlaceCardSaverProps } from "@/src/lib/mappers/placeCardSavers";

type Props = {
  onClose: () => void; // 검색 모드 종료(Places 시트로 복귀)
  onPressItem?: (placeId: string) => void; // 카드 탭 시 지도 이동
};

export default function SearchDetailsBottomSheet({
  onClose,
  onPressItem,
}: Props) {
  const sheetRef = useRef<BottomSheet>(null);

  const phase = useSearchStore((s) => s.phase);
  const items = useSearchStore((s) => s.items);
  const error = useSearchStore((s) => s.error);
  const focus = useSearchStore((s) => s.focus);

  const snapPoints = useMemo(() => ["6.7%", "50%", "75%"], []);

  const Header = (
    <View style={styles.header}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Image
          source={require("@/assets/images/search-input-icon-black.png")}
          style={{ width: 18, height: 18, marginTop: 1 }}
        />
        <Text style={TextStyles.SemiBold16}>검색 결과</Text>
      </View>

      <Pressable onPress={onClose} hitSlop={10}>
        <Image
          source={require("@/assets/images/x-gray.png")}
          style={{ width: 20, height: 20 }}
        />
      </Pressable>
    </View>
  );

  const Body = () => {
    if (phase === "loading") {
      return (
        <BottomSheetView style={styles.centerWrap}>
          <ActivityIndicator />
          <Text
            style={[
              TextStyles.Medium14,
              { color: Colors.gray_500, marginTop: 8 },
            ]}
          >
            검색 중…
          </Text>
        </BottomSheetView>
      );
    }

    if (phase === "error") {
      return (
        <BottomSheetView style={styles.centerWrap}>
          <Text style={TextStyles.Medium16}>문제가 발생했어요</Text>
          {!!error && (
            <Text
              style={[
                TextStyles.Regular12,
                { color: Colors.gray_500, marginTop: 6 },
              ]}
              numberOfLines={2}
            >
              {error}
            </Text>
          )}
          <Text
            style={[
              TextStyles.Regular12,
              { color: Colors.gray_400, marginTop: 12 },
            ]}
          >
            검색어를 바꾸거나 잠시 후 다시 시도해 주세요.
          </Text>
        </BottomSheetView>
      );
    }

    if (phase === "empty") {
      return (
        <BottomSheetView style={styles.centerWrap}>
          <Text style={TextStyles.Medium16}>검색 결과가 없어요</Text>
          <Text
            style={[
              TextStyles.Regular12,
              { color: Colors.gray_400, marginTop: 8 },
            ]}
          >
            키워드를 바꿔보거나 위치를 이동해보세요.
          </Text>
        </BottomSheetView>
      );
    }

    // success
    return (
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
      >
        {items.map((p) => {
          const category = p.category ?? "";

          const images =
            p.thumbnails && p.thumbnails.length > 0
              ? p.thumbnails.slice(0, 5).map((uri: string) => ({ uri }))
              : p.photo
                ? [{ uri: p.photo }]
                : [];
          const saverProps = getPlaceCardSaverProps(p);

          return (
            <Pressable
              key={p.id}
              onPress={() => {
                onPressItem?.(p.id);
                focus(p);
              }}
              style={{ paddingVertical: 2 }}
            >
              <PlaceCard
                name={p.name}
                category={category}
                address={p.address ?? ""}
                images={images}
                savedUsers={saverProps.savedUsers}
                savedCount={saverProps.savedCount}
                showDirectionButton={true}
                rating={p.ratingAvg ?? undefined}
                reviewCount={p.ratingCount ?? undefined}
                showBookmark={true}
                isBookmarked={p.isBookmarked}
                onPress={() =>
                  router.push({
                    pathname: "/place/[placeId]",
                    params: {
                      placeId: String(p.id),
                      lat: String(p.lat),
                      lng: String(p.lng),
                    },
                  })
                }
              />
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
    );
  };

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      index={2} // 기본 70%로 열림
      enableDynamicSizing={false} // 내용 높이 때문에 스냅 초과 상승 방지
      enablePanDownToClose
      enableOverDrag={false}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={{ backgroundColor: Colors.gray_300 }}
    >
      {Header}
      {Body()}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    height: 48,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
  },
  centerWrap: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
