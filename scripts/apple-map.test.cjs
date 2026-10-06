const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { createLoader } = require("./lib/load-typescript.cjs");

const { buildAppleMapLink } = createLoader()("src/lib/maps/appleMapLink");
const place = {
  name: "성수 카페 & A/B #1",
  address: "서울 성동구 성수동",
  lat: 37.5445,
  lng: 127.0557,
};

test("Apple Maps shows the selected place with an encoded Korean label", () => {
  const url = new URL(buildAppleMapLink(place));
  assert.equal(url.origin, "https://maps.apple.com");
  assert.equal(url.searchParams.get("ll"), "37.5445,127.0557");
  assert.equal(url.searchParams.get("q"), place.name);
  assert.equal(url.hash, "");
  assert.equal(url.searchParams.has("daddr"), false);
  assert.equal(url.searchParams.has("saddr"), false);
});

test("zero, negative and boundary coordinates are valid pin locations", () => {
  for (const [lat, lng] of [[0, 0], [-33.86, 151.2], [90, -180], [-90, 180]]) {
    const url = new URL(buildAppleMapLink({ ...place, lat, lng }));
    assert.equal(url.searchParams.get("ll"), `${lat},${lng}`);
  }
});

test("missing or invalid coordinates search the name and address instead", () => {
  for (const coords of [
    { lat: undefined },
    { lng: undefined },
    { lat: null },
    { lat: "" },
    { lat: "37.5" },
    { lat: NaN },
    { lng: Infinity },
    { lat: 91 },
    { lat: -91 },
    { lng: 181 },
    { lng: -181 },
  ]) {
    const url = new URL(buildAppleMapLink({ ...place, ...coords }));
    assert.equal(url.searchParams.has("ll"), false);
    assert.equal(url.searchParams.get("q"), `${place.name} ${place.address}`);
  }
});

test("search fallback trims empty addresses without adding whitespace", () => {
  const url = new URL(buildAppleMapLink({ name: "  카페  ", address: "  " }));
  assert.equal(url.searchParams.get("q"), "카페");
});

test("Apple Maps opens the link without installation or location permission checks", async () => {
  const opened = [];
  const { openAppleMap } = createLoader({
    "react-native": {
      Linking: { openURL: async (url) => opened.push(url) },
      Alert: { alert: () => assert.fail("unexpected alert") },
    },
  })("src/utils/openAppleMap");

  await openAppleMap(place);
  assert.deepEqual(opened, [buildAppleMapLink(place)]);
});

test("Apple Maps launch errors produce a user alert without an unhandled rejection", async () => {
  const alerts = [];
  const { openAppleMap } = createLoader({
    "react-native": {
      Linking: { openURL: async () => { throw new Error("cannot open maps"); } },
      Alert: { alert: (...args) => alerts.push(args) },
    },
  })("src/utils/openAppleMap");

  await openAppleMap(place);
  assert.deepEqual(alerts, [["오류", "Apple 지도를 열지 못했어요."]]);
});

// Evaluate the real card and its handlers without loading native modules in Node.
function renderCard(platform, props = {}) {
  const calls = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (initial) => [initial, () => {}],
  };
  const mocks = {
    react,
    "react-native": {
      ...Object.fromEntries(["View", "Text", "Image", "ScrollView", "Pressable", "Modal"].map(name => [name, name])),
      StyleSheet: { create: (styles) => styles },
      Platform: { OS: platform },
    },
    "@/src/utils/openAppleMap": { openAppleMap: (target) => calls.push(["apple", target]) },
    "@/src/utils/openNaverMap": { openNaverMap: (name) => calls.push(["naver", name]) },
  };
  const load = createLoader(mocks);
  const source = fs.readFileSync(path.join(__dirname, "../src/components/common/PlaceCard.tsx"), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: "PlaceCard.tsx",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  const requireCard = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith("@/assets/")) return 1;
    if (id.startsWith("@/")) return load(id.slice(2));
    throw Error(`Unexpected card dependency: ${id}`);
  };
  new Function("require", "module", "exports", compiled)(requireCard, mod, mod.exports);
  const tree = mod.exports.default({ ...place, category: "cafe", images: [], showDirectionButton: true, ...props });
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    nodes.push(node);
    node.children?.forEach(visit);
  }
  visit(tree);
  return { nodes, calls };
}

test("iOS map buttons are ordered Apple then Naver and stop the card tap", () => {
  const { nodes, calls } = renderCard("ios", { onPress: () => assert.fail("card navigation") });
  const buttons = nodes.filter(node => node.props?.accessibilityRole === "button");
  assert.deepEqual(buttons.map(button => button.props.accessibilityLabel), [
    `${place.name}, Apple 지도로 열기`,
    `${place.name}, 네이버 지도로 열기`,
  ]);
  let stopped = 0;
  const event = { stopPropagation: () => stopped++ };
  buttons[0].props.onPress(event);
  buttons[1].props.onPress(event);
  assert.equal(stopped, 2);
  assert.deepEqual(calls, [["apple", place], ["naver", place.name]]);
});

test("Android keeps one Naver button and its existing label", () => {
  const { nodes } = renderCard("android");
  const buttons = nodes.filter(node => node.props?.accessibilityRole === "button");
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].props.accessibilityLabel, `${place.name}, 네이버 지도 길찾기`);
  assert.ok(nodes.some(node => node.type === "Text" && node.children.includes("네이버 지도 길찾기")));
});

test("cards with directions disabled keep both map buttons hidden", () => {
  const { nodes } = renderCard("ios", { showDirectionButton: false });
  assert.equal(nodes.filter(node => node.props?.accessibilityRole === "button").length, 0);
});
