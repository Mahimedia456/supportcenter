import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'scc:cache:v1:';
const META_PREFIX = 'scc:cachemeta:v1:';

export type CacheMeta = {
  key: string;
  savedAt: string;
  expiresAt: string;
  source: 'network' | 'stale-cache';
};

type Envelope<T> = {
  data: T;
  savedAt: number;
  expiresAt: number;
};

function dataKey(key: string) {
  return `${PREFIX}${key}`;
}

function metaKey(key: string) {
  return `${META_PREFIX}${key}`;
}

export async function cacheSet<T>(
  key: string,
  data: T,
  ttlMs: number,
) {
  const now = Date.now();

  const envelope: Envelope<T> = {
    data,
    savedAt: now,
    expiresAt: now + ttlMs,
  };

  await AsyncStorage.multiSet([
    [dataKey(key), JSON.stringify(envelope)],
    [
      metaKey(key),
      JSON.stringify({
        key,
        savedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + ttlMs).toISOString(),
        source: 'network',
      } satisfies CacheMeta),
    ],
  ]);
}

export async function cacheGet<T>(
  key: string,
  allowStale = false,
): Promise<{
  hit: boolean;
  stale: boolean;
  data?: T;
  savedAt?: number;
  expiresAt?: number;
}> {
  const raw = await AsyncStorage.getItem(dataKey(key));

  if (!raw) {
    return { hit: false, stale: false };
  }

  try {
    const parsed = JSON.parse(raw) as Envelope<T>;
    const stale = Date.now() > parsed.expiresAt;

    if (stale && !allowStale) {
      return {
        hit: false,
        stale: true,
        savedAt: parsed.savedAt,
        expiresAt: parsed.expiresAt,
      };
    }

    return {
      hit: true,
      stale,
      data: parsed.data,
      savedAt: parsed.savedAt,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    await AsyncStorage.removeItem(dataKey(key));
    return { hit: false, stale: false };
  }
}

export async function markStaleFallback(key: string) {
  const raw = await AsyncStorage.getItem(metaKey(key));

  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as CacheMeta;

    await AsyncStorage.setItem(
      metaKey(key),
      JSON.stringify({
        ...parsed,
        source: 'stale-cache',
      } satisfies CacheMeta),
    );
  } catch {
    // Ignore malformed metadata.
  }
}

export async function cacheSummary() {
  const keys = await AsyncStorage.getAllKeys();
  const metaKeys = keys.filter((key) =>
    key.startsWith(META_PREFIX),
  );

  if (!metaKeys.length) {
    return {
      count: 0,
      latestSavedAt: null as string | null,
      oldestSavedAt: null as string | null,
      staleFallbacks: 0,
      items: [] as CacheMeta[],
    };
  }

  const rows = await AsyncStorage.multiGet(metaKeys);

  const items = rows
    .map(([, value]) => {
      try {
        return value
          ? (JSON.parse(value) as CacheMeta)
          : null;
      } catch {
        return null;
      }
    })
    .filter((value): value is CacheMeta => Boolean(value))
    .sort(
      (a, b) =>
        new Date(b.savedAt).getTime() -
        new Date(a.savedAt).getTime(),
    );

  return {
    count: items.length,
    latestSavedAt: items[0]?.savedAt || null,
    oldestSavedAt:
      items[items.length - 1]?.savedAt || null,
    staleFallbacks: items.filter(
      (item) => item.source === 'stale-cache',
    ).length,
    items,
  };
}

export async function clearSupportCache() {
  const keys = await AsyncStorage.getAllKeys();

  const target = keys.filter(
    (key) =>
      key.startsWith(PREFIX) ||
      key.startsWith(META_PREFIX),
  );

  if (target.length) {
    await AsyncStorage.multiRemove(target);
  }

  return target.length;
}

export function freshnessLabel(savedAt?: string | null) {
  if (!savedAt) return 'No cached data yet';

  const diff = Math.max(
    0,
    Date.now() - new Date(savedAt).getTime(),
  );

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `Updated ${hours}h ago`;

  return `Updated ${Math.floor(hours / 24)}d ago`;
}
