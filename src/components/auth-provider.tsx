"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { logout as logoutAction } from "@/actions/auth";
import { type Session } from "@/types/session";

type AuthState = {
  session: Session | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children, initialSession }: { children: React.ReactNode; initialSession: Session | null }) {
  const [session, setSession] = useState<Session | null>(initialSession);

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

  return (
    <AuthContext.Provider value={{ session, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

