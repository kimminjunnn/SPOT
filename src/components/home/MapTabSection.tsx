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
const PIN_SCALE = 1.5;

type MapTabSectionProps = {
  mapRef: React.RefObject<NaverMapViewRef | null>;
  markers: HomeMarker[];
  selectedPlaceId?: number | null;
  isCommentOpen: boolean;
  onPressCurrentLocation: () => void | Promise<void>;
  onPressMarker: (marker: HomeMarker) => void;
};

export const MapTabSection = ({
  mapRef,
  markers,
  selectedPlaceId,
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
          const markerPlaceId = getMarkerPlaceId(m);
          const isSelected =
            markerPlaceId != null && markerPlaceId === selectedPlaceId;
          const width = isSelected ? Math.round(PIN_W * PIN_SCALE) : PIN_W;
          const height = isSelected ? Math.round(PIN_H * PIN_SCALE) : PIN_H;

          return (
            <NaverMapMarkerOverlay
              key={m.key}
              latitude={m.lat}
              longitude={m.lng}
              image={markerImage}
              width={width}
              height={height}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isSelected ? 999 : 1}
              onTap={() => {
                onPressMarker(m);
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

function getMarkerPlaceId(marker: HomeMarker) {
  const raw = marker.raw ?? {};
  const placeId = Number(raw.placeId ?? raw.id);

  return Number.isFinite(placeId) ? placeId : null;
}

const styles = StyleSheet.create({
  mapContainer: { flex: 1, backgroundColor: Colors.gray_100 },
  map: { flex: 1, zIndex: 0 },
});
