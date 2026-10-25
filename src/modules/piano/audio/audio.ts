// Metronome clicks and a simple guide-track voice. The player's own piano makes its own sound,
// so the app only plays clicks and (optionally) the notes to follow.

let ctx: AudioContext | undefined;

export function audio(): AudioContext {
  if (!ctx) {
    // On iPhone and iPad, web sound follows the ring/silent switch unless the page asks to be
    // played like media (Safari 16.4+).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) try { session.type = 'playback'; } catch { /* not supported */ }
    ctx = new AudioContext({ latencyHint: 'interactive' });
  }
  // 'suspended' before a tap (autoplay rules), 'interrupted' on iOS after a call or the lock screen.
  if (ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Browsers only let sound start from a tap or key press. The context is often made earlier (samples
 * load when a screen opens), so every tap and key press wakes it, and the first one also plays a
 * silent buffer, which older iOS needs before it plays anything.
 */
let primed = false;
function unlock() {
  const c = audio();
  if (primed) return;
  primed = true;
  const src = c.createBufferSource();
  src.buffer = c.createBuffer(1, 1, c.sampleRate);
  src.connect(c.destination);
  src.start();
}
if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'touchend', 'keydown'] as const) window.addEventListener(type, unlock, { capture: true, passive: true });
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

// ---------------------------------------------------------------- sampled piano

// Salamander Grand Piano samples every minor third (public/piano, see CREDITS.txt). Each note
// plays the nearest sample, re-pitched. Samples load on first use; until one is ready the note
// falls back to tone().

const SAMPLE_NAMES = ['C', 'Ds', 'Fs', 'A'];
/** Written MIDI numbers with a sample: A0 (21) to C8 (108). */
export const SAMPLED = Array.from({ length: 30 }, (_, i) => 21 + 3 * i);
const sampleFile = (m: number) => `${SAMPLE_NAMES[(((m % 12) / 3) | 0)]}${Math.floor(m / 12) - 1}.mp3`;
const buffers = new Map<number, AudioBuffer>();
const loading = new Map<number, Promise<void>>();

export const nearestSample = (m: number) => SAMPLED.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));

function loadSample(s: number): Promise<void> {
  let p = loading.get(s);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}piano/${sampleFile(s)}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
      .then((data) => audio().decodeAudioData(data))
      .then((b) => void buffers.set(s, b))
      .catch((e) => { loading.delete(s); console.warn('piano sample', s, e); });
    loading.set(s, p);
  }
  return p;
}

/** Start loading the samples these written notes need (all of them if none given). */
export function loadPiano(notes: number[] = SAMPLED): Promise<void> {
  return Promise.all([...new Set(notes.map(nearestSample))].map(loadSample)).then(() => {});
}

/** A sampled piano note at the written pitch (synth tone while the sample is still loading). */
export function piano(writtenMidi: number, perfMs: number, durMs: number, volume = 0.6) {
  const s = nearestSample(writtenMidi);
  const buf = buffers.get(s);
  if (!buf) {
    void loadSample(s);
    tone(writtenMidi, perfMs, durMs, volume * 0.45);
    return;
  }
  const c = audio();
  const t = at(perfMs);
  const d = Math.max(0.1, durMs / 1000);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 2 ** ((writtenMidi - s) / 12);
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.setValueAtTime(volume, t + d);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35); // the damper
  src.connect(gain).connect(c.destination);
  src.start(t);
  src.stop(t + d + 0.4);
  track(src);
}

export function stopAll() {
  for (const n of scheduled) {
    try { n.stop(); } catch { /* already stopped */ }
  }
  scheduled.clear();
}

// ---------------------------------------------------------------- drums (the Jam room's band)

let noise: AudioBuffer | undefined;
function noiseBuffer(c: AudioContext) {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** A synthetic drum: kick (a falling sine), snare (noise and a body) or hi-hat (high noise). */
export function drum(part: 'kick' | 'snare' | 'hat', perfMs: number, level = 0.5) {
  const c = audio();
  const t = at(perfMs);
  const out = c.createGain();
  out.connect(c.destination);
  if (part === 'kick') {
    const osc = c.createOscillator();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    out.gain.setValueAtTime(level, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(out);
    osc.start(t);
    osc.stop(t + 0.32);
    track(osc);
    return;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = part === 'hat' ? 'highpass' : 'bandpass';
  filter.frequency.value = part === 'hat' ? 7000 : 1800;
  const len = part === 'hat' ? 0.05 : 0.16;
  out.gain.setValueAtTime(level * (part === 'hat' ? 0.5 : 0.8), t);
  out.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(filter).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + len + 0.02);
  track(src);
  if (part === 'snare') {
    const body = c.createOscillator();
    const g = c.createGain();
    body.frequency.value = 190;
    g.gain.setValueAtTime(level * 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    body.connect(g).connect(c.destination);
    body.start(t);
    body.stop(t + 0.12);
    track(body);
  }
}
