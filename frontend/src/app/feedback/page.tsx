"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePageAnimations } from "@/hooks/usePageAnimations";
import { speak, stopSpeaking } from "@/lib/speak";
import { API_URL } from "@/lib/constants";
import Link from "next/link";

const STEPS = [
  {
    key: "name",
    question: "What's your name?",
    speech: "What is your name? You can type or tap the microphone to speak.",
    placeholder: "Your name (or say it)",
    type: "text" as const,
    required: false,
    skipLabel: "Stay anonymous",
  },
  {
    key: "email",
    question: "What's your email? (optional)",
    speech: "What is your email address? This is optional — you can skip it.",
    placeholder: "Email address (optional)",
    type: "email" as const,
    required: false,
    skipLabel: "Skip",
  },
  {
    key: "rating",
    question: "How would you rate SightLine?",
    speech: "How would you rate SightLine? Choose from 1 to 5 stars.",
    placeholder: "",
    type: "rating" as const,
    required: false,
    skipLabel: "Skip",
  },
  {
    key: "feedback",
    question: "Tell us what you think",
    speech: "Please share your feedback. What did you like? What can we improve? Tap the microphone to speak or type your message.",
    placeholder: "What did you like? What can we improve?",
    type: "textarea" as const,
    required: true,
    skipLabel: "",
  },
];

export default function FeedbackPage() {
  const pageRef = usePageAnimations();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    email: "",
    rating: "",
    feedback: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const hasSpokenRef = useRef<Set<number>>(new Set());

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  // Speak the question when step changes
  useEffect(() => {
    if (hasSpokenRef.current.has(step)) return;
    hasSpokenRef.current.add(step);
    const t = setTimeout(() => speak(currentStep.speech), 300);
    return () => clearTimeout(t);
  }, [step, currentStep.speech]);

  const setValue = useCallback((val: string) => {
    setValues((prev) => ({ ...prev, [currentStep.key]: val }));
  }, [currentStep.key]);

  const goNext = useCallback(() => {
    if (isLastStep) return;
    stopSpeaking();
    setStep((s) => s + 1);
  }, [isLastStep]);

  const goBack = useCallback(() => {
    if (step === 0) return;
    stopSpeaking();
    setStep((s) => s - 1);
  }, [step]);

  const handleSubmit = useCallback(async () => {
    if (!values.feedback.trim()) {
      speak("Please share your feedback before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim() || "Anonymous",
          email: values.email.trim() || null,
          message: values.feedback.trim(),
          rating: values.rating ? parseInt(values.rating) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
      speak("Thank you! Your feedback has been submitted.");
    } catch {
      setError("Failed to submit. Please try again.");
      speak("Sorry, submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [values]);

  // Voice input
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = createRecognition();
    if (!recognition) {
      speak("Voice input is not supported in this browser.");
      return;
    }

    recognitionRef.current = recognition;
    recognition.onresult = (event: { results: SpeechRecognitionResultList }) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setValues((prev) => ({
        ...prev,
        [currentStep.key]: prev[currentStep.key]
          ? prev[currentStep.key] + " " + transcript
          : transcript,
      }));
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
    speak("Listening. Go ahead and speak.");
  }, [isListening, currentStep.key]);

  // Submitted state
  if (submitted) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-8 flex flex-col items-center gap-5 max-w-sm w-full">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/30">
            <span className="text-3xl">&#10003;</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Thank you!</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your feedback helps us make SightLine better for everyone.
          </p>
          <div className="flex gap-3 mt-2">
            <Link
              href="/"
              className="rounded-full border border-border/50 px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Home
            </Link>
            <button
              onClick={() => {
                setSubmitted(false);
                setStep(0);
                setValues({ name: "", email: "", rating: "", feedback: "" });
                hasSpokenRef.current.clear();
              }}
              className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
            >
              Send Another
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main ref={pageRef} className="flex min-h-dvh flex-col">
      {/* Header */}
      <header data-gsap="page-header" className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="flex items-center justify-between px-5 sm:px-8 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <span className="text-sm font-bold text-primary">S</span>
            </div>
            <span className="text-xl font-bold text-foreground">SightLine</span>
          </Link>
          <span className="text-xs font-medium text-muted-foreground rounded-full bg-muted/50 ring-1 ring-border/50 px-3 py-1">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-5 sm:px-8">
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div data-gsap="page-content" className="flex flex-1 flex-col items-center justify-center px-5 sm:px-8 py-10 gap-6 max-w-lg mx-auto w-full">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center">
          {currentStep.question}
        </h2>

        {/* Rating step */}
        {currentStep.type === "rating" && (
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => {
                  setValue(String(star));
                  speak(`${star} star${star > 1 ? "s" : ""}`);
                }}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-all ${
                  values.rating === String(star)
                    ? "bg-amber-500/20 ring-1 ring-amber-500/30 scale-110"
                    : "bg-muted/50 ring-1 ring-border/50 hover:bg-muted"
                }`}
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
              >
                {parseInt(values.rating || "0") >= star ? "★" : "☆"}
              </button>
            ))}
          </div>
        )}

        {/* Text input */}
        {currentStep.type === "text" && (
          <div className="relative w-full">
            <input
              type="text"
              value={values[currentStep.key]}
              onChange={(e) => setValue(e.target.value)}
              placeholder={currentStep.placeholder}
              autoFocus
              className="w-full rounded-2xl bg-card/60 ring-1 ring-border/50 px-5 py-4 pr-14 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={currentStep.question}
              onKeyDown={(e) => e.key === "Enter" && goNext()}
            />
            <VoiceButton isListening={isListening} onClick={toggleVoice} />
          </div>
        )}

        {/* Email input */}
        {currentStep.type === "email" && (
          <div className="relative w-full">
            <input
              type="email"
              value={values[currentStep.key]}
              onChange={(e) => setValue(e.target.value)}
              placeholder={currentStep.placeholder}
              autoFocus
              className="w-full rounded-2xl bg-card/60 ring-1 ring-border/50 px-5 py-4 pr-14 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={currentStep.question}
              onKeyDown={(e) => e.key === "Enter" && goNext()}
            />
            <VoiceButton isListening={isListening} onClick={toggleVoice} />
          </div>
        )}

        {/* Textarea */}
        {currentStep.type === "textarea" && (
          <div className="relative w-full">
            <textarea
              value={values[currentStep.key]}
              onChange={(e) => setValue(e.target.value)}
              placeholder={currentStep.placeholder}
              rows={5}
              autoFocus
              className="w-full rounded-2xl bg-card/60 ring-1 ring-border/50 px-5 py-4 pr-14 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              aria-label={currentStep.question}
            />
            <VoiceButton isListening={isListening} onClick={toggleVoice} />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 w-full text-center">
            {error}
          </p>
        )}

        {/* Navigation buttons */}
        <div className="flex flex-col gap-3 w-full">
          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !values.feedback.trim()}
              className="w-full rounded-full bg-foreground px-6 py-4 text-base font-semibold text-background hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Sending..." : "Submit Feedback"}
            </button>
          ) : (
            <button
              onClick={goNext}
              className="w-full rounded-full bg-foreground px-6 py-4 text-base font-semibold text-background hover:opacity-90 transition-opacity"
            >
              {values[currentStep.key]?.trim() ? "Next" : currentStep.skipLabel || "Next"}
            </button>
          )}

          {step > 0 && (
            <button
              onClick={goBack}
              className="w-full rounded-full border border-border/50 px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Back
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function VoiceButton({ isListening, onClick }: { isListening: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
        isListening
          ? "bg-red-500/20 text-red-400 animate-pulse"
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      }`}
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
    >
      {isListening ? "⏹" : "🎤"}
    </button>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createRecognition(): any {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  return recognition;
}
