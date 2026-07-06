import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAnalyzeResultStore } from "@/src/stores/useAnalyzeResultStore";
import { useAnalyzeRewardGateStore } from "@/src/stores/useAnalyzeRewardGateStore";
import { showInstagramExtractRewardedInterstitial } from "@/src/lib/ads/rewardedInterstitialAd";
import {
  isAnalyzeAdRequired,
  mapAnalyzeResponseToItems,
} from "@/src/lib/analyze/analyzeResult";
import {
  analyzeInstagramUrl,
  completeExtractScoreReward,
} from "@/src/lib/api/analyze";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

type SharedStoreModule = {
  clearPendingAnalyzeUrl?: () => Promise<void> | void;
};

type AnalyzeRewardGateModalProps = {
  sharedStore?: SharedStoreModule;
};

export default function AnalyzeRewardGateModal({
  sharedStore,
}: AnalyzeRewardGateModalProps) {
  const visible = useAnalyzeRewardGateStore((s) => s.visible);
  const pendingUrl = useAnalyzeRewardGateStore((s) => s.pendingUrl);
  const loading = useAnalyzeRewardGateStore((s) => s.loading);
  const error = useAnalyzeRewardGateStore((s) => s.error);
  const clear = useAnalyzeRewardGateStore((s) => s.clear);
  const setLoading = useAnalyzeRewardGateStore((s) => s.setLoading);
  const setError = useAnalyzeRewardGateStore((s) => s.setError);

  const clearPending = async () => {
    await sharedStore?.clearPendingAnalyzeUrl?.();
    clear();
  };

  const handleCancel = () => {
    void clearPending();
  };

  const handleWatchAd = async () => {
    if (!pendingUrl || loading) return;

    setLoading(true);
    setError(null);

    try {
      const adResult = await showInstagramExtractRewardedInterstitial();

      if (adResult.status !== "earned") {
        setLoading(false);
        setError("광고 시청이 완료되지 않았어요.");
        return;
      }

      await completeExtractScoreReward();

      const analyzeResult = await analyzeInstagramUrl(pendingUrl);

      if (isAnalyzeAdRequired(analyzeResult)) {
        setLoading(false);
        setError("아직 추가 저장 권한이 반영되지 않았어요.");
        return;
      }

      const items = mapAnalyzeResponseToItems(analyzeResult);

      if (!items.length) {
        throw new Error("분석 결과에 저장 가능한 장소가 없습니다.");
      }

      useAnalyzeResultStore.getState().openWithPlaces(items, {
        sourceUrl: pendingUrl,
        receivedAt: Date.now(),
      });

      await clearPending();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "광고 시청 후 저장을 이어가지 못했어요.";

      setLoading(false);
      setError(message);
      Alert.alert("오류", message);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={[TextStyles.Bold24, styles.title]}>
            무료 저장 횟수를 모두 사용했어요
          </Text>
          <Text style={[TextStyles.Medium14, styles.description]}>
            광고를 시청하면 게시물 속 장소를 한번 더 저장할 수 있어요.
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            disabled={loading}
            onPress={handleWatchAd}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || loading) && styles.buttonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={[TextStyles.Bold16, styles.primaryButtonText]}>
                광고 보고 저장 계속하기
              </Text>
            )}
          </Pressable>

          <Pressable
            disabled={loading}
            onPress={handleCancel}
            style={styles.secondaryButton}
          >
            <Text style={[TextStyles.Bold16, styles.secondaryButtonText]}>
              나중에 하기
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 24,
    backgroundColor: Colors.white,
  },
  title: {
    color: Colors.gray_900,
    textAlign: "center",
  },
  description: {
    marginTop: 10,
    color: Colors.gray_600,
    textAlign: "center",
  },
  error: {
    marginTop: 12,
    color: Colors.primary_600,
    fontFamily: "PretendardMedium",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  primaryButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    borderRadius: 10,
    backgroundColor: Colors.primary_500,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: Colors.white,
  },
  secondaryButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  secondaryButtonText: {
    color: Colors.gray_500,
  },
});
