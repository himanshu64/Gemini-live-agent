"use client";
import { useCallback, useEffect, useState } from "react";
import { usePageAnimations } from "@/hooks/usePageAnimations";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import { speak } from "@/lib/speak";
import { speechConfig } from "@/lib/speak";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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
  const { uid, getToken } = useAuth();
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

  return (
    <main ref={pageRef} className="flex min-h-dvh flex-col">
      <header data-gsap="page-header" className="flex items-center justify-between px-5 py-4">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="rounded-full text-xs" render={<Link href="/" />}>
            Back
          </Button>
        </div>
      </header>

      <div data-gsap="page-content" className="flex flex-1 flex-col gap-4 px-5 pb-5">
        {saving && (
          <p className="text-xs text-blue-400 animate-pulse" aria-live="polite">Saving...</p>
        )}

        {/* Speech Rate */}
        <Card data-gsap="fade-up" className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Speech Rate</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Verbosity */}
        <Card data-gsap="fade-up" className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Verbosity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2" role="radiogroup" aria-label="Verbosity level">
              {VERBOSITY_OPTIONS.map((opt) => {
                const isActive = (prefs.verbosity || "normal") === opt;
                return (
                  <button
                    key={opt}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => savePref("verbosity", opt)}
                    className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-all duration-200 ${
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
          </CardContent>
        </Card>

        {/* Language */}
        <Card data-gsap="fade-up" className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Language</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Font Size */}
        <Card data-gsap="fade-up" className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Font Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Font size">
              {FONT_SIZE_OPTIONS.map((opt) => {
                const isActive = (prefs.font_size || "medium") === opt;
                return (
                  <button
                    key={opt}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => savePref("font_size", opt)}
                    className={`rounded-full py-2.5 text-sm font-medium transition-all duration-200 ${
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
          </CardContent>
        </Card>

        <Separator className="opacity-50" />

        {/* Toggles */}
        <Card data-gsap="fade-up" className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Accessibility</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
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
                {i < arr.length - 1 && <Separator className="mt-5 opacity-30" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
