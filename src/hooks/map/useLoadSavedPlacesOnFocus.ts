import { useCallback, useRef, useSyncExternalStore } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { fetchMyNewSavedPlaces } from "@/src/lib/api/places";
import { useLocationStore } from "@/src/stores/useLocationStore";
import { useSavedPlacesStore } from "@/src/stores/useSavedPlacesStore";

import { getRoundedCoords, createCoordsKey } from "@/src/utils/coords";
import {
  getSavedPlacesRefreshRevision,
  subscribeSavedPlacesRefresh,
} from "@/src/lib/savedPlacesRefresh";

export function useLoadSavedPlacesOnFocus() {
  const lastSavedPlacesKeyRef = useRef<string | null>(null);
  const refreshRevision = useSyncExternalStore(
    subscribeSavedPlacesRefresh,
    getSavedPlacesRefreshRevision,
    getSavedPlacesRefreshRevision,
  );

  const refreshOnce = useLocationStore((s) => s.refreshOnce);

  const setSavedList = useSavedPlacesStore((s) => s.setSavedList);
  const setSavedLoading = useSavedPlacesStore((s) => s.setSavedLoading);
  const setSavedError = useSavedPlacesStore((s) => s.setSavedError);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadSavedPlaces = async () => {
        try {
          await refreshOnce();
        } catch (error: any) {
          if (!cancelled) setSavedError(error?.message ?? "failed to load");
          return;
        }

        if (cancelled) return;

        const { coords } = useLocationStore.getState();
        if (!coords) return;

        const { lat, lng } = getRoundedCoords(coords);
        const requestKey = `${createCoordsKey(lat, lng)},${refreshRevision}`;

        if (lastSavedPlacesKeyRef.current === requestKey) {
          return;
        }

        setSavedLoading(true);
        setSavedError(null);

        try {
          const list = await fetchMyNewSavedPlaces({
            lat,
            lng,
          });

          if (!cancelled) {
            lastSavedPlacesKeyRef.current = requestKey;
            setSavedList(list);
          }
        } catch (e: any) {
          if (!cancelled) {
            setSavedError(e?.message ?? "failed to load");
            lastSavedPlacesKeyRef.current = null;
          }
        } finally {
          if (!cancelled) {
            setSavedLoading(false);
          }
        }
      };

      void loadSavedPlaces();

      return () => {
        cancelled = true;
      };
    }, [
      refreshOnce,
      refreshRevision,
      setSavedList,
      setSavedLoading,
      setSavedError,
    ]),
  );
}
