export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || "";
export const SAMPLE_RATE_IN = 16000;   // mic input
export const SAMPLE_RATE_OUT = 24000;  // audio playback
export const CAPTURE_FPS = 1;          // camera frames per second
export const JPEG_QUALITY = 0.6;
export const CAPTURE_FPS_LOW = 0.5;    // low-power: 1 frame every 2s
export const JPEG_QUALITY_LOW = 0.4;   // low-power: reduced quality
export const RECONNECT_BASE_DELAY = 1000;
export const RECONNECT_MAX_DELAY = 30000;
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export const MODES = ["navigation", "reading", "shopping", "social", "screen", "story"] as const;
export type Mode = (typeof MODES)[number];

export const MODE_LABELS: Record<Mode, string> = {
  navigation: "Navigate",
  reading: "Read",
  shopping: "Shop",
  social: "Social",
  screen: "Screen",
  story: "Story",
};

export const MODE_COLORS: Record<Mode, string> = {
  navigation: "bg-blue-600 hover:bg-blue-700",
  reading: "bg-emerald-600 hover:bg-emerald-700",
  shopping: "bg-amber-600 hover:bg-amber-700",
  social: "bg-purple-600 hover:bg-purple-700",
  screen: "bg-violet-600 hover:bg-violet-700",
  story: "bg-rose-600 hover:bg-rose-700",
};

export const MODE_ICONS: Record<Mode, string> = {
  navigation: "🧭",
  reading: "📖",
  shopping: "🛒",
  social: "👥",
  screen: "🖥️",
  story: "✍️",
};

export const MODE_DESCRIPTIONS: Record<Mode, string> = {
  navigation: "Obstacles & directions",
  reading: "Signs, labels & text",
  shopping: "Products & prices",
  social: "People & expressions",
  screen: "UI help & navigation",
  story: "Creative stories & images",
};
