"use client";
import { useCallback } from "react";
import { usePageAnimations } from "@/hooks/usePageAnimations";
import { speak, stopSpeaking } from "@/lib/speak";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <main ref={pageRef} className="flex min-h-dvh flex-col">
      <header data-gsap="page-header" className="flex items-center justify-between px-5 py-4">
        <h1 className="text-xl font-bold text-foreground">User Guide</h1>
        <Button variant="ghost" size="sm" className="rounded-full text-xs" render={<Link href="/" />}>
          Back
        </Button>
      </header>

      <nav className="border-b border-border/50 px-5 py-3" aria-label="Guide sections">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={readAloud}
            className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition-all duration-200 hover:opacity-90"
            aria-label="Read entire guide aloud"
          >
            Read Aloud
          </button>
          <button
            onClick={stopSpeaking}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-all duration-200 hover:text-foreground"
            aria-label="Stop reading"
          >
            Stop
          </button>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground transition-all duration-200 hover:text-foreground hover:border-foreground/30"
            >
              {s.title}
            </a>
          ))}
        </div>
      </nav>

      <div data-gsap="page-content" className="flex flex-1 flex-col gap-4 px-5 py-4 pb-5">
        {sections.map((s) => (
          <Card key={s.id} id={s.id} data-gsap="fade-up" className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{s.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
