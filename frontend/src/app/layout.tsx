import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ToastProvider";
import Providers from "@/components/Providers";
import { cookies } from "next/headers";
import type { AuthUser } from "@/lib/auth/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SightLine - AI Vision Assistant",
  description: "Real-time AI vision assistant for visually impaired users",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SightLine",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#008060",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialUser: AuthUser | null = null;
  try {
    const jar = await cookies();
    const raw = jar.get("sl_user")?.value;
    if (raw) initialUser = JSON.parse(raw);
  } catch { /* no session */ }

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark")}catch(e){}})()`
          }}
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer />
        )}
      </head>
      <body className="min-h-dvh font-sans">
        <div className="gradient-blur" aria-hidden="true" />
        <Providers initialUser={initialUser}>
        <ToastProvider>
        {children}
        </ToastProvider>
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
