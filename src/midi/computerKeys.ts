import { midi } from './input';

// Play the app from the computer keyboard, for testing without a MIDI keyboard. The home row is
// the white keys from C up (A = C, S = D, ... ' = F an octave up), the row above is the black
// keys, Z / X move an octave down / up, and Space is the sustain pedal. Notes go through the same
// path as a real keyboard.

export const PORT = 'Computer keyboard';

/** Semitones above the base C for each key, by KeyboardEvent.code (layout independent). */
export const KEY_SEMITONES: Readonly<Record<string, number>> = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9,
  KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};
const LETTER: Record<string, string> = { Semicolon: ';', Quote: "'" };
export const letterOf = (code: string) => LETTER[code] ?? code.slice(3);
export const MAX_SHIFT = 4;

/** The device note a key plays, or undefined if it is not a piano key or falls off MIDI's range. */
export function noteFor(code: string, middleC: number, shift: number): number | undefined {
  const st = KEY_SEMITONES[code];
  if (st === undefined) return undefined;
  const n = middleC + 12 * shift + st;
  return n >= 0 && n <= 127 ? n : undefined;
}

/** Keys typed into a form field are text, not notes. */
export function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button'].includes((el as HTMLInputElement).type);
}

export class ComputerKeys {
  private on = false;
  private _shift = 0;
  /** Key code -> the note it started, so an octave change mid-hold still releases the right key. */
  private down = new Map<string, number>();
  private pedal = false;
  private listeners = new Set<() => void>();
  /** Where middle C is on the current keyboard (calibration or demo). */
  middleC: () => number = () => 60;
  /** While false (e.g. during the demo) real key presses are ignored. */
  allow: () => boolean = () => true;

  get enabled() { return this.on; }
  get shift() { return this._shift; }

  enable(on: boolean) {
    if (on === this.on) return;
    this.on = on;
    if (typeof window !== 'undefined') {
      if (on) {
        window.addEventListener('keydown', this.keydown);
        window.addEventListener('keyup', this.keyup);
        window.addEventListener('blur', this.releaseAll);
      } else {
        window.removeEventListener('keydown', this.keydown);
        window.removeEventListener('keyup', this.keyup);
        window.removeEventListener('blur', this.releaseAll);
        this.releaseAll();
      }
    }
    midi.setVirtual(PORT, on);
    this.changed();
  }

  setShift(n: number) {
    const v = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, n));
    if (v === this._shift) return;
    this._shift = v;
    this.changed();
  }

  /** The letter that plays this device note right now, if any. */
  letterFor(note: number): string | undefined {
    for (const code of Object.keys(KEY_SEMITONES)) if (noteFor(code, this.middleC(), this._shift) === note) return letterOf(code);
    return undefined;
  }

  /** Press a key by code. Also used by the demo to show the mode without real typing. */
  press(code: string): boolean {
    if (code === 'Space') {
      if (!this.pedal) { this.pedal = true; midi.injectPedal(true, PORT); }
      return true;
    }
    if (code === 'KeyZ' || code === 'KeyX') {
      this.setShift(this._shift + (code === 'KeyZ' ? -1 : 1));
      return true;
    }
    if (this.down.has(code)) return KEY_SEMITONES[code] !== undefined;
    const n = noteFor(code, this.middleC(), this._shift);
    if (n === undefined) return KEY_SEMITONES[code] !== undefined;
    this.down.set(code, n);
    midi.inject('on', n, 80, PORT);
    return true;
  }

  release(code: string) {
    if (code === 'Space') {
      if (this.pedal) { this.pedal = false; midi.injectPedal(false, PORT); }
      return;
    }
    const n = this.down.get(code);
    if (n === undefined) return;
    this.down.delete(code);
    midi.inject('off', n, 0, PORT);
  }

  releaseAll = () => {
    for (const code of [...this.down.keys()]) this.release(code);
    this.release('Space');
  };

  onChange(l: () => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private changed() {
    this.listeners.forEach((l) => l());
  }

  private keydown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || !this.allow()) return;
    if (e.repeat) {
      if (KEY_SEMITONES[e.code] !== undefined || e.code === 'Space') e.preventDefault();
      return;
    }
    if (this.press(e.code)) e.preventDefault(); // ' opens quick find in Firefox
  };

  private keyup = (e: KeyboardEvent) => this.release(e.code);
}

export const computerKeys = new ComputerKeys();
