"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/lib/auth/auth-provider";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const { user, login, loading, error } = useAuthContext();
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof document !== "undefined" && !!document.getElementById("gis-script")
  );
  const btnRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/live";

  useEffect(() => {
    if (user) router.replace(callbackUrl);
  }, [user, router, callbackUrl]);

  useEffect(() => {
    if (scriptLoaded) return;
    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, [scriptLoaded]);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        await login(response.credential);
      } catch {
        // error handled by context
      }
    },
    [login]
  );

  useEffect(() => {
    if (!scriptLoaded || !window.google || !btnRef.current) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "signin_with",
      shape: "rectangular",
    });
  }, [scriptLoaded, handleCredentialResponse]);

  if (user) return null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <Link href="/" className="text-2xl font-bold text-primary tracking-tight">
            SightLine
          </Link>
          <p className="text-muted-foreground text-sm text-center">
            Sign in to your AI vision assistant
          </p>
        </div>

        {/* Card */}
        <div className="w-full rounded-xl border border-border bg-card p-8 shadow-sm flex flex-col items-center gap-6">
          <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>

          {loading && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <span className="text-sm text-muted-foreground">Signing in...</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 w-full text-center">
              {error}
            </p>
          )}

          {/* GIS rendered button */}
          <div ref={btnRef} className={loading ? "opacity-50 pointer-events-none" : ""} />

          {/* Fallback: custom Google button shown while GIS loads or if it fails */}
          {!scriptLoaded && (
            <div className="h-10 w-80 animate-pulse rounded-md bg-muted" />
          )}

          {/* Manual trigger if GIS button doesn't render */}
          {scriptLoaded && (
            <button
              type="button"
              onClick={() => {
                if (window.google) {
                  window.google.accounts.id.prompt();
                }
              }}
              disabled={loading}
              className="flex items-center justify-center gap-3 w-80 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58v1Z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          )}

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            By signing in, you agree to our{" "}
            <Link href="/legal" className="text-primary hover:underline">terms and privacy policy</Link>.
          </p>
        </div>

        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
