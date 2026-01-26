"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { auth, type Session } from "@/lib/api";

type AuthState = {
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  setSessionFromLogin: (s: Session) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const s = await auth.me();
      setSession(s);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      /* ignore */
    }
    setSession(null);
    window.location.href = "/login";
  }, []);

  const setSessionFromLogin = useCallback((s: Session) => {
    setSession(s);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, logout, refetch: load, setSessionFromLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
