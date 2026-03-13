"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/constants";

const FEATURES = [
  {
    title: "Navigation Mode",
    description: "Warns about obstacles, stairs, curbs, and crosswalks. Uses clock-face directions to guide you safely.",
    icon: "🧭",
  },
  {
    title: "Reading Mode",
    description: "Reads text aloud from signs, menus, medicine bottles, and documents. Just point your camera.",
    icon: "📖",
  },
  {
    title: "Shopping Mode",
    description: "Identifies products, reads prices and nutrition labels. Compare items side by side while shopping.",
    icon: "🛒",
  },
  {
    title: "Social Mode",
    description: "Describes people's expressions, gestures, and appearance to help you engage in social settings.",
    icon: "👥",
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Open SightLine", description: "Sign in and tap Start to connect to the AI assistant." },
  { step: "2", title: "Point Your Camera", description: "Hold your phone — the AI sees what your camera sees in real time." },
  { step: "3", title: "Listen & Speak", description: "SightLine describes your surroundings. Ask questions naturally by voice." },
  { step: "4", title: "Switch Modes", description: "Say 'switch to reading mode' or swipe to change between 4 specialized modes." },
];

export default function LandingPage() {
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);

  const handleSubmitFeedback = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: feedbackName.trim() || "Anonymous",
          email: feedbackEmail.trim() || null,
          message: feedbackText.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
      setFeedbackText("");
      setFeedbackName("");
      setFeedbackEmail("");
    } catch {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [feedbackText, feedbackName, feedbackEmail]);

  // Voice input for feedback
  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = createRecognition();
    if (!recognition) {
      setError("Voice input not supported in this browser.");
      return;
    }

    recognitionRef.current = recognition;
    recognition.onresult = (event: { results: SpeechRecognitionResultList }) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setFeedbackText((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-4">
        <h1 className="font-serif text-xl sm:text-2xl italic text-foreground">SightLine</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/guide"
            className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Guide
          </Link>
          <Link
            href="/legal"
            className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Legal
          </Link>
          <Link
            href="/live"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
          >
            Launch App
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-5 sm:px-8 py-12 sm:py-20 gap-6">
        <div className="flex flex-col gap-3 max-w-2xl">
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl italic text-foreground leading-tight">
            See the world through AI
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
            SightLine is a real-time AI vision assistant that describes your surroundings through voice.
            Built for visually impaired users, powered by Google Gemini.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/live"
            className="rounded-full bg-foreground px-8 py-3.5 text-base font-semibold text-background hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-border px-8 py-3.5 text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Screenshots / Preview */}
      <section className="px-5 sm:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Real-time camera feed with AI descriptions", bg: "from-blue-500/20 to-blue-500/5" },
            { label: "4 specialized modes for every situation", bg: "from-purple-500/20 to-purple-500/5" },
            { label: "Voice-first — no screen needed", bg: "from-amber-500/20 to-amber-500/5" },
          ].map((item, i) => (
            <div
              key={i}
              className={`aspect-[9/16] sm:aspect-[3/4] rounded-2xl border border-border bg-gradient-to-b ${item.bg} flex items-end p-4`}
            >
              <p className="text-sm text-foreground/80 font-medium leading-snug">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-5 sm:px-8 py-12 sm:py-16" id="features">
        <div className="max-w-4xl mx-auto">
          <h3 className="font-serif text-2xl sm:text-3xl italic text-foreground text-center mb-8 sm:mb-12">
            Four modes, one assistant
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{f.icon}</span>
                  <h4 className="text-lg font-semibold text-foreground">{f.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 sm:px-8 py-12 sm:py-16 bg-card/30" id="how-it-works">
        <div className="max-w-3xl mx-auto">
          <h3 className="font-serif text-2xl sm:text-3xl italic text-foreground text-center mb-8 sm:mb-12">
            How it works
          </h3>
          <div className="flex flex-col gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground">{item.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="px-5 sm:px-8 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="font-serif text-2xl sm:text-3xl italic text-foreground mb-6">
            Built with Google Cloud
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {["Gemini 2.5 Flash", "Vertex AI", "Google ADK", "Cloud Run", "Firestore", "Cloud Storage", "Firebase Auth"].map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback Form */}
      <section className="px-5 sm:px-8 py-12 sm:py-16 bg-card/30" id="feedback">
        <div className="max-w-lg mx-auto">
          <h3 className="font-serif text-2xl sm:text-3xl italic text-foreground text-center mb-2">
            Share your feedback
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Help us improve SightLine. Type or speak your feedback below.
          </p>

          {submitted ? (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
              <p className="text-green-400 font-semibold text-lg mb-1">Thank you!</p>
              <p className="text-sm text-muted-foreground">Your feedback has been submitted.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Your name"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Your email"
                />
              </div>

              <div className="relative">
                <textarea
                  placeholder="Tell us what you think — type or tap the mic to speak..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  aria-label="Your feedback message"
                />
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    isListening
                      ? "bg-red-500/20 text-red-400 animate-pulse"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  title={isListening ? "Listening... tap to stop" : "Speak your feedback"}
                >
                  {isListening ? "⏹" : "🎤"}
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !feedbackText.trim()}
                className="rounded-full bg-foreground px-6 py-3.5 text-base font-semibold text-background hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Sending..." : "Submit Feedback"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 sm:px-8 py-6 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p className="font-serif italic text-sm text-foreground">SightLine</p>
          <div className="flex gap-4">
            <Link href="/guide" className="hover:text-foreground transition-colors">Guide</Link>
            <Link href="/legal" className="hover:text-foreground transition-colors">Legal</Link>
            <Link href="/live" className="hover:text-foreground transition-colors">Launch App</Link>
          </div>
          <p>Built for the Gemini API Developer Competition</p>
        </div>
      </footer>
    </div>
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
