import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Atkinson_Hyperlegible_Next, Instrument_Serif } from "next/font/google";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/ToastProvider";

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
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
  themeColor: "#0e0f10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", atkinson.variable, instrumentSerif.variable)}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer />
        )}
      </head>
      <body className="min-h-dvh font-sans">
        <div className="gradient-blur" aria-hidden="true" />
        <ToastProvider>
        {children}
        </ToastProvider>
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
