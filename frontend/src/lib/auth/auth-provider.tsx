"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { googleLoginAction, logoutAction, refreshAction, getAccessTokenAction } from "./actions";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (googleIdToken: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser: AuthUser | null }) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Hydrate from cookie on mount if no initialUser provided
  useEffect(() => {
    if (!initialUser) {
      try {
        const raw = document.cookie
          .split("; ")
          .find((c) => c.startsWith("sl_user="))
          ?.split("=")
          .slice(1)
          .join("=");
        if (raw) setUser(JSON.parse(decodeURIComponent(raw)));
      } catch {
        // no valid cookie
      }
    }
  }, [initialUser]);

  const login = useCallback(async (googleIdToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleLoginAction(googleIdToken);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUser(result.user);
      router.push("/live");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setUser(null);
    await logoutAction();
  }, []);

  const getToken = useCallback(async (): Promise<string> => {
    let token = await getAccessTokenAction();
    if (!token) {
      token = await refreshAction();
      if (!token) throw new Error("Not authenticated");
    }
    return token;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
