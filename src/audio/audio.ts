// Metronome clicks and a simple guide-track voice. The player's own piano makes its own sound,
// so the app only plays clicks and (optionally) the notes to follow.

let ctx: AudioContext | undefined;

export function audio(): AudioContext {
  ctx ??= new AudioContext({ latencyHint: 'interactive' });
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** How late sound reaches the speakers, in ms. */
export function outputLatencyMs(): number {
  const c = audio();
  return ((c.outputLatency || 0) + (c.baseLatency || 0)) * 1000;
}

/** AudioContext time for a moment on the performance.now() clock. */
function at(perfMs: number): number {
  const c = audio();
  return Math.max(c.currentTime, c.currentTime + (perfMs - performance.now()) / 1000);
}

const scheduled = new Set<AudioScheduledSourceNode>();

function track(n: AudioScheduledSourceNode) {
  scheduled.add(n);
  n.onended = () => scheduled.delete(n);
}

export function click(perfMs: number, accent: boolean) {
  const c = audio();
  const t = at(perfMs);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.frequency.value = accent ? 1760 : 1100;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.06);
  track(osc);
}

const freq = (writtenMidi: number) => 440 * 2 ** ((writtenMidi - 69) / 12);

/** A soft piano-ish tone at the written pitch. */
export function tone(writtenMidi: number, perfMs: number, durMs: number, volume = 0.25) {
  const c = audio();
  const t = at(perfMs);
  const d = Math.max(0.08, durMs / 1000);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(volume * 0.4, t + Math.min(0.3, d));
  gain.gain.setValueAtTime(volume * 0.4, t + d * 0.9);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
  gain.connect(c.destination);
  for (const [mult, type, level] of [[1, 'triangle', 1], [2, 'sine', 0.3]] as const) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq(writtenMidi) * mult;
    g.gain.value = level;
    osc.connect(g).connect(gain);
    osc.start(t);
    osc.stop(t + d + 0.05);
    track(osc);
  }
}

export function stopAll() {
  for (const n of scheduled) {
    try { n.stop(); } catch { /* already stopped */ }
  }
  scheduled.clear();
}
