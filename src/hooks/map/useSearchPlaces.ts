// 검색어와 좌표를 기준으로 검색 결과를 불러오고, 결과에 맞춰 지도를 이동시키는 hook
import { useEffect, RefObject } from "react";
import type { NaverMapViewRef } from "@mj-studio/react-native-naver-map";

import { useSearchStore } from "@/src/stores/useSearchStore";
import { useLocationStore } from "@/src/stores/useLocationStore";
import { fetchSearchDetails } from "@/src/lib/api/search";
type Coords = {
  lat: number | null;
  lng: number | null;
};

const SEARCH_LOCATION_TIMEOUT_MS = 10_000;
const SEARCH_DETAILS_DEBOUNCE_MS = 400;

function isCanceledError(error: any) {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED" ||
    error?.message === "canceled"
  );
}

async function waitForLocation(refreshOnce: () => Promise<void>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      refreshOnce(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("location timeout")),
          SEARCH_LOCATION_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function useSearchPlaces(
  mapRef: RefObject<NaverMapViewRef | null>,
  coords: Coords,
) {
  const query = useSearchStore((s) => s.query);
  const items = useSearchStore((s) => s.items);

  const setLoading = useSearchStore((s) => s.setLoading);
  const setResult = useSearchStore((s) => s.setResult);
  const setError = useSearchStore((s) => s.setError);
  const refreshOnce = useLocationStore((s) => s.refreshOnce);

  useEffect(() => {
    if (!query) return;

    let alive = true;
    let controller: AbortController | null = null;

    setLoading();

    const loadSearchResults = async (signal: AbortSignal) => {
      try {
        let lat = coords.lat;
        let lng = coords.lng;

        // submit() changes the search phase to "loading" before navigating to
        // the map. Previously this hook returned early when location was not
        // ready, leaving that phase (and the spinner) active forever.
        if (lat == null || lng == null) {
          try {
            await waitForLocation(refreshOnce);
          } catch {
            if (alive) {
              setError(
                "현재 위치를 확인할 수 없어 검색하지 못했어요. 잠시 후 다시 시도해 주세요.",
              );
            }
            return;
          }

          if (!alive) return;

          const latestCoords = useLocationStore.getState().coords;
          if (!latestCoords) {
            setError(
              "현재 위치를 확인할 수 없어 검색하지 못했어요. 위치 권한을 확인해 주세요.",
            );
            return;
          }

          lat = latestCoords.lat;
          lng = latestCoords.lng;
        }

        const list = await fetchSearchDetails(
          { keyword: query, lat, lng },
          { signal },
        );

        if (!alive) return;

        setResult(list);
      } catch (e: any) {
        if (!alive) return;
        if (isCanceledError(e)) return;

        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "검색 중 문제가 발생했습니다.";

        setError(msg);
      }
    };

    // Query or coordinates can change several times while navigating to the
    // map. Wait for them to settle so only the latest combination reaches the
    // server. Cleanup also collapses React effect replays before dispatch.
    const debounceTimer = setTimeout(() => {
      controller = new AbortController();
      void loadSearchResults(controller.signal);
    }, SEARCH_DETAILS_DEBOUNCE_MS);

    return () => {
      alive = false;
      clearTimeout(debounceTimer);
      controller?.abort();
    };
  }, [
    query,
    coords.lat,
    coords.lng,
    refreshOnce,
    setLoading,
    setResult,
    setError,
  ]);

  useEffect(() => {
    if (!items.length) return;

    const p = items[0];

    if (!isFinite(p.lat) || !isFinite(p.lng)) return;

    mapRef.current?.animateCameraTo({
      latitude: p.lat,
      longitude: p.lng,
      zoom: 15,
      duration: 0,
      easing: "EaseIn",
    });
  }, [items, mapRef]);
}
