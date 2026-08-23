import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { NaverMapViewRef } from "@mj-studio/react-native-naver-map";
import type { RefObject } from "react";

import { Colors } from "@/src/styles/Colors";

type Props = {
  mapRef: RefObject<NaverMapViewRef | null>;
  latitude: number;
  longitude: number;
};

/** Positions a non-blocking spinner directly above the selected native map pin. */
export default function MapDetailLoadingIndicator({
  mapRef,
  latitude,
  longitude,
}: Props) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const updatePosition = async () => {
      const screenPoint = await mapRef.current?.coordinateToScreen({
        latitude,
        longitude,
      });

      if (!screenPoint?.isValid || cancelled) return;
      setPoint({ x: screenPoint.screenX, y: screenPoint.screenY });
    };

    // The native map needs one frame after the tap to finish its layout.
    const timer = setTimeout(() => void updatePosition(), 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [latitude, longitude, mapRef]);

  if (!point) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { left: point.x - 20, top: point.y - 128 }]}
    >
      <ActivityIndicator color={Colors.primary_500} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    elevation: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    zIndex: 30,
  },
});
