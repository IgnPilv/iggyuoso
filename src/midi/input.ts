// Web MIDI input. Listens to every connected input and turns raw messages into note events with
// a timestamp on the performance.now() clock.

export interface NoteEvent {
  type: 'on' | 'off';
  note: number;
  velocity: number;
  time: number;
}

/** The sustain pedal (CC 64): down at 64 and above. */
export interface PedalEvent {
  down: boolean;
  time: number;
}

export interface RawEvent {
  data: number[];
  time: number;
  port: string;
  /** True when the MIDI timestamp looked wrong and performance.now() was used instead. */
  fallbackClock: boolean;
}

type Listener<T> = (e: T) => void;

/** MIDI timestamps share performance.now()'s clock, but some drivers send 0 or junk. */
export const MAX_CLOCK_SKEW_MS = 1000;

export function sanitizeTimestamp(ts: number, now: number): { time: number; fallback: boolean } {
  if (!(ts > 0) || Math.abs(now - ts) > MAX_CLOCK_SKEW_MS) return { time: now, fallback: true };
  return { time: ts, fallback: false };
}

/** Decode one MIDI message into a note event, if it is one. Note-on with velocity 0 is a note-off. */
export function decodeNote(data: ArrayLike<number>, time: number): NoteEvent | undefined {
  const status = data[0] & 0xf0;
  if (status === 0x90 && data[2] > 0) return { type: 'on', note: data[1], velocity: data[2], time };
  if (status === 0x80 || (status === 0x90 && data[2] === 0)) return { type: 'off', note: data[1], velocity: 0, time };
  return undefined;
}

/** Decode a sustain-pedal message (control change 64 on any channel), if it is one. */
export function decodePedal(data: ArrayLike<number>, time: number): PedalEvent | undefined {
  if ((data[0] & 0xf0) !== 0xb0 || data[1] !== 64) return undefined;
  return { down: data[2] >= 64, time };
}

export class MidiInput {
  private access?: MIDIAccess;
  private noteListeners = new Set<Listener<NoteEvent>>();
  private rawListeners = new Set<Listener<RawEvent>>();
  private pedalListeners = new Set<Listener<PedalEvent>>();
  /** The sustain pedal is down. */
  pedalDown = false;
  private portListeners = new Set<() => void>();
  readonly held = new Set<number>();
  /** Inputs that are not Web MIDI ports, such as the computer keyboard. */
  private virtual = new Set<string>();

  static supported() {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  get ready() {
    return !!this.access;
  }

  /** The browser (or the player) refused MIDI access. */
  blocked = false;

  async start(): Promise<void> {
    if (this.access) return;
    if (!MidiInput.supported()) throw new Error('This browser has no Web MIDI. Please use Chrome or Edge.');
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch (e) {
      this.blocked = true;
      throw e;
    }
    this.access.onstatechange = () => {
      this.attach();
      this.portListeners.forEach((l) => l());
    };
    this.attach();
  }

  inputNames(): string[] {
    const ports = this.access ? [...this.access.inputs.values()].filter((i) => i.state === 'connected').map((i) => i.name ?? 'MIDI input') : [];
    return [...ports, ...this.virtual];
  }

  setVirtual(name: string, on: boolean) {
    if (on === this.virtual.has(name)) return;
    if (on) this.virtual.add(name);
    else this.virtual.delete(name);
    this.portListeners.forEach((l) => l());
  }

  private attach() {
    for (const input of this.access!.inputs.values()) {
      input.onmidimessage = (e) => this.handle(e, input.name ?? 'MIDI input');
    }
  }

  private handle(e: MIDIMessageEvent, port: string) {
    if (!e.data) return;
    const { time, fallback } = sanitizeTimestamp(e.timeStamp, performance.now());
    this.dispatch(Array.from(e.data), time, port, fallback);
  }

  /** Play a key from software (demo pianist, computer keyboard), exactly as if it came from a keyboard. */
  inject(type: 'on' | 'off', note: number, velocity = 80, port = 'Demo pianist') {
    this.dispatch(type === 'on' ? [0x90, note, velocity] : [0x80, note, 0], performance.now(), port, false);
  }

  /** Press or lift the sustain pedal from software. */
  injectPedal(down: boolean, port = 'Demo pianist') {
    this.dispatch([0xb0, 64, down ? 127 : 0], performance.now(), port, false);
  }

  private dispatch(data: number[], time: number, port: string, fallback: boolean) {
    if (data[0] === 0xfe || data[0] === 0xf8) return; // active sensing / clock
    this.rawListeners.forEach((l) => l({ data, time, port, fallbackClock: fallback }));
    const pedal = decodePedal(data, time);
    if (pedal) {
      if (pedal.down === this.pedalDown) return; // pianos send a stream of values while it moves
      this.pedalDown = pedal.down;
      this.pedalListeners.forEach((l) => l(pedal));
      return;
    }
    const note = decodeNote(data, time);
    if (!note) return;
    if (note.type === 'on') this.held.add(note.note);
    else this.held.delete(note.note);
    this.noteListeners.forEach((l) => l(note));
  }

  onNote(l: Listener<NoteEvent>) {
    this.noteListeners.add(l);
    return () => this.noteListeners.delete(l);
  }

  onPedal(l: Listener<PedalEvent>) {
    this.pedalListeners.add(l);
    return () => this.pedalListeners.delete(l);
  }

  onRaw(l: Listener<RawEvent>) {
    this.rawListeners.add(l);
    return () => this.rawListeners.delete(l);
  }

  onPorts(l: () => void) {
    this.portListeners.add(l);
    return () => this.portListeners.delete(l);
  }
}

export const midi = new MidiInput();
