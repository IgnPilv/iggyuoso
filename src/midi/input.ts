// Web MIDI input. Listens to every connected input and turns raw messages into note events with
// a timestamp on the performance.now() clock.

export interface NoteEvent {
  type: 'on' | 'off';
  note: number;
  velocity: number;
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

export class MidiInput {
  private access?: MIDIAccess;
  private noteListeners = new Set<Listener<NoteEvent>>();
  private rawListeners = new Set<Listener<RawEvent>>();
  private portListeners = new Set<() => void>();
  readonly held = new Set<number>();

  static supported() {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  get ready() {
    return !!this.access;
  }

  async start(): Promise<void> {
    if (this.access) return;
    if (!MidiInput.supported()) throw new Error('This browser has no Web MIDI. Please use Chrome or Edge.');
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.access.onstatechange = () => {
      this.attach();
      this.portListeners.forEach((l) => l());
    };
    this.attach();
  }

  inputNames(): string[] {
    if (!this.access) return [];
    return [...this.access.inputs.values()].filter((i) => i.state === 'connected').map((i) => i.name ?? 'MIDI input');
  }

  private attach() {
    for (const input of this.access!.inputs.values()) {
      input.onmidimessage = (e) => this.handle(e, input.name ?? 'MIDI input');
    }
  }

  private handle(e: MIDIMessageEvent, port: string) {
    if (!e.data) return;
    const { time, fallback } = sanitizeTimestamp(e.timeStamp, performance.now());
    const data = Array.from(e.data);
    if (data[0] === 0xfe || data[0] === 0xf8) return; // active sensing / clock
    this.rawListeners.forEach((l) => l({ data, time, port, fallbackClock: fallback }));
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
