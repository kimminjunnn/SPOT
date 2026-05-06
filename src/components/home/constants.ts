export const HOME_TABS = [
  { key: "map", label: "지도" },
  { key: "place", label: "장소" },
  // { key: "comment", label: "코멘트" },
] as const;
// as const를 쓰면 배열/객체의 값이 바뀌지 않는 상수로 취급되고,
// "map" 같은 값도 string이 아니라 리터럴 타입으로 정확히 추론된다.

// 홈 화면 기본 상수
export const HOME_DISTANCE = 1000;
