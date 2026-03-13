"use client";
import { useCallback, useEffect, useState } from "react";
import { usePageAnimations } from "@/hooks/usePageAnimations";
import { useAuthContext } from "@/lib/auth/auth-provider";
import { API_URL } from "@/lib/constants";
import { speak } from "@/lib/speak";
import { speechConfig } from "@/lib/speak";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "zh", label: "Chinese" },
];

const VERBOSITY_OPTIONS = ["brief", "normal", "detailed"];
const FONT_SIZE_OPTIONS = ["small", "medium", "large", "extra-large"];

interface Preferences {
  speech_rate?: string;
  verbosity?: string;
  language?: string;
  contrast?: string;
  font_size?: string;
  haptic_feedback?: string;
  audio_descriptions?: string;
  auto_capture?: string;
}

export default function SettingsPage() {
  const pageRef = usePageAnimations();
  const { user, getToken } = useAuthContext();
  const uid = user?.id;
  const [prefs, setPrefs] = useState<Preferences>({});
  const [saving, setSaving] = useState(false);

  const fetchPrefs = useCallback(async () => {
    if (!uid) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences || {});
        if (data.preferences?.speech_rate) {
          speechConfig.rate = parseFloat(data.preferences.speech_rate);
        }
      }
    } catch {
      // silently fail on load
    }
  }, [uid, getToken]);

  useEffect(() => {
    if (uid) fetchPrefs();
  }, [uid, fetchPrefs]);

  const savePref = useCallback(
    async (key: string, value: string) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
      setSaving(true);
      try {
        const token = await getToken();
        await fetch(`${API_URL}/api/preferences`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ key, value }),
        });
        speak(`${key.replace(/_/g, " ")} set to ${value}`);
      } catch {
        speak("Failed to save setting");
      } finally {
        setSaving(false);
      }
    },
    [getToken]
  );

  const isToggled = (key: keyof Preferences) => prefs[key] === "true";

  const NAV_LINKS = [
    { href: "/live", label: "Live" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/rewards", label: "Rewards" },
    { href: "/", label: "Home" },
  ];

  return (
    <main ref={pageRef} className="flex min-h-dvh flex-col bg-background">
      {/* ── Header ── */}
      <header
        data-gsap="page-header"
        className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50"
      >
        <div className="max-w-6xl mx-auto w-full px-5 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">S</span>
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">Settings</h1>
          </div>
          <nav className="flex items-center gap-1.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Content ── */}
      <div data-gsap="page-content" className="max-w-6xl mx-auto w-full px-5 py-6 flex flex-col gap-5">
        {saving && (
          <p className="text-xs text-blue-400 animate-pulse" aria-live="polite">Saving...</p>
        )}

        {/* Speech Rate */}
        <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Speech Rate</h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground w-8">0.5x</span>
            <Slider
              min={5}
              max={20}
              step={1}
              value={[Math.round(parseFloat(prefs.speech_rate || "1.1") * 10)]}
              onValueChange={(value) => {
                const vals = Array.isArray(value) ? value : [value];
                const rate = (vals[0] / 10).toFixed(1);
                speechConfig.rate = parseFloat(rate);
                savePref("speech_rate", rate);
              }}
              aria-label={`Speech rate: ${prefs.speech_rate || "1.1"}x`}
            />
            <span className="text-xs text-muted-foreground w-8">2.0x</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">{prefs.speech_rate || "1.1"}x</p>
        </div>

        {/* Verbosity */}
        <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Verbosity</h2>
          <div className="flex gap-2" role="radiogroup" aria-label="Verbosity level">
            {VERBOSITY_OPTIONS.map((opt) => {
              const isActive = (prefs.verbosity || "normal") === opt;
              return (
                <button
                  key={opt}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => savePref("verbosity", opt)}
                  className={`flex-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-foreground text-background"
                      : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Language */}
        <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Language</h2>
          <Select
            value={prefs.language || "en"}
            onValueChange={(value) => {
              if (value) savePref("language", value);
            }}
          >
            <SelectTrigger className="w-full rounded-xl" aria-label="Select language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Size */}
        <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Font Size</h2>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Font size">
            {FONT_SIZE_OPTIONS.map((opt) => {
              const isActive = (prefs.font_size || "medium") === opt;
              return (
                <button
                  key={opt}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => savePref("font_size", opt)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-foreground text-background"
                      : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1).replace("-", " ")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Accessibility Toggles */}
        <div data-gsap="fade-up" className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border/50 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Accessibility</h2>
          <div className="flex flex-col gap-5">
            {[
              { id: "contrast", label: "High Contrast", checked: prefs.contrast === "high", onChange: (c: boolean) => savePref("contrast", c ? "high" : "normal") },
              { id: "haptic", label: "Haptic Feedback", checked: isToggled("haptic_feedback"), onChange: (c: boolean) => savePref("haptic_feedback", String(c)) },
              { id: "audio-desc", label: "Audio Descriptions", checked: isToggled("audio_descriptions"), onChange: (c: boolean) => savePref("audio_descriptions", String(c)) },
              { id: "auto-capture", label: "Auto Capture", checked: isToggled("auto_capture"), onChange: (c: boolean) => savePref("auto_capture", String(c)) },
            ].map((toggle, i, arr) => (
              <div key={toggle.id}>
                <div className="flex items-center justify-between">
                  <label htmlFor={`${toggle.id}-switch`} className="text-sm font-medium text-card-foreground">
                    {toggle.label}
                  </label>
                  <Switch
                    id={`${toggle.id}-switch`}
                    checked={toggle.checked}
                    onCheckedChange={toggle.onChange}
                    aria-label={`Toggle ${toggle.label.toLowerCase()}`}
                  />
                </div>
                {i < arr.length - 1 && <div className="mt-5 border-t border-border/30" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
