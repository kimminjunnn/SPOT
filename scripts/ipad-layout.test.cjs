const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

const read = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

test("Expo and both native targets remain iPhone-only", () => {
  const appConfig = JSON.parse(read("app.json"));
  const project = read("ios/SPOT.xcodeproj/project.pbxproj");

  assert.equal(appConfig.expo.ios.supportsTablet, false);
  assert.doesNotMatch(project, /TARGETED_DEVICE_FAMILY = "1,2";/);
  assert.equal(
    [...project.matchAll(/TARGETED_DEVICE_FAMILY = 1;/g)].length,
    4,
  );
  assert.doesNotMatch(project, /IPHONEOS_DEPLOYMENT_TARGET = 26\.2;/);
  const deploymentTargets = [
    ...project.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = ([^;]+);/g),
  ].map((match) => match[1]);
  assert.ok(deploymentTargets.length >= 4);
  assert.deepEqual(new Set(deploymentTargets), new Set(["15.1"]));
});

test("native iPad compatibility orientation follows the portrait app config", () => {
  const infoPlist = read("ios/SPOT/Info.plist");
  const ipadOrientations = infoPlist.match(
    /<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>([\s\S]*?)<\/array>/,
  );

  assert.ok(ipadOrientations);
  assert.match(ipadOrientations[1], /UIInterfaceOrientationPortrait/);
  assert.doesNotMatch(ipadOrientations[1], /UIInterfaceOrientationLandscape/);
});

test("responsive screens do not cache the initial window width", () => {
  const sources = [
    "app/place/[placeId].tsx",
    "src/components/comment/CommentBottomSheet.tsx",
  ].map(read);

  for (const source of sources) {
    assert.doesNotMatch(source, /Dimensions\.get\(["']window["']\)/);
  }

  assert.match(sources[0], /useWindowDimensions/);
});

test("compact-height screens scroll while preserving the phone design ratio", () => {
  const login = read("app/login.tsx");
  const settings = read("app/profile/setting.tsx");
  const profileLayout = read("src/components/profile/Layout.tsx");

  assert.match(login, /<ScrollView/);
  assert.match(login, /useWindowDimensions/);
  assert.match(login, /Math\.min\(windowWidth, FORM_MAX_WIDTH\)/);
  assert.match(login, /canvasWidth \/ 375/);
  assert.match(login, /812 \* canvasScale/);
  assert.match(login, /width: 410/);
  assert.match(login, /height: 453/);
  assert.match(login, /top: 624\.6/);
  assert.match(login, /gap: 12/);
  assert.doesNotMatch(login, /LinearGradient|bottomGradient/);
  assert.match(settings, /<ScrollView/);
  assert.match(profileLayout, /maxWidth: CONTENT_MAX_WIDTH/);
});

test("share extension stays readable if presented in a wide compatibility surface", () => {
  const shareController = read("ios/SpotShare/ShareViewController.swift");

  assert.match(shareController, /lessThanOrEqualToConstant: 540/);
  assert.match(
    shareController,
    /iconView\.topAnchor\.constraint\(equalTo: sheetView\.topAnchor, constant: 48\)/,
  );
});

test("the app and share extension ship with the same short version", () => {
  const appInfoPlist = read("ios/SPOT/Info.plist");
  const shareInfoPlist = read("ios/SpotShare/Info.plist");
  const project = read("ios/SPOT.xcodeproj/project.pbxproj");
  const appVersion = appInfoPlist.match(
    /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/,
  );

  assert.ok(appVersion);
  assert.match(
    shareInfoPlist,
    /<key>CFBundleShortVersionString<\/key>\s*<string>\$\(MARKETING_VERSION\)<\/string>/,
  );

  const marketingVersions = [
    ...project.matchAll(/MARKETING_VERSION = ([^;]+);/g),
  ].map((match) => match[1]);

  assert.equal(marketingVersions.length, 4);
  assert.deepEqual(new Set(marketingVersions), new Set([appVersion[1]]));
});
