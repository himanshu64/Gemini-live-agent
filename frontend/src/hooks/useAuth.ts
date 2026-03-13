"use client";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, signInAnonymously, linkWithGoogle, googleSignIn, signOut, getIdToken } from "@/lib/firebase";

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
      } else {
        // No user or already authenticated — do direct Google sign-in
        await googleSignIn();
      }
    } catch (err: unknown) {
      // If linking fails (e.g. credential already in use), fall back to direct sign-in
      if (err instanceof Error && "code" in err && (err as { code: string }).code === "auth/credential-already-in-use") {
        try {
          await signOut();
          await googleSignIn();
        } catch (innerErr) {
          console.error("[Auth] Fallback Google sign-in failed:", innerErr);
        }
      } else {
        console.error("[Auth] Google sign-in failed:", err);
      }
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
