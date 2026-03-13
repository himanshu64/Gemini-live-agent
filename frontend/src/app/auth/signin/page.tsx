"use client";
import { signIn } from "next-auth/react";
import { useAuth } from "@/hooks/useAuth";
import { useCallback } from "react";
import Link from "next/link";

export default function SignInPage() {
  const { uid, getToken } = useAuth();

  const handleAnonymousSignIn = useCallback(async () => {
    if (!uid) return;
    try {
      const idToken = await getToken();
      await signIn("firebase", { idToken, callbackUrl: "/" });
    } catch (err) {
      console.error("Anonymous sign-in failed:", err);
    }
  }, [uid, getToken]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-bold text-white">Sign in to SightLine</h1>
      <p className="text-gray-400 text-center max-w-md">
        Sign in with Google to save your preferences across devices, or continue as a guest.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full rounded-2xl bg-white px-6 py-4 text-lg font-semibold text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-3"
          aria-label="Sign in with Google"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>

        <button
          onClick={handleAnonymousSignIn}
          className="w-full rounded-2xl bg-gray-800 px-6 py-4 text-lg font-semibold text-gray-300 hover:bg-gray-700"
          aria-label="Continue as guest"
        >
          Continue as Guest
        </button>

        <Link
          href="/"
          className="text-center text-gray-500 hover:text-gray-400 mt-2"
        >
          Back to app
        </Link>
      </div>
    </main>
  );
}
