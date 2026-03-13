export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || "";
export const SAMPLE_RATE_IN = 16000;   // mic input
export const SAMPLE_RATE_OUT = 24000;  // audio playback
export const CAPTURE_FPS = 1;          // camera frames per second
export const JPEG_QUALITY = 0.6;
export const RECONNECT_BASE_DELAY = 1000;
export const RECONNECT_MAX_DELAY = 30000;

export const MODES = ["navigation", "reading", "shopping", "social"] as const;
export type Mode = (typeof MODES)[number];

export const MODE_LABELS: Record<Mode, string> = {
  navigation: "Navigate",
  reading: "Read",
  shopping: "Shop",
  social: "Social",
};

export const MODE_COLORS: Record<Mode, string> = {
  navigation: "bg-blue-600 hover:bg-blue-700",
  reading: "bg-emerald-600 hover:bg-emerald-700",
  shopping: "bg-amber-600 hover:bg-amber-700",
  social: "bg-purple-600 hover:bg-purple-700",
};

export const MODE_ICONS: Record<Mode, string> = {
  navigation: "🧭",
  reading: "📖",
  shopping: "🛒",
  social: "👥",
};
