import { useEffect } from "react";
import { ActivityIndicator, NativeModules, Text, View } from "react-native";
import { router } from "expo-router";

import { useAnalyzeResultStore } from "@/src/stores/useAnalyzeResultStore";
import {
  mapAnalyzeResponseToItems,
  parseAnalyzeJson,
} from "@/src/lib/analyze/analyzeResult";

let consumeAnalyzeResultsPromise: Promise<void> | null = null;

async function consumeAnalyzeResults() {
  if (consumeAnalyzeResultsPromise) return consumeAnalyzeResultsPromise;

  const operation = (async () => {
    const { SharedStore } = NativeModules;

    if (!SharedStore?.getLatestAnalyzeResult) return;

    // 비정상 네이티브 데이터로 무한 반복하지 않도록 한 번에 처리할 상한을 둔다.
    for (let index = 0; index < 100; index += 1) {
      const json = await SharedStore.getLatestAnalyzeResult();
      if (!json) break;

      try {
        const items = mapAnalyzeResponseToItems(parseAnalyzeJson(json));

        if (items.length > 0) {
          useAnalyzeResultStore.getState().openWithPlaces(items, {
            receivedAt: Date.now(),
          });
        }
      } catch (error) {
        console.warn("[AnalyzeResult] invalid queued result:", error);
      } finally {
        if (!SharedStore?.clearLatestAnalyzeResult) break;
        await SharedStore.clearLatestAnalyzeResult();
      }
    }
  })();

  consumeAnalyzeResultsPromise = operation;

  try {
    await operation;
  } finally {
    consumeAnalyzeResultsPromise = null;
  }
}

export default function AnalyzeResultPage() {
  useEffect(() => {
    const run = async () => {
      try {
        await consumeAnalyzeResults();
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
