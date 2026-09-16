
import { useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  hydrateSupportSnapshot,
  loadSupportSnapshot,
  refreshSupportSnapshot,
  useSupportDataStore,
} from '@/lib/support-data-store';

export function useGlobalSupportSnapshot() {
  const { session, ensureFreshSession } = useAuth();
  const store = useSupportDataStore();

  const getToken = useCallback(async () => {
    const fresh = await ensureFreshSession();
    return fresh?.accessToken || session?.accessToken || '';
  }, [ensureFreshSession, session?.accessToken]);

  useEffect(() => {
    let active = true;

    (async () => {
      await hydrateSupportSnapshot();
      if (!active) return;

      const token = await getToken();
      if (!token) return;

      await loadSupportSnapshot(token, false);
    })();

    return () => {
      active = false;
    };
  }, [getToken]);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    await refreshSupportSnapshot(token);
  }, [getToken]);

  return { ...store, refresh };
}
