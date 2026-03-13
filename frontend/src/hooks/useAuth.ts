"use client";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, signInAnonymously, linkWithGoogle, googleSignIn, signOut, getIdToken, handleRedirectResult } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  uid: string | null;
  isAnonymous: boolean;
  loading: boolean;
  authError: string | null;
  getToken: () => Promise<string>;
  signInWithGoogle: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Handle redirect result from Google sign-in (if returning from redirect flow)
    handleRedirectResult().catch(() => {});

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
    setAuthError(null);
    try {
      if (user?.isAnonymous) {
        await linkWithGoogle();
      } else {
        await googleSignIn();
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/credential-already-in-use") {
        try {
          await signOut();
          await googleSignIn();
        } catch (innerErr) {
          console.error("[Auth] Fallback Google sign-in failed:", innerErr);
          setAuthError("Sign-in failed. Please try again.");
        }
      } else if (code === "auth/unauthorized-domain") {
        setAuthError("This domain is not authorized for sign-in. Please contact the administrator.");
        console.error("[Auth] Add this domain to Firebase Console → Authentication → Settings → Authorized domains");
      } else {
        console.error("[Auth] Google sign-in failed:", err);
        setAuthError("Sign-in failed. Please try again.");
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
    authError,
    getToken,
    signInWithGoogle,
    handleSignOut,
  };
}
