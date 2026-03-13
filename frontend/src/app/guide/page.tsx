"use client";
import { useCallback } from "react";
import { usePageAnimations } from "@/hooks/usePageAnimations";
import { speak, stopSpeaking } from "@/lib/speak";
import Link from "next/link";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    content:
      "Tap the Start button at the bottom of the main screen. SightLine will ask for camera and microphone permission. Once granted, the AI assistant connects and begins analyzing what your camera sees. Point your phone outward and speak naturally to ask questions about your surroundings.",
  },
  {
    id: "modes",
    title: "Modes",
    content:
      "SightLine has four modes, each optimized for different situations:\n\n" +
      "\u2022 Navigation \u2014 Warns about obstacles, stairs, curbs, and crosswalks. Uses clock-face directions like \u201Cdoor at your 2 o\u2019clock.\u201D Best for walking indoors or outdoors.\n\n" +
      "\u2022 Reading \u2014 Reads text verbatim from signs, menus, labels, medicine bottles, and documents. Just point your camera at text and ask.\n\n" +
      "\u2022 Shopping \u2014 Identifies products, reads prices and nutritional info, and compares items side by side. Great for grocery stores and pharmacies.\n\n" +
      "\u2022 Social \u2014 Describes people\u2019s appearance, expressions, and gestures to help you engage in social settings. Never identifies people by name for privacy.\n\n" +
      "To switch modes, tap a mode button on the main screen or simply say \u201CSwitch to reading mode.\u201D",
  },
  {
    id: "voice-commands",
    title: "Voice Commands",
    content:
      "You can control SightLine entirely by voice. Here are some things you can say:\n\n" +
      "\u2022 \u201CWhat\u2019s in front of me?\u201D \u2014 Describe your surroundings\n" +
      "\u2022 \u201CRead that sign\u201D \u2014 Read visible text aloud\n" +
      "\u2022 \u201CSwitch to shopping mode\u201D \u2014 Change modes by voice\n" +
      "\u2022 \u201CCapture this\u201D / \u201CSave what you see\u201D \u2014 Save a frame to your history\n" +
      "\u2022 \u201CWhat color is it?\u201D \u2014 Ask follow-up questions\n" +
      "\u2022 \u201CSet my speech rate to fast\u201D \u2014 Update preferences by voice\n" +
      "\u2022 \u201CHelp!\u201D / \u201CEmergency\u201D \u2014 Trigger emergency alert\n\n" +
      "Speak naturally at any time. The assistant pauses to listen when you talk and responds with spoken audio so you can keep your attention on the world around you.",
  },
  {
    id: "emergency",
    title: "Emergency SOS",
    content:
      "The red SOS Emergency button is always at the bottom of the screen. Tap it to immediately switch to emergency mode. The assistant will describe your surroundings in detail to help emergency responders locate you, and can help you communicate your situation. You can also activate emergency mode by saying \u201CHelp!\u201D or \u201CEmergency.\u201D",
  },
  {
    id: "settings",
    title: "Settings",
    content:
      "Open Settings from the top menu to customize your experience. You can adjust speech rate, verbosity level, language, font size, contrast, and toggle haptic feedback, audio descriptions, and auto capture. All changes save automatically and are announced via speech.",
  },
  {
    id: "captured-frames",
    title: "Captured Frames",
    content:
      "When you ask the assistant to capture or save what it sees, the image is stored securely in your account. You can view and delete your captured frames from the Dashboard. This is useful for saving important information like signs, labels, or receipts to review later.",
  },
  {
    id: "tips",
    title: "Tips",
    content:
      "Hold your phone at chest height with the camera facing forward for the best results. Speak clearly and pause briefly for the assistant to respond. Use a Bluetooth earpiece for hands-free use. The app works best with good lighting but will do its best in any condition. Your daily free usage is 30 minutes \u2014 check the Dashboard to monitor usage.",
  },
];

export default function GuidePage() {
  const pageRef = usePageAnimations();
  const readAloud = useCallback(() => {
    stopSpeaking();
    const fullText = sections
      .map((s) => `${s.title}. ${s.content}`)
      .join(" ... ");
    speak(fullText, true);
  }, []);

  return (
    <main ref={pageRef} className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header
        data-gsap="page-header"
        className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50"
      >
        <div className="max-w-6xl mx-auto w-full px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">S</span>
            </div>
            <h1 className="text-lg font-semibold text-foreground">User Guide</h1>
          </div>
          <nav className="flex items-center gap-1.5">
            <Link
              href="/live"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            >
              Live
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            >
              Dashboard
            </Link>
            <Link
              href="/"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            >
              Home
            </Link>
          </nav>
        </div>

        {/* Section nav + Read Aloud controls */}
        <div className="max-w-6xl mx-auto w-full px-5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={readAloud}
              className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-all duration-200 hover:opacity-90"
              aria-label="Read entire guide aloud"
            >
              Read Aloud
            </button>
            <button
              onClick={stopSpeaking}
              className="rounded-full ring-1 ring-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:ring-foreground/30"
              aria-label="Stop reading"
            >
              Stop
            </button>
            <span className="mx-1 h-4 w-px bg-border/60" aria-hidden="true" />
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div data-gsap="page-content" className="max-w-6xl mx-auto w-full px-5 py-6 flex flex-col gap-4">
        {sections.map((s) => (
          <section
            key={s.id}
            id={s.id}
            data-gsap="fade-up"
            className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5"
          >
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              {s.title}
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {s.content}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
