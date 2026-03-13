"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

  useEffect(() => {
    if (user) router.replace("/live");
  }, [user, router]);

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

          <div ref={btnRef} className={loading ? "opacity-50 pointer-events-none" : ""} />

          {!scriptLoaded && (
            <div className="h-10 w-72 animate-pulse rounded-md bg-muted" />
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
