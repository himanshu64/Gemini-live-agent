"use client";
import { useCallback } from "react";
import Link from "next/link";
import { speak, stopSpeaking } from "@/lib/speak";
import ThemeToggle from "@/components/ThemeToggle";
import AuthButton from "@/components/AuthButton";
import { useAuthContext } from "@/lib/auth/auth-provider";
import { useScrollReveal } from "@/hooks/useScrollReveal";

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
  const scrollRef = useScrollReveal<HTMLDivElement>();

  const readAloud = useCallback((title: string, description: string) => {
    stopSpeaking();
    speak(`${title}. ${description}`);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background" ref={scrollRef}>
      {/* Nav */}
      <header className="nav-enter sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors hover-lift"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-5 sm:px-8 pt-16 sm:pt-24 pb-12 sm:pb-16 gap-8">
        <div className="hero-enter inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          Powered by Google Gemini
        </div>

        <div className="hero-enter hero-enter-delay-1 flex flex-col gap-4 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
            See the world
            <span className="shimmer-text"> through AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            SightLine is a real-time AI vision assistant that describes your surroundings through voice. Built for visually impaired users.
          </p>
        </div>

        <div className="hero-enter hero-enter-delay-2 flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href={appHref}
            className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm hover-lift pulse-glow"
          >
            Get Started — It&apos;s Free
          </Link>
          <a
            href="#how-it-works"
            className="rounded-lg border border-border px-8 py-3.5 text-base font-medium text-foreground hover:bg-muted transition-colors hover-lift"
          >
            How It Works
          </a>
        </div>
      </section>

      {/* Preview Cards */}
      <section className="px-5 sm:px-8 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
          {/* Card 1: Real-time Camera AI */}
          <div className="reveal float group relative aspect-[9/16] sm:aspect-[3/4] rounded-xl border border-border bg-gradient-to-b from-primary/10 to-primary/5 flex flex-col items-center justify-between p-5 shadow-sm overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
            <div className="flex-1 flex items-center justify-center w-full">
              <svg viewBox="0 0 200 280" fill="none" className="w-40 sm:w-44 drop-shadow-lg transition-transform duration-500 group-hover:scale-105">
                {/* Phone frame */}
                <rect x="30" y="10" width="140" height="260" rx="20" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="2" />
                <rect x="38" y="30" width="124" height="220" rx="4" fill="white" />
                {/* Camera notch */}
                <rect x="80" y="14" width="40" height="8" rx="4" fill="#d1d5db" />
                {/* Camera viewfinder scene */}
                <rect x="38" y="30" width="124" height="220" rx="4" fill="#008060" fillOpacity="0.08" />
                {/* Crosshair */}
                <circle cx="100" cy="120" r="30" stroke="#008060" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
                <line x1="100" y1="85" x2="100" y2="95" stroke="#008060" strokeWidth="2" opacity="0.6" />
                <line x1="100" y1="145" x2="100" y2="155" stroke="#008060" strokeWidth="2" opacity="0.6" />
                <line x1="65" y1="120" x2="75" y2="120" stroke="#008060" strokeWidth="2" opacity="0.6" />
                <line x1="125" y1="120" x2="135" y2="120" stroke="#008060" strokeWidth="2" opacity="0.6" />
                {/* Scene elements */}
                <rect x="55" y="90" width="20" height="40" rx="2" fill="#008060" fillOpacity="0.15" stroke="#008060" strokeWidth="1" opacity="0.5" />
                <circle cx="130" cy="95" r="12" fill="#008060" fillOpacity="0.12" stroke="#008060" strokeWidth="1" opacity="0.5" />
                <rect x="70" y="150" width="60" height="8" rx="4" fill="#008060" fillOpacity="0.2" />
                {/* AI description bubble */}
                <rect x="48" y="175" width="104" height="50" rx="10" fill="#008060" fillOpacity="0.9" />
                <text x="100" y="195" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">Person ahead, 10ft</text>
                <text x="100" y="210" textAnchor="middle" fill="white" fontSize="8" opacity="0.8">Crosswalk at 12 o&apos;clock</text>
                <polygon points="70,225 80,225 75,232" fill="#008060" fillOpacity="0.9" />
                {/* REC indicator */}
                <circle cx="52" cy="42" r="4" fill="#EF4444" />
                <text x="62" y="45" fill="#EF4444" fontSize="8" fontWeight="700">LIVE</text>
              </svg>
            </div>
            <p className="text-sm text-foreground/80 font-medium leading-snug text-center">Real-time camera feed with AI descriptions</p>
          </div>

          {/* Card 2: 4 Specialized Modes */}
          <div className="reveal float float-delay-1 group relative aspect-[9/16] sm:aspect-[3/4] rounded-xl border border-border bg-gradient-to-b from-[#008060]/8 to-[#008060]/3 flex flex-col items-center justify-between p-5 shadow-sm overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
            <div className="flex-1 flex items-center justify-center w-full">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Navigation */}
                <div className="flex flex-col items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 p-4 sm:p-5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-primary">Navigate</span>
                </div>
                {/* Reading */}
                <div className="flex flex-col items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 sm:p-5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-blue-500">Read</span>
                </div>
                {/* Shopping */}
                <div className="flex flex-col items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 sm:p-5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-amber-500">Shop</span>
                </div>
                {/* Social */}
                <div className="flex flex-col items-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 sm:p-5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-purple-500">Social</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-foreground/80 font-medium leading-snug text-center">4 specialized modes for every situation</p>
          </div>

          {/* Card 3: Voice-first */}
          <div className="reveal float float-delay-2 group relative aspect-[9/16] sm:aspect-[3/4] rounded-xl border border-border bg-gradient-to-b from-primary/8 to-transparent flex flex-col items-center justify-between p-5 shadow-sm overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
            <div className="flex-1 flex items-center justify-center w-full">
              <svg viewBox="0 0 200 240" fill="none" className="w-40 sm:w-44 transition-transform duration-500 group-hover:scale-105">
                {/* Central mic icon */}
                <circle cx="100" cy="110" r="50" fill="#008060" fillOpacity="0.08" stroke="#008060" strokeWidth="1.5" strokeDasharray="4 3" />
                <circle cx="100" cy="110" r="35" fill="#008060" fillOpacity="0.12" />
                <rect x="92" y="88" width="16" height="28" rx="8" fill="#008060" />
                <path d="M84 108v4a16 16 0 0 0 32 0v-4" stroke="#008060" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="100" y1="128" x2="100" y2="136" stroke="#008060" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="92" y1="136" x2="108" y2="136" stroke="#008060" strokeWidth="2.5" strokeLinecap="round" />

                {/* Sound waves */}
                <path d="M60 110c0-22 18-40 40-40" stroke="#008060" strokeWidth="2" strokeLinecap="round" opacity="0.3">
                  <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2s" repeatCount="indefinite" />
                </path>
                <path d="M48 110c0-29 23-52 52-52" stroke="#008060" strokeWidth="1.5" strokeLinecap="round" opacity="0.2">
                  <animate attributeName="opacity" values="0.05;0.3;0.05" dur="2s" begin="0.3s" repeatCount="indefinite" />
                </path>
                <path d="M140 110c0-22-18-40-40-40" stroke="#008060" strokeWidth="2" strokeLinecap="round" opacity="0.3">
                  <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2s" repeatCount="indefinite" />
                </path>
                <path d="M152 110c0-29-23-52-52-52" stroke="#008060" strokeWidth="1.5" strokeLinecap="round" opacity="0.2">
                  <animate attributeName="opacity" values="0.05;0.3;0.05" dur="2s" begin="0.3s" repeatCount="indefinite" />
                </path>

                {/* Speech bubbles */}
                <rect x="20" y="160" width="70" height="28" rx="8" fill="#008060" fillOpacity="0.15" />
                <text x="55" y="178" textAnchor="middle" fill="#008060" fontSize="9" fontWeight="500">&quot;What&apos;s ahead?&quot;</text>

                <rect x="110" y="160" width="75" height="28" rx="8" fill="#008060" fillOpacity="0.9" />
                <text x="147" y="178" textAnchor="middle" fill="white" fontSize="9" fontWeight="500">&quot;Crosswalk, 20ft&quot;</text>

                {/* Audio waveform bars */}
                <rect x="30" y="202" width="6" height="16" rx="3" fill="#008060" fillOpacity="0.15" />
                <rect x="45" y="196" width="6" height="28" rx="3" fill="#008060" fillOpacity="0.18" />
                <rect x="60" y="190" width="6" height="40" rx="3" fill="#008060" fillOpacity="0.21" />
                <rect x="75" y="198" width="6" height="24" rx="3" fill="#008060" fillOpacity="0.24" />
                <rect x="90" y="186" width="6" height="48" rx="3" fill="#008060" fillOpacity="0.27" />
                <rect x="105" y="192" width="6" height="36" rx="3" fill="#008060" fillOpacity="0.30" />
                <rect x="120" y="200" width="6" height="20" rx="3" fill="#008060" fillOpacity="0.33" />
                <rect x="135" y="188" width="6" height="44" rx="3" fill="#008060" fillOpacity="0.36" />
                <rect x="150" y="194" width="6" height="32" rx="3" fill="#008060" fillOpacity="0.39" />
                <rect x="165" y="202" width="6" height="16" rx="3" fill="#008060" fillOpacity="0.42" />
              </svg>
            </div>
            <p className="text-sm text-foreground/80 font-medium leading-snug text-center">Voice-first — no screen needed</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 sm:px-8 py-16 sm:py-20" id="features">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="reveal text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Four modes, one assistant
            </h2>
            <p className="reveal text-muted-foreground mt-3 text-lg">Each mode is optimized for a specific scenario</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 stagger">
            {FEATURES.map((f) => (
              <button
                key={f.title}
                onClick={() => readAloud(f.title, f.description)}
                className="reveal group rounded-xl border border-border bg-card p-6 flex flex-col gap-4 text-left transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                aria-label={`${f.title}. Tap to hear description.`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
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
            <h2 className="reveal text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              How it works
            </h2>
            <p className="reveal text-muted-foreground mt-3 text-lg">Get started in under a minute</p>
          </div>
          <div className="flex flex-col gap-8 stagger">
            {HOW_IT_WORKS.map((item) => (
              <button
                key={item.step}
                onClick={() => readAloud(`Step ${item.step}, ${item.title}`, item.description)}
                className="slide-left flex gap-5 items-start text-left cursor-pointer rounded-xl p-3 -m-3 transition-all duration-300 hover:bg-card hover:shadow-sm"
                aria-label={`Step ${item.step}: ${item.title}. Tap to hear.`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm transition-transform duration-300 hover:scale-110">
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
          <h2 className="reveal text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
            Built with Google Cloud
          </h2>
          <p className="reveal text-muted-foreground text-lg mb-8">Enterprise-grade infrastructure, open-source stack</p>
          <div className="flex flex-wrap justify-center gap-2.5 stagger">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="scale-in rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
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
          <h2 className="reveal text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Ready to try SightLine?
          </h2>
          <p className="reveal text-muted-foreground text-lg max-w-sm">
            Free to use. No credit card required. Start seeing the world through AI today.
          </p>
          <div className="reveal flex flex-col sm:flex-row gap-3">
            <Link
              href={appHref}
              className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm hover-lift pulse-glow"
            >
              Launch App
            </Link>
            <Link
              href="/feedback"
              className="rounded-lg border border-border px-8 py-3.5 text-base font-medium text-foreground hover:bg-muted transition-colors hover-lift"
            >
              Give Feedback
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="reveal px-5 sm:px-8 py-8 border-t border-border">
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
