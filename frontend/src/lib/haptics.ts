/**
 * Haptic feedback patterns for accessibility.
 * Uses the Vibration API (mobile browsers only).
 */

const patterns = {
  modeSwitch: [50, 30, 50],
  emergency: [200, 100, 200, 100, 400],
  connected: [100],
  disconnected: [80, 50, 80],
  warning: [100, 50, 100],
  error: [300, 100, 300],
} as const;

export type HapticPattern = keyof typeof patterns;

export function vibrate(pattern: HapticPattern) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(patterns[pattern]);
  }
}
