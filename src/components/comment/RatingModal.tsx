// src/components/comment/RatingModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  Image,
  StyleSheet,
  PanResponder,
} from "react-native";
import { TextStyles } from "../../styles/TextStyles";
import { Colors } from "../../styles/Colors";

type Props = {
  visible: boolean;
  value: number | null; // 1~5 or null
  onClose: () => void;
  onSelect: (rating: number) => void;
};

type RowRect = { x: number; y: number; w: number; h: number };

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export default function RatingModal({
  visible,
  value,
  onClose,
  onSelect,
}: Props) {
  // 드래그 중 UI 프리뷰 점수
  const [tempRating, setTempRating] = useState<number>(value ?? 0);

  // 별 row 화면 좌표
  const [rowRect, setRowRect] = useState<RowRect>({ x: 0, y: 0, w: 0, h: 0 });
  const starRowRef = useRef<View>(null);

  // 드래그 중인지(드래그가 overlay close에 간섭 안 주도록)
  const draggingRef = useRef(false);

  // 모달 열릴 때 기존 값 반영
  useEffect(() => {
    if (!visible) return;
    setTempRating(value ?? 0);

    // 레이아웃 안정화 후 measure
    requestAnimationFrame(() => {
      starRowRef.current?.measureInWindow((x, y, w, h) => {
        if (w > 0) setRowRect({ x, y, w, h });
      });
    });
  }, [visible, value]);

  const calcRatingFromMoveX = (moveX: number) => {
    const w = rowRect.w;
    if (!w) return 1;

    const localX = moveX - rowRect.x; // row 내부 x
    const ratio = localX / w; // 0~1 범위(밖으로 나가도 clamp로 처리)
    const raw = Math.ceil(ratio * 5);
    return clamp(raw, 1, 5);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt) => {
          draggingRef.current = true;

          // 혹시 measure가 아직이면 그 자리에서 한 번 더 시도
          if (!rowRect.w) {
            starRowRef.current?.measureInWindow((x, y, w, h) => {
              if (w > 0) setRowRect({ x, y, w, h });
            });
          }

          const moveX = evt.nativeEvent.pageX;
          const next = calcRatingFromMoveX(moveX);
          setTempRating(next);
        },

        onPanResponderMove: (_evt, gestureState) => {
          const next = calcRatingFromMoveX(gestureState.moveX);
          setTempRating(next);
        },

        onPanResponderRelease: () => {
          draggingRef.current = false;

          // release 시 확정
          const finalRating = clamp(tempRating || 1, 1, 5);
          onSelect(finalRating);
          onClose();
        },

        onPanResponderTerminate: () => {
          draggingRef.current = false;
          // terminate면 그냥 닫지 않고 유지(원하면 onClose로 바꿔도 됨)
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowRect.x, rowRect.w, tempRating, onClose, onSelect],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* overlay 탭 → 닫기 (드래그 중이면 무시) */}
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (draggingRef.current) return;
          onClose();
        }}
      >
        {/* 카드 영역은 눌러도 overlay onPress 안 타게 */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>
            방문한 장소의{"\n"}만족도를 알려주세요!
          </Text>

          {/* 별 row: 여기서 드래그로 점수 프리뷰 */}
          <View
            ref={starRowRef}
            style={styles.starRow}
            onLayout={() => {
              requestAnimationFrame(() => {
                starRowRef.current?.measureInWindow((x, y, w, h) => {
                  if (w > 0) setRowRect({ x, y, w, h });
                });
              });
            }}
            {...panResponder.panHandlers}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const rating = i + 1;
              const active = tempRating >= rating;

              return (
                <Pressable
                  key={rating}
                  onPress={() => {
                    // 탭으로도 선택 가능
                    onSelect(rating);
                    onClose();
                  }}
                  hitSlop={8}
                >
                  <Image
                    source={
                      active
                        ? require("@/assets/images/star-orange.png")
                        : require("@/assets/images/star-gray.png")
                    }
                    style={styles.star}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* 선택 표시(옵션) */}
          <Text style={styles.hintText}>{tempRating}/5</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 280,
    borderRadius: 18,
    backgroundColor: "white",
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  title: {
    ...TextStyles.Bold16,
    color: Colors.gray_800,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 18,
  },
  starRow: {
    flexDirection: "row",
    gap: 10,
  },
  star: {
    width: 34,
    height: 34,
  },
  hintText: {
    marginTop: 10,
    ...TextStyles.Regular12,
    color: Colors.gray_300,
  },
});
