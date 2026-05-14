// /main/me/places 기반으로 저장한 장소 핀 데이터 로드
import { useEffect, useRef, useState } from "react";
import type { ApiMapPlace } from "@/src/types/place";
import { fetchMapPlaces } from "@/src/lib/api/places";

type Coords = {
  lat: number | null;
  lng: number | null;
};

export function useLoadMapPlaces(coords: Coords) {
  const [myPlaces, setMyPlaces] = useState<ApiMapPlace[]>([]);
  const lastRequestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (coords.lat == null || coords.lng == null) {
      return;
    }

    const requestKey = `${coords.lat},${coords.lng},10`;

    if (lastRequestKeyRef.current === requestKey) {
      return;
    }

    lastRequestKeyRef.current = requestKey;

    const load = async () => {
      try {
        const list = await fetchMapPlaces({
          latitude: coords.lat!,
          longitude: coords.lng!,
          radius: 10,
        });

        setMyPlaces(list);
      } catch (err: any) {
        lastRequestKeyRef.current = null;

        console.log(
          "[/main/me/places map pins] 에러:",
          err?.response?.status,
          err?.response?.data ?? err.message,
        );
      }
    };

    load();
  }, [coords.lat, coords.lng]);

  return { myPlaces };
}
