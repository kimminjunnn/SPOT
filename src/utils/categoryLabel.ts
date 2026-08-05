// src/utils/categoryLabel.ts

// 서버에서 내려오는 list 코드 -> 화면 표시 라벨
// (모르는 값은 그대로 노출)
export function getCategoryLabel(list?: string | null): string {
  if (!list) return "";

  // 이미 한글 라벨로 오면 그대로
  if (
    list === "음식점" ||
    list === "술집" ||
    list === "전시회" ||
    list === "카페" ||
    list === "디저트" ||
    list === "소품샵" ||
    list === "체험" ||
    list === "옷가게" ||
    list === "기타"
  ) {
    return list;
  }

  const key = String(list).trim().toLowerCase();

  switch (key) {
    case "restaurant":
      return "음식점";
    case "bar":
      return "술집";
    case "cafe":
      return "카페";

    // 전시회
    case "exhibition":
    case "exhibit":
    case "gallery":
    case "museum":
      return "전시회";

    // 디저트
    case "dessert":
    case "bakery":
      return "디저트";

    // 소품샵
    case "prop_shop":
    case "propshop":
    case "goods":
    case "goods_shop":
    case "gift":
    case "giftshop":
    case "gift_shop":
    case "souvenir":
    case "souvenir_shop":
    case "shop":
      return "소품샵";

    // 옷가게
    case "clothing_store":
    case "clothing":
    case "clothes":
    case "fashion":
    case "fashion_store":
      return "옷가게";

    // 체험
    case "experience":
    case "activity":
    case "class":
    case "workshop":
      return "체험";

    // 기타
    case "etc":
    case "other":
      return "기타";

    default:
      return list;
  }
}
