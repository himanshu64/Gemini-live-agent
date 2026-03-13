"use client";
import { useCallback } from "react";
import Link from "next/link";
import { speak, stopSpeaking } from "@/lib/speak";
import ThemeToggle from "@/components/ThemeToggle";
import AuthButton from "@/components/AuthButton";
import { useAuthContext } from "@/lib/auth/auth-provider";

const FEATURES = [
  {
    title: "Navigation Mode",
    description: "Warns about obstacles, stairs, curbs, and crosswalks. Uses clock-face directions to guide you safely.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    title: "Reading Mode",
    description: "Reads text aloud from signs, menus, medicine bottles, and documents. Just point your camera.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: "Shopping Mode",
    description: "Identifies products, reads prices and nutrition labels. Compare items side by side while shopping.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
  },
  {
    title: "Social Mode",
    description: "Describes people's expressions, gestures, and appearance to help you engage in social settings.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Open SightLine", description: "Sign in and tap Start to connect to the AI assistant." },
  { step: "2", title: "Point Your Camera", description: "Hold your phone — the AI sees what your camera sees in real time." },
  { step: "3", title: "Listen & Speak", description: "SightLine describes your surroundings. Ask questions naturally by voice." },
  { step: "4", title: "Switch Modes", description: "Say 'switch to reading mode' or swipe to change between specialized modes." },
];

const TECH_STACK = ["Gemini 2.5 Flash", "Vertex AI", "Google ADK", "Cloud Run", "Firestore", "Cloud Storage", "Firebase Auth"];

export default function LandingPage() {
  const { user } = useAuthContext();
  const appHref = user ? "/live" : "/login";

  const readAloud = useCallback((title: string, description: string) => {
    stopSpeaking();
    speak(`${title}. ${description}`);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3">
          <Link href="/" className="text-xl font-bold text-primary tracking-tight">
            SightLine
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/guide" className="hidden sm:inline-flex rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Guide
            </Link>
            <Link href="/feedback" className="hidden sm:inline-flex rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Feedback
            </Link>
            <ThemeToggle />
            <AuthButton />
            <Link
              href={appHref}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-5 sm:px-8 pt-16 sm:pt-24 pb-12 sm:pb-16 gap-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          Powered by Google Gemini
        </div>

        <div className="flex flex-col gap-4 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
            See the world
            <span className="text-primary"> through AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            SightLine is a real-time AI vision assistant that describes your surroundings through voice. Built for visually impaired users.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href={appHref}
            className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Get Started — It&apos;s Free
          </Link>
          <a
            href="#how-it-works"
            className="rounded-lg border border-border px-8 py-3.5 text-base font-medium text-foreground hover:bg-muted transition-colors"
          >
            How It Works
          </a>
        </div>
      </section>

      {/* Preview Cards */}
      <section className="px-5 sm:px-8 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Real-time camera feed with AI descriptions", gradient: "from-primary/10 to-primary/5" },
            { label: "4 specialized modes for every situation", gradient: "from-chart-5/10 to-chart-5/5" },
            { label: "Voice-first — no screen needed", gradient: "from-primary/8 to-transparent" },
          ].map((item, i) => (
            <div
              key={i}
              className={`aspect-[9/16] sm:aspect-[3/4] rounded-xl border border-border bg-gradient-to-b ${item.gradient} flex items-end p-5 shadow-sm`}
            >
              <p className="text-sm text-foreground/80 font-medium leading-snug">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-5 sm:px-8 py-16 sm:py-20" id="features">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Four modes, one assistant
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">Each mode is optimized for a specific scenario</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {FEATURES.map((f) => (
              <button
                key={f.title}
                onClick={() => readAloud(f.title, f.description)}
                className="group rounded-xl border border-border bg-card p-6 flex flex-col gap-4 text-left transition-all hover:border-primary/30 hover:shadow-md cursor-pointer"
                aria-label={`${f.title}. Tap to hear description.`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 sm:px-8 py-16 sm:py-20 bg-muted/50" id="how-it-works">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              How it works
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">Get started in under a minute</p>
          </div>
          <div className="flex flex-col gap-8">
            {HOW_IT_WORKS.map((item) => (
              <button
                key={item.step}
                onClick={() => readAloud(`Step ${item.step}, ${item.title}`, item.description)}
                className="flex gap-5 items-start text-left cursor-pointer rounded-xl p-3 -m-3 transition-colors hover:bg-card"
                aria-label={`Step ${item.step}: ${item.title}. Tap to hear.`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="px-5 sm:px-8 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
            Built with Google Cloud
          </h2>
          <p className="text-muted-foreground text-lg mb-8">Enterprise-grade infrastructure, open-source stack</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 sm:px-8 py-16 sm:py-20 bg-primary/5">
        <div className="max-w-lg mx-auto text-center flex flex-col items-center gap-5">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Ready to try SightLine?
          </h2>
          <p className="text-muted-foreground text-lg max-w-sm">
            Free to use. No credit card required. Start seeing the world through AI today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={appHref}
              className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Launch App
            </Link>
            <Link
              href="/feedback"
              className="rounded-lg border border-border px-8 py-3.5 text-base font-medium text-foreground hover:bg-muted transition-colors"
            >
              Give Feedback
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 sm:px-8 py-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Link href="/" className="font-bold text-primary text-base">SightLine</Link>
          <div className="flex gap-6">
            <Link href="/guide" className="hover:text-foreground transition-colors">Guide</Link>
            <Link href="/feedback" className="hover:text-foreground transition-colors">Feedback</Link>
            <Link href="/legal" className="hover:text-foreground transition-colors">Legal</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </div>
          <p className="text-xs">Built for the Gemini API Developer Competition</p>
        </div>
      </footer>
    </div>
  );
}
