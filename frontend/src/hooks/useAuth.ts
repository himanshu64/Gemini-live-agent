"use client";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, signInAnonymously, linkWithGoogle, signOut, getIdToken } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  uid: string | null;
  isAnonymous: boolean;
  loading: boolean;
  getToken: () => Promise<string>;
  signInWithGoogle: () => Promise<void>;
  handleSignOut: () => Promise<void>;
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

  const signInWithGoogle = useCallback(async () => {
    try {
      if (user?.isAnonymous) {
        await linkWithGoogle();
      }
    } catch (err) {
      console.error("[Auth] Google sign-in failed:", err);
    }
  }, [user]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  return {
    user,
    uid: user?.uid || null,
    isAnonymous: user?.isAnonymous ?? true,
    loading,
    getToken,
    signInWithGoogle,
    handleSignOut,
  };
}
