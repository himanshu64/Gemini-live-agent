"use client";
import { useCallback, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY, API_URL } from "@/lib/constants";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);

  const verify = useCallback(async (): Promise<string> => {
    // If Turnstile not configured, get pass-through nonce
    if (!TURNSTILE_SITE_KEY) {
      const resp = await fetch(`${API_URL}/api/verify-captcha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "" }),
      });
      const data = await resp.json();
      setNonce(data.nonce);
      return data.nonce;
    }

    return new Promise((resolve, reject) => {
      if (!window.turnstile || !containerRef.current) {
        reject(new Error("Turnstile not loaded"));
        return;
      }
      if (widgetIdRef.current) window.turnstile.remove(widgetIdRef.current);

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: async (token: string) => {
          try {
            const resp = await fetch(`${API_URL}/api/verify-captcha`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
            if (!resp.ok) {
              reject(new Error("Captcha failed"));
              return;
            }
            const data = await resp.json();
            setNonce(data.nonce);
            resolve(data.nonce);
          } catch (e) {
            reject(e);
          }
        },
        "error-callback": () => reject(new Error("Captcha error")),
        size: "invisible",
        theme: "dark",
      });
    });
  }, []);

  return { containerRef, nonce, verify };
}
