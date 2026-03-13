"use client";
import { useState, useEffect } from "react";
import { speak } from "@/lib/speak";

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to SightLine",
    body: "Your AI vision assistant. SightLine uses your camera and microphone to describe the world around you in real time.",
    speech: "Welcome to SightLine, your AI vision assistant. Let me walk you through how to use the app.",
  },
  {
    title: "How It Works",
    body: "Point your camera at anything — SightLine will describe what it sees. Speak naturally to ask questions. You can interrupt the assistant at any time.",
    speech: "Point your camera at anything and SightLine will describe what it sees. You can speak naturally and interrupt at any time.",
  },
  {
    title: "4 Modes",
    body: "Navigation for walking and obstacles. Reading for text and labels. Shopping for products and prices. Social for people and expressions. Switch by voice or tap.",
    speech: "There are 4 modes. Navigation for walking, Reading for text, Shopping for products, and Social for people. Switch by voice or tap.",
  },
  {
    title: "Quick Actions",
    body: "Tap the suggestion chips below the conversation for common questions. Or just speak freely — SightLine understands natural language.",
    speech: "Tap the suggestion chips for common questions, or just speak freely.",
  },
  {
    title: "Permissions Needed",
    body: "SightLine needs camera and microphone access. Tap Start and allow permissions when prompted. Your data stays private — nothing is stored without your consent.",
    speech: "SightLine needs camera and microphone access. Tap Start when you're ready. Your data stays private.",
  },
];

const ONBOARDING_KEY = "sightline_onboarding_done";

export default function OnboardingModal({ onComplete }: Props) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let shouldShow = false;
    try {
      shouldShow = !localStorage.getItem(ONBOARDING_KEY);
    } catch {
      // localStorage unavailable
    }
    if (shouldShow) setShow(true);
  }, []);

  useEffect(() => {
    if (show) {
      const t = setTimeout(() => speak(STEPS[step].speech), 400);
      return () => clearTimeout(t);
    }
  }, [show, step]);

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
    setShow(false);
    onComplete();
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const skip = () => finish();

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to SightLine"
    >
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 pb-8 space-y-5 animate-in slide-in-from-bottom-4 duration-300">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === step ? "w-6 bg-blue-400" : i < step ? "w-1.5 bg-blue-400/40" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={skip}
            className="flex-1 rounded-full border border-border py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            Skip
          </button>
          <button
            onClick={next}
            className="flex-1 rounded-full bg-foreground py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
