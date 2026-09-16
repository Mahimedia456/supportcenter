
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getZendeskDbSnapshot,
  syncZendeskDb,
  type ZendeskDbSnapshot,
} from '@/lib/zendesk-db';

type State = {
  snapshot: ZendeskDbSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  hydrated: boolean;
};

let state: State = {
  snapshot: null,
  loading: false,
  refreshing: false,
  error: '',
  hydrated: false,
};

const listeners = new Set<() => void>();
let inflight: Promise<ZendeskDbSnapshot | null> | null = null;
const STORAGE_KEY = 'support-command-center:global-90day-snapshot';

function emit() {
  listeners.forEach((listener) => listener());
}

function patch(next: Partial<State>) {
  state = { ...state, ...next };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

async function persist(snapshot: ZendeskDbSnapshot) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {}
}

export async function hydrateSupportSnapshot() {
  if (state.hydrated) return state.snapshot;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ZendeskDbSnapshot;
      if (parsed && Array.isArray(parsed.tickets)) {
        patch({ snapshot: parsed, hydrated: true });
        return parsed;
      }
    }
  } catch {}

  patch({ hydrated: true });
  return null;
}

export async function loadSupportSnapshot(token: string, force = false) {
  await hydrateSupportSnapshot();

  if (!force && state.snapshot) return state.snapshot;
  if (inflight) return inflight;

  patch({ loading: !state.snapshot, error: '' });

  inflight = (async () => {
    try {
      const snapshot = await getZendeskDbSnapshot(token, { force: true });
      patch({ snapshot, loading: false, error: '' });
      await persist(snapshot);
      return snapshot;
    } catch (error: any) {
      patch({
        loading: false,
        error: error?.message || 'Unable to load support snapshot.',
      });
      return state.snapshot;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function refreshSupportSnapshot(token: string) {
  patch({ refreshing: true, error: '' });

  try {
    const snapshot = await syncZendeskDb(token);
    patch({
      snapshot,
      refreshing: false,
      error: '',
      hydrated: true,
    });
    await persist(snapshot);
    return snapshot;
  } catch (error: any) {
    patch({
      refreshing: false,
      error: error?.message || 'Unable to refresh support data.',
    });
    throw error;
  }
}

export function seedSupportSnapshot(snapshot: ZendeskDbSnapshot | null) {
  if (!snapshot) return;
  patch({ snapshot, hydrated: true });
  void persist(snapshot);
}

export function useSupportDataStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
