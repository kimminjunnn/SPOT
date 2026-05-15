// src/components/bottomSheet/SearchDetailBottomSheet.tsx
import React, { useMemo, useRef } from "react";
import { StyleSheet, Linking } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";

import { useSearchStore } from "@/src/stores/useSearchStore";
import { Colors } from "@/src/styles/Colors";
import PlaceCard from "@/src/components/common/PlaceCard";
import { formatDistance } from "@/src/utils/format"; // ✅ 공통 util 사용
import { getPlaceCardSaverProps } from "@/src/lib/mappers/placeCardSavers";

type Props = { onClose: () => void };

export default function SearchDetailBottomSheet({ onClose }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const focused = useSearchStore((s) => s.focused);
  const toggleBookmark = useSearchStore((s) => s.toggleBookmark);

  const images = useMemo(() => {
    if (!focused) return [];
    const arr =
      focused.thumbnails && focused.thumbnails.length > 0
        ? focused.thumbnails
        : focused.photo
          ? [focused.photo]
          : [];
    return arr.slice(0, 5).map((uri) => ({ uri }));
  }, [focused]);

  const saverProps = useMemo(
    () => getPlaceCardSaverProps(focused ?? {}),
    [focused],
  );

  const distanceText = useMemo(() => {
    if (!focused?.distanceM) return undefined;
    return formatDistance(focused.distanceM);
  }, [focused]);

  const openNaverDirection = () => {
    if (!focused) return;
    const { lat, lng, name } = focused;
    if (!isFinite(lat) || !isFinite(lng)) return;

    const url = `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(
      name || "목적지",
    )}`;
    Linking.openURL(url).catch(() => {
      const web = `https://map.naver.com/v5/search/${encodeURIComponent(
        name || "",
      )}`;
      Linking.openURL(web);
    });
  };

  const handleClose = () => {
    onClose?.();
  };

  if (!focused) return null;

  const {
    placeId,
    name,
    address,
    ratingAvg,
    ratingCount,
    isBookmarked,
    category,
  } = focused;

  const categoryLabel = category ?? "";

  return (
    <BottomSheet
      ref={sheetRef}
      enableDynamicSizing
      index={0}
      enablePanDownToClose
      enableOverDrag={false}
      onClose={handleClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={{ backgroundColor: Colors.gray_300 }}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <PlaceCard
          style={styles.placeCard}
          name={name}
          category={categoryLabel}
          address={address ?? ""}
          images={images}
          savedUsers={saverProps.savedUsers}
          savedCount={saverProps.savedCount}
          showDirectionButton={true}
          rating={ratingAvg ?? undefined}
          reviewCount={ratingCount ?? undefined}
          showBookmark={true}
          isBookmarked={!!isBookmarked}
          distanceText={distanceText}
          onToggleBookmark={() => toggleBookmark(placeId)}
          onPress={() =>
            router.push({
              pathname: "/place/[placeId]",
              params: {
                placeId: String(placeId),
                lat: String(focused.lat),
                lng: String(focused.lng),
              },
            })
          }
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  placeCard: {
    marginBottom: 0,
  },
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});
