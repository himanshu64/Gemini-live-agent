/**
 * Spatial audio cue sounds using Web Audio API.
 * Short chimes so blind users get instant feedback on state changes.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", gain = 0.15) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch {
    // Audio not available
  }
}

/** Rising two-tone chime — connected */
export function soundConnected() {
  playTone(440, 0.12, "sine", 0.12);
  setTimeout(() => playTone(660, 0.18, "sine", 0.12), 100);
}

/** Falling two-tone — disconnected */
export function soundDisconnected() {
  playTone(520, 0.12, "sine", 0.1);
  setTimeout(() => playTone(340, 0.2, "sine", 0.1), 100);
}

/** Short click — mode change */
export function soundModeChange() {
  playTone(880, 0.06, "triangle", 0.1);
}

/** Quick double-beep — error */
export function soundError() {
  playTone(280, 0.1, "square", 0.08);
  setTimeout(() => playTone(280, 0.1, "square", 0.08), 140);
}

/** Soft ping — notification/toast */
export function soundNotification() {
  playTone(700, 0.08, "sine", 0.08);
}

/** Gentle tick — reconnecting attempt */
export function soundReconnecting() {
  playTone(400, 0.05, "sine", 0.06);
}
