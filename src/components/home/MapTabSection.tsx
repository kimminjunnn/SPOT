import { View, StyleSheet } from "react-native";
import {
  NaverMapMarkerOverlay,
  NaverMapView,
} from "@mj-studio/react-native-naver-map";

import MyLocationButton from "@/src/components/map/MyLocationButton";
import UserLocationMarker from "@/src/components/map/UserLocationMarker";
import { Colors } from "@/src/styles/Colors";
import { getMapPinImage } from "@/src/utils/getMapPinImage";
import type { NaverMapViewRef } from "@mj-studio/react-native-naver-map";

import { type HomeMarker } from "./types";

const PIN_W = 52;
const PIN_H = 58;

type MapTabSectionProps = {
  mapRef: React.RefObject<NaverMapViewRef | null>;
  markers: HomeMarker[];
  isCommentOpen: boolean;
  onPressCurrentLocation: () => void | Promise<void>;
  onPressMarker: (placeId: number) => void;
};

export const MapTabSection = ({
  mapRef,
  markers,
  isCommentOpen,
  onPressCurrentLocation,
  onPressMarker,
}: MapTabSectionProps) => {
  return (
    <View style={styles.mapContainer}>
      <NaverMapView
        ref={mapRef}
        isShowLocationButton={false}
        style={[styles.map, StyleSheet.absoluteFillObject]}
        onInitialized={() => {
          mapRef.current?.setLocationTrackingMode("None" as any);
        }}
      >
        <UserLocationMarker enableRotation />

        {/* 핀 */}
        {markers.map((m) => {
          const markerImage = getMapPinImage(m.raw?.list);

          return (
            <NaverMapMarkerOverlay
              key={m.key}
              latitude={m.lat}
              longitude={m.lng}
              image={markerImage}
              width={PIN_W}
              height={PIN_H}
              anchor={{ x: 0.5, y: 1 }}
              onTap={() => {
                const pid = m?.raw?.placeId ?? m?.raw?.id ?? null;
                if (typeof pid !== "number") return;
                onPressMarker(pid);
              }}
            />
          );
        })}
      </NaverMapView>

      {!isCommentOpen && (
        <MyLocationButton
          onPress={onPressCurrentLocation}
          bottom={40}
          left={15}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: { flex: 1, backgroundColor: Colors.gray_100 },
  map: { flex: 1, zIndex: 0 },
});
