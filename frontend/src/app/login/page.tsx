"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePageAnimations } from "@/hooks/usePageAnimations";
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
        };
      };
    };
  }
}

function LoginForm() {
  const pageRef = usePageAnimations();
  const { user, loading } = useAuthContext();
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof document !== "undefined" && !!document.getElementById("gis-script")
  );
  const btnRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/live";
  const urlError = searchParams.get("error");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

  useEffect(() => {
    if (!scriptLoaded || !window.google || !btnRef.current || !clientId) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: "redirect",
      login_uri: `${window.location.origin}/api/auth/callback`,
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "signin_with",
      shape: "pill",
    });
  }, [scriptLoaded, clientId]);

  if (user) return null;

  return (
    <main ref={pageRef} className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div data-gsap="page-header" className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <span className="text-lg font-bold text-primary">S</span>
          </div>
          <Link href="/" className="text-2xl font-bold text-primary tracking-tight">
            SightLine
          </Link>
          <p className="text-muted-foreground text-sm text-center">
            Sign in to your AI vision assistant
          </p>
        </div>

        {/* Card */}
        <div data-gsap="page-content" className="w-full rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-8 flex flex-col items-center gap-6">
          <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>

          {loading && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <span className="text-sm text-muted-foreground">Signing in...</span>
            </div>
          )}

          {urlError && (
            <p className="text-sm text-destructive rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 w-full text-center">
              {urlError}
            </p>
          )}

          {/* Missing client ID error */}
          {scriptLoaded && !clientId && (
            <p className="text-sm text-destructive rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 w-full text-center">
              Google Sign-In is not configured. Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.
            </p>
          )}

          {/* GIS rendered button — redirect mode, no popup */}
          <div ref={btnRef} className={loading ? "opacity-50 pointer-events-none" : ""} />

          {/* Loading skeleton while GIS script loads */}
          {!scriptLoaded && (
            <div className="h-10 w-80 animate-pulse rounded-2xl bg-muted" />
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
