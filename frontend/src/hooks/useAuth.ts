"use client";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useSession, signIn as nextAuthSignIn } from "next-auth/react";
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
  const { data: session } = useSession();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        // Auto sign-in anonymously for zero-friction UX
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

  // Sync Firebase anonymous user to NextAuth session (if no session exists)
  useEffect(() => {
    if (user && !session && !user.isAnonymous) {
      // User signed in via Firebase but no NextAuth session — sync
      getIdToken().then((idToken) => {
        nextAuthSignIn("firebase", { idToken, redirect: false });
      }).catch(() => {});
    }
  }, [user, session]);

  const getToken = useCallback(async () => {
    return getIdToken();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      // Try linking first if anonymous
      if (user?.isAnonymous) {
        await linkWithGoogle();
        // After linking, create NextAuth session
        const idToken = await getIdToken();
        await nextAuthSignIn("firebase", { idToken, redirect: false });
      } else {
        // Direct Google sign-in via NextAuth
        await nextAuthSignIn("google", { redirect: false });
      }
    } catch (err: unknown) {
      console.error("[Auth] Google sign-in failed:", err);
      // Fallback: direct NextAuth Google sign-in
      await nextAuthSignIn("google", { redirect: false });
    }
  }, [user]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  // Use NextAuth session UID if available, otherwise Firebase UID
  const uid = (session?.user as Record<string, unknown>)?.uid as string || user?.uid || null;
  const isAnonymous = session ? false : (user?.isAnonymous ?? true);

  return {
    user,
    uid,
    isAnonymous,
    loading,
    getToken,
    signInWithGoogle,
    handleSignOut,
  };
}
