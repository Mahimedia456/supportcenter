import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@/types/workspace';
import { clearSession, loadSession, saveSession } from '@/lib/session';
import * as api from '@/lib/api';

type AuthValue = {
  session: Session | null;
  booting: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  ensureFreshSession: () => Promise<Session | null>;
};

const AuthContext = createContext<AuthValue | null>(null);

function expiresSoon(iso: string) {
  return new Date(iso).getTime() - Date.now() < 60_000;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  async function persist(next: Session | null) {
    if (next) {
      await saveSession(next);
      setSession(next);
    } else {
      await clearSession();
      setSession(null);
    }
  }

  async function refresh(current: Session): Promise<Session | null> {
    try {
      const next = await api.refreshSession(current.refreshToken);
      await persist(next);
      return next;
    } catch {
      await persist(null);
      return null;
    }
  }

  async function ensureFreshSession(): Promise<Session | null> {
    const current = session ?? (await loadSession());
    if (!current) return null;
    if (expiresSoon(current.accessTokenExpiresAt)) return refresh(current);

    try {
      await api.me(current.accessToken);
      if (!session) setSession(current);
      return current;
    } catch (error: any) {
      if (error?.status === 401) return refresh(current);
      if (!session) setSession(current);
      return current;
    }
  }

  useEffect(() => {
    (async () => {
      const stored = await loadSession();
      if (!stored) {
        setBooting(false);
        return;
      }
      setSession(stored);
      await ensureFreshSession();
      setBooting(false);
    })();
    // boot once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      booting,
      signIn: async (email, password) => {
        const next = await api.login(email, password);
        await persist(next);
      },
      signOut: async () => {
        const current = session;
        try {
          if (current) await api.logout(current.accessToken, current.refreshToken);
        } finally {
          await persist(null);
        }
      },
      ensureFreshSession,
    }),
    [session, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
