/**
 * Browser TTS utility for accessibility announcements.
 * Used to guide blind users through permission prompts and app state.
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, interrupt = true) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  if (interrupt) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  // Prefer English voice
  const voices = window.speechSynthesis.getVoices();
  const english = voices.find((v) => v.lang.startsWith("en") && v.default)
    || voices.find((v) => v.lang.startsWith("en"));
  if (english) utterance.voice = english;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}
