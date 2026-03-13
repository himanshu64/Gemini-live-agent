"use client";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, signInAnonymously, getIdToken } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  uid: string | null;
  loading: boolean;
  getToken: () => Promise<string>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        try {
          await signInAnonymously();
        } catch (err) {
          console.error("[Auth] Anonymous sign-in failed:", err);
          setLoading(false);
        }
      }
    });
    return unsub;
  }, []);

  const getToken = useCallback(async () => {
    return getIdToken();
  }, []);

  return {
    user,
    uid: user?.uid || null,
    loading,
    getToken,
  };
}
