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
  isExtractTicketFailed,
  isExtractTicketVerified,
} from "@/src/lib/analyze/extractTicketStatus";
import {
  analyzeInstagramUrl,
  getExtractTicketStatus,
  forceVerifyExtractTicket,
} from "@/src/lib/api/analyze";
import { Colors } from "@/src/styles/Colors";
import { TextStyles } from "@/src/styles/TextStyles";

type SharedStoreModule = {
  clearPendingAnalyzeUrl?: () => Promise<void> | void;
  clearPendingAnalyzeTicketId?: () => Promise<void> | void;
};

type AnalyzeRewardGateModalProps = {
  sharedStore?: SharedStoreModule;
};

export default function AnalyzeRewardGateModal({
  sharedStore,
}: AnalyzeRewardGateModalProps) {
  const visible = useAnalyzeRewardGateStore((s) => s.visible);
  const pendingUrl = useAnalyzeRewardGateStore((s) => s.pendingUrl);
  const ticketId = useAnalyzeRewardGateStore((s) => s.ticketId);
  const loading = useAnalyzeRewardGateStore((s) => s.loading);
  const error = useAnalyzeRewardGateStore((s) => s.error);
  const clear = useAnalyzeRewardGateStore((s) => s.clear);
  const setLoading = useAnalyzeRewardGateStore((s) => s.setLoading);
  const setError = useAnalyzeRewardGateStore((s) => s.setError);

  const clearPending = async () => {
    await sharedStore?.clearPendingAnalyzeUrl?.();
    await sharedStore?.clearPendingAnalyzeTicketId?.();
    clear();
  };

  const handleCancel = () => {
    void clearPending();
  };

  const handleWatchAd = async () => {
    if (!pendingUrl || !ticketId || loading) return;

    setLoading(true);
    setError(null);

    try {
      const adResult = await showInstagramExtractRewardedInterstitial(ticketId);

      if (adResult.status !== "earned") {
        setLoading(false);
        setError("광고 시청이 완료되지 않았어요.");
        return;
      }

      if (__DEV__) {
        await forceVerifyExtractTicket(ticketId);
      }

      await waitForExtractTicketReady(ticketId);

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
          <Text style={styles.title}>
            무료 저장 기회를{"\n"}모두 사용했어요
          </Text>
          <Text style={styles.description}>
            광고를 시청하면 게시물 속 장소를{"\n"}한 번 더 저장할 수 있어요.
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
              <Text style={styles.primaryButtonText}>
                광고 보고 장소 저장하기
              </Text>
            )}
          </Pressable>

          <Pressable
            disabled={loading}
            onPress={handleCancel}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>나중에 하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForExtractTicketReady(ticketId: string) {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await getExtractTicketStatus(ticketId);

    if (isExtractTicketVerified(status)) return;
    if (isExtractTicketFailed(status)) {
      throw new Error("광고 보상 확인에 실패했어요.");
    }

    await delay(1_000);
  }

  throw new Error(
    "광고 보상 확인이 지연되고 있어요. 잠시 후 다시 시도해주세요.",
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 32,
    paddingHorizontal: 30,
    paddingTop: 58,
    paddingBottom: 44,
    backgroundColor: Colors.white,
  },
  title: {
    ...TextStyles.SemiBold24,
    color: Colors.gray_800,
    textAlign: "center",
  },
  description: {
    ...TextStyles.Medium14,
    marginTop: 22,
    color: Colors.gray_600,
    textAlign: "center",
  },
  error: {
    marginTop: 18,
    color: Colors.primary_600,
    fontFamily: "PretendardMedium",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  primaryButton: {
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 54,
    borderRadius: 14,
    backgroundColor: Colors.gray_700,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  primaryButtonText: {
    ...TextStyles.Bold16,
    color: Colors.white,
  },
  secondaryButton: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  secondaryButtonText: {
    ...TextStyles.Bold16,
    color: Colors.gray_300,
  },
});
