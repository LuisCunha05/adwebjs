"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { logout as logoutAction } from "@/app/actions/auth";
import { type Session } from "@/types/session";

type AuthState = {
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>; // kept for compatibility but might be no-op or reload
  setSessionFromLogin: (s: Session) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children, initialSession }: { children: React.ReactNode; initialSession: Session | null }) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [loading, setLoading] = useState(false);

  // Sync initialSession if it changes (e.g. revalidation)
  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  const logout = useCallback(async () => {
    try {
      await logoutAction();
    } catch {
      /* ignore */
    }
    setSession(null);
    window.location.href = "/login";
  }, []);

  const load = useCallback(async () => {
    // In server actions model, we reload the page or rely on router.refresh() 
    // updating the prop. But if we need client-side fetch, we could add getSession action call here.
    // For now, no-op or simple refresh.
    // let's leave as no-op or rely on prop update.
  }, []);

  const setSessionFromLogin = useCallback((s: Session) => {
    setSession(s);
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

