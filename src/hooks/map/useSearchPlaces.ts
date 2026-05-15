// 검색어와 좌표를 기준으로 검색 결과를 불러오고, 결과에 맞춰 지도를 이동시키는 hook
import { useEffect, RefObject } from "react";
import type { NaverMapViewRef } from "@mj-studio/react-native-naver-map";

import { useSearchStore } from "@/src/stores/useSearchStore";
import { fetchSearchDetails } from "@/src/lib/api/search";
type Coords = {
  lat: number | null;
  lng: number | null;
};

function isCanceledError(error: any) {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED" ||
    error?.message === "canceled"
  );
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

  useEffect(() => {
    if (!query || coords.lat == null || coords.lng == null) return;

    const lat = coords.lat;
    const lng = coords.lng;

    let alive = true;

    const loadSearchResults = async () => {
      try {
        setLoading();

        const list = await fetchSearchDetails({
          keyword: query,
          lat,
          lng,
        });

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

    loadSearchResults();

    return () => {
      alive = false;
    };
  }, [query, coords.lat, coords.lng, setLoading, setResult, setError]);

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
