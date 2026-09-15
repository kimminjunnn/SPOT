const { execFileSync } = require('node:child_process');
const { createLoader, root } = require('./lib/load-typescript.cjs');
const baseline = process.argv[2];
if (!baseline) throw new Error('Usage: node scripts/benchmark-optimizations.cjs <baseline-git-ref>');
const baselineCommit = execFileSync('git', ['rev-parse', baseline], { cwd: root, encoding: 'utf8' }).trim();
async function measure(revision) {
  let savedRequests = 0, permissions = 0, positions = 0;
  const load = createLoader({
    '@/src/lib/api/client': { api8001: { get: async () => { savedRequests++; return { data: [] }; } } },
    '@/src/stores/useAuthStore': { useAuthStore: { getState: () => ({ token: 'test-session' }) } },
    'expo-location': {
      Accuracy: { Balanced: 3 },
      requestForegroundPermissionsAsync: async () => { permissions++; return { status: 'granted' }; },
      getCurrentPositionAsync: async () => { positions++; return { coords: { latitude: 37.5, longitude: 127 } }; },
    },
  }, revision);
  const api = load('src/lib/api/places');
  const log = console.log;
  try {
    console.log = () => {}; // Baseline logs contain mocked API payloads.
    await Promise.all([api.fetchMapPlaces({ latitude: 37.5, longitude: 127 }), api.fetchMyNewSavedPlaces({ lat: 37.5, lng: 127 })]);
  } finally { console.log = log; }
  const location = load('src/stores/useLocationStore').useLocationStore;
  await Promise.all(Array.from({ length: 3 }, () => location.getState().refreshOnce()));
  const hot = load('src/stores/useHotPlacesStore').useHotPlacesStore;
  const places = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), placeId: i, isBookmarked: true }));
  hot.setState({ hotList: places });
  let bookmarkNotifications = 0;
  hot.subscribe(() => bookmarkNotifications++);
  for (let i = 0; i < 100; i++) hot.getState().applyHotBookmarkFromPlace(places[500], true);
  return { savedRequests, permissions, positions, bookmarkNotifications };
}
(async () => {
  const before = await measure(baselineCommit), after = await measure();
  console.log(JSON.stringify({
    baselineCommit,
    runtime: process.version,
    platform: `${process.platform}/${process.arch}`,
    method: 'Actual baseline/current modules with mocked HTTP/GPS; 2 concurrent saved-place reads, 3 concurrent location reads, 100 unchanged bookmarks on 1000 places. Counts only; not device latency.',
    before, after,
    reductionPercent: Object.fromEntries(Object.keys(before).map(key => [key, (before[key] - after[key]) / before[key] * 100])),
  }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
