const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createLoader, root } = require('./lib/load-typescript.cjs');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = () => new Promise(setImmediate);
const coords = { lat: 37.5, lng: 127 };
const rawPlace = { placeId: 1, gId: 'gid', name: 'Cafe', latitude: 37.5, longitude: 127, photo: [' a ', null, ''], list: 'cafe' };

for (const file of fs.readdirSync(path.join(root, 'src/lib'), { recursive: true }).filter(f => f.endsWith('.test.ts'))) {
  test(`existing: ${file}`, () => createLoader()(`src/lib/${file}`));
}

test('single flight shares pending work, separates keys, retries rejection and synchronous throws', async () => {
  const { createSingleFlight } = createLoader()('src/lib/singleFlight');
  const run = createSingleFlight();
  const pending = deferred();
  const first = run('a', () => pending.promise);
  assert.equal(first, run('a', () => assert.fail('duplicate')));
  assert.equal(await run('b', async () => 2), 2);
  pending.resolve(1);
  assert.equal(await first, 1);
  assert.equal(await run('a', async () => 3), 3);
  await assert.rejects(run('a', async () => { throw Error('network'); }));
  await assert.rejects(run('a', () => { throw Error('sync'); }));
  assert.equal(await run('a', async () => 4), 4);
});

test('map/list share one request; new coordinates, auth, revisions and settled reads stay independent', async () => {
  let calls = 0, token = 'a';
  const pending = deferred();
  const load = createLoader({
    '@/src/lib/api/client': { api8001: { get: () => { calls++; return pending.promise; } } },
    '@/src/stores/useAuthStore': { useAuthStore: { getState: () => ({ token }) } },
  });
  const api = load('src/lib/api/places');
  const refresh = load('src/lib/savedPlacesRefresh');
  const reads = [api.fetchMapPlaces({ latitude: coords.lat, longitude: coords.lng }), api.fetchMyNewSavedPlaces(coords)];
  await flush();
  assert.equal(calls, 1);
  reads.push(api.fetchMyNewSavedPlaces({ ...coords, lng: 128 }));
  token = 'b';
  reads.push(api.fetchMyNewSavedPlaces(coords));
  refresh.requestSavedPlacesRefresh();
  reads.push(api.fetchMyNewSavedPlaces(coords));
  await flush();
  assert.equal(calls, 4);
  pending.resolve({ data: [rawPlace] });
  const [pins, places] = await Promise.all(reads);
  assert.equal(pins[0].gid, 'gid');
  assert.deepEqual(places[0].thumbnails, ['a']);
  await api.fetchMyNewSavedPlaces(coords);
  assert.equal(calls, 5);
});

test('location shares concurrent permission and GPS calls, preserves equal coordinates, retries failures', async () => {
  let permissions = 0, positions = 0, fail = false;
  const load = createLoader({ 'expo-location': {
    Accuracy: { Balanced: 3 },
    requestForegroundPermissionsAsync: async () => { permissions++; return { status: 'granted' }; },
    getCurrentPositionAsync: async () => { positions++; if (fail) throw Error('gps'); return { coords: { latitude: coords.lat, longitude: coords.lng } }; },
  } });
  const store = load('src/stores/useLocationStore').useLocationStore;
  await Promise.all(Array.from({ length: 3 }, () => store.getState().refreshOnce()));
  assert.equal(permissions, 1);
  assert.equal(positions, 1);
  const previous = store.getState().coords;
  await store.getState().refreshOnce();
  assert.equal(positions, 2);
  assert.equal(store.getState().coords, previous);
  fail = true;
  await assert.rejects(store.getState().refreshOnce());
  fail = false;
  await store.getState().refreshOnce();
  assert.equal(positions, 4);
});

test('denied location permission does not call GPS', async () => {
  const load = createLoader({ 'expo-location': {
    requestForegroundPermissionsAsync: async () => ({ status: 'denied' }),
    getCurrentPositionAsync: () => assert.fail('GPS after denial'),
  } });
  await load('src/stores/useLocationStore').useLocationStore.getState().refreshOnce();
});

for (const [module, listKey, action] of [
  ['useHotPlacesStore', 'hotList', 'applyHotBookmarkFromPlace'],
  ['useSavedPlacesStore', 'savedList', 'applyBookmarkFromPlace'],
]) {
  test(`${module}: no-op updates emit zero notifications; changed items preserve other references`, () => {
    const load = createLoader({ '@/src/lib/api/places': {}, '../lib/api/places': {} });
    const store = load(`src/stores/${module}`)[module];
    const places = [{ placeId: 1, isBookmarked: true }, { placeId: 2, isBookmarked: false }];
    store.setState({ [listKey]: places });
    let notifications = 0;
    store.subscribe(() => notifications++);
    for (let i = 0; i < 100; i++) store.getState()[action](places[0], true);
    assert.equal(notifications, 0);
    store.getState()[action](places[0], false);
    assert.equal(notifications, 1);
    assert.equal(store.getState()[listKey][1], places[1]);
    assert.equal(places[0].isBookmarked, true);
    store.getState()[action]({ placeId: 3 }, false);
    assert.equal(notifications, 1);
    if (module === 'useSavedPlacesStore') {
      store.getState()[action]({ placeId: 3 }, true);
      assert.equal(store.getState()[listKey][0].placeId, 3);
    }
  });
}

test('photo normalization matches previous output for mixed, nested, duplicate and sparse values', () => {
  const normalize = createLoader()('src/lib/mappers/normalizePhotoList').normalizePhotoList;
  const old = (...sources) => sources.flatMap(s => Array.isArray(s) ? s : [s]).filter(p => typeof p === 'string').map(p => p.trim()).filter(Boolean);
  for (const values of [[], [null, undefined, 1], [' a ', ['b', '', null, ' a ']], [[['nested'], 'x']], [new Array(10)]]) {
    assert.deepEqual(normalize(...values), old(...values));
  }
});

for (const [module, apiPath, fetchName, value] of [
  ['useRecentSearchStore', 'recentSearch', 'fetchRecentSearches', { id: 2, keyword: 'new' }],
  ['useRecentFriendSearchStore', 'recentFriendSearch', 'fetchRecentFriendSearches', { recent_search_id: 2, display_text: 'new' }],
]) {
  test(`${module}: stale responses cannot clear loading or replace newer results`, async () => {
    const first = deferred(), second = deferred();
    let calls = 0;
    const load = createLoader({ [`@/src/lib/api/${apiPath}`]: { [fetchName]: () => (++calls === 1 ? first : second).promise } });
    const store = load(`src/stores/${module}`)[module];
    const a = store.getState().fetch(), b = store.getState().fetch();
    first.resolve([]);
    await a;
    assert.equal(store.getState().loading, true);
    second.resolve([value]);
    await b;
    assert.equal(store.getState().items[0].keyword, 'new');
    assert.equal(store.getState().loading, false);
  });
}

test('map effect replay commits the active result after the first setup is cancelled', async () => {
  const effects = [], refs = [];
  let refIndex = 0, rendered;
  const pending = deferred();
  const load = createLoader({
    react: {
      useEffect: effect => effects.push(effect),
      useRef: value => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
      useState: () => [[], value => { rendered = value; }],
      useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    },
    '@/src/lib/api/places': { fetchMapPlaces: () => pending.promise },
  });
  load('src/hooks/map/useLoadMapPlaces').useLoadMapPlaces(coords);
  effects[0]()(); // First setup and immediate cleanup, as in Strict Mode.
  const cleanup = effects[0]();
  pending.resolve([rawPlace]);
  await flush();
  assert.deepEqual(rendered, [rawPlace]);
  cleanup();
});

test('saved places retry after blur during fetch and finish loading on refocus', async () => {
  let focusEffect;
  const pending = deferred();
  const state = { savedList: [], savedLoading: false, savedError: null };
  const setters = {
    setSavedList: value => { state.savedList = value; },
    setSavedLoading: value => { state.savedLoading = value; },
    setSavedError: value => { state.savedError = value; },
  };
  const location = selector => selector({ refreshOnce: async () => {} });
  location.getState = () => ({ coords });
  const load = createLoader({
    react: { useCallback: f => f, useRef: value => ({ current: value }), useSyncExternalStore: (_s, get) => get() },
    '@react-navigation/native': { useFocusEffect: effect => { focusEffect = effect; } },
    '@/src/stores/useLocationStore': { useLocationStore: location },
    '@/src/stores/useSavedPlacesStore': { useSavedPlacesStore: selector => selector(setters) },
    '@/src/lib/api/places': { fetchMyNewSavedPlaces: () => pending.promise },
  });
  load('src/hooks/map/useLoadSavedPlacesOnFocus').useLoadSavedPlacesOnFocus();
  const blur = focusEffect();
  await flush();
  assert.equal(state.savedLoading, true);
  blur();
  const cleanup = focusEffect();
  pending.resolve([rawPlace]);
  await flush();
  assert.deepEqual(state.savedList, [rawPlace]);
  assert.equal(state.savedLoading, false);
  cleanup();
});

test('search cleanup aborts its own transport signal without publishing late results', async () => {
  const effects = [];
  let signal, results = 0;
  const pending = deferred();
  const state = { query: 'cafe', items: [], setLoading() {}, setResult() { results++; }, setError() { assert.fail('stale error'); } };
  const location = selector => selector({ refreshOnce: async () => {} });
  location.getState = () => ({ coords });
  const load = createLoader({
    react: { useEffect: f => effects.push(f) },
    '@/src/stores/useSearchStore': { useSearchStore: selector => selector(state) },
    '@/src/stores/useLocationStore': { useLocationStore: location },
    '@/src/lib/api/search': { fetchSearchDetails: (_params, options) => { signal = options.signal; return pending.promise; } },
  });
  load('src/hooks/map/useSearchPlaces').useSearchPlaces({ current: null }, coords);
  const cleanup = effects[0]();
  assert.equal(signal.aborted, false);
  cleanup();
  assert.equal(signal.aborted, true);
  pending.resolve([]);
  await flush();
  assert.equal(results, 0);
});

test('search leaves loading with an error when location cannot be resolved', async () => {
  const effects = [];
  let phase = 'idle', apiCalls = 0;
  const state = {
    query: 'cafe',
    items: [],
    setLoading() { phase = 'loading'; },
    setResult() { assert.fail('result without location'); },
    setError() { phase = 'error'; },
  };
  const location = selector => selector({ refreshOnce: async () => {} });
  location.getState = () => ({ coords: null });
  const load = createLoader({
    react: { useEffect: f => effects.push(f) },
    '@/src/stores/useSearchStore': { useSearchStore: selector => selector(state) },
    '@/src/stores/useLocationStore': { useLocationStore: location },
    '@/src/lib/api/search': { fetchSearchDetails: () => { apiCalls++; return Promise.resolve([]); } },
  });

  load('src/hooks/map/useSearchPlaces').useSearchPlaces(
    { current: null },
    { lat: null, lng: null },
  );
  effects[0]();
  await flush();

  assert.equal(apiCalls, 0);
  assert.equal(phase, 'error');
});
