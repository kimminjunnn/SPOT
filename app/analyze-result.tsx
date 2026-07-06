import { useEffect } from "react";
import { ActivityIndicator, NativeModules, Text, View } from "react-native";
import { router } from "expo-router";

import { useAnalyzeResultStore } from "@/src/stores/useAnalyzeResultStore";
import {
  mapAnalyzeResponseToItems,
  parseAnalyzeJson,
} from "@/src/lib/analyze/analyzeResult";

export default function AnalyzeResultPage() {
  useEffect(() => {
    const run = async () => {
      try {
        const { SharedStore } = NativeModules;

        if (!SharedStore?.getLatestAnalyzeResult) {
          router.replace("/(tabs)/map");
          return;
        }

        const json = await SharedStore.getLatestAnalyzeResult();

        if (!json) {
          router.replace("/(tabs)/map");
          return;
        }

        const items = mapAnalyzeResponseToItems(parseAnalyzeJson(json));

        if (items.length > 0) {
          useAnalyzeResultStore.getState().openWithPlaces(items, {
            receivedAt: Date.now(),
          });
        }

        if (SharedStore?.clearLatestAnalyzeResult) {
          await SharedStore.clearLatestAnalyzeResult();
        }

        router.replace("/(tabs)/map");
      } catch {
        router.replace("/(tabs)/map");
      }
    };

    run();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
      }}
    >
      <ActivityIndicator />
      <Text style={{ marginTop: 12 }}>분석 결과를 불러오는 중...</Text>
    </View>
  );
}
