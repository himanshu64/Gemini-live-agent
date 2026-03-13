/**
 * Browser TTS utility for accessibility announcements.
 * Used to guide blind users through permission prompts and app state.
 */

export const speechConfig = { rate: 1.1, volume: 1.0 };

export function speak(text: string, interrupt = true) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  if (interrupt) {
    window.speechSynthesis.cancel();
  }

  const voices = window.speechSynthesis.getVoices();
  const english = voices.find((v) => v.lang.startsWith("en") && v.default)
    || voices.find((v) => v.lang.startsWith("en"));

  // Split long text into chunks — Chrome silently fails on long utterances
  const MAX_CHUNK = 200;
  const sentences = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [text];
  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (buf.length + s.length > MAX_CHUNK && buf) {
      chunks.push(buf.trim());
      buf = "";
    }
    buf += s;
  }
  if (buf.trim()) chunks.push(buf.trim());

  chunks.forEach((chunk, i) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = speechConfig.rate;
    utterance.pitch = 1.0;
    utterance.volume = speechConfig.volume;
    if (english) utterance.voice = english;
    // Small delay between chunks to prevent queueing issues
    if (i === 0) {
      window.speechSynthesis.speak(utterance);
    } else {
      utterance.volume = speechConfig.volume;
      window.speechSynthesis.speak(utterance);
    }
  });
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
}
