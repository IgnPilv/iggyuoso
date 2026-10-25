import { audio, pianoHold } from '../audio/audio';
import { midi } from '../midi/input';

// Keys drawn on the screen (the keyboard picture and the falling notes' keys) can be played with
// a mouse or a finger. A tap goes through the same path as a real key (`midi.inject`), so every
// exercise hears it as an answer, and sounds the sampled piano (a real piano makes its own sound,
// a picture doesn't). Sliding along the keys plays each key the finger crosses.

export const TAP_PORT = 'On-screen keys';

let taps = 0;
/** How many keys have been tapped so far. A timed take that saw one is practice (see players.ts). */
export const tapCount = () => taps;

/** Device note -> release of the sound it started. */
const sounding = new Map<number, () => void>();

/** Press a key as a tap would: the note goes in as played, and it sounds. `offset` = device - written. */
export function tapOn(device: number, offset: number) {
  if (sounding.has(device)) return;
  taps++;
  audio();
  sounding.set(device, pianoHold(device - offset, 0.55));
  midi.inject('on', device, 80, TAP_PORT);
}

export function tapOff(device: number) {
  const release = sounding.get(device);
  if (!release) return;
  sounding.delete(device);
  release();
  midi.inject('off', device, 0, TAP_PORT);
}

/**
 * Make `el` playable: `keyAt` says which device key a pointer event is over (or none).
 * Returns a function that unbinds it. A tap on a key never reaches the page's own click handlers
 * (a phone on its side shows its controls on a tap on the notes).
 */
export function bindTaps(el: HTMLElement | SVGElement, keyAt: (e: PointerEvent) => number | undefined, offset: () => number): () => void {
  /** Pointer id -> the key it holds down. */
  const down = new Map<number, number>();
  let swallow = false;
  const press = (id: number, key: number | undefined) => {
    const was = down.get(id);
    if (was === key) return;
    if (was !== undefined) { down.delete(id); if (![...down.values()].includes(was)) tapOff(was); }
    if (key !== undefined) { down.set(id, key); tapOn(key, offset()); }
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const key = keyAt(e);
    swallow = key !== undefined;
    if (key === undefined) return;
    e.preventDefault(); // no text selection, no focus change
    try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    press(e.pointerId, key);
  };
  const onMove = (e: PointerEvent) => {
    if (!down.has(e.pointerId)) return;
    press(e.pointerId, keyAt(e));
  };
  const onUp = (e: PointerEvent) => press(e.pointerId, undefined);
  const onClick = (e: Event) => { if (swallow) { e.stopPropagation(); swallow = false; } };
  const node = el as HTMLElement;
  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onUp);
  node.addEventListener('lostpointercapture', onUp);
  node.addEventListener('click', onClick);
  el.classList.add('tappable');
  return () => {
    for (const id of [...down.keys()]) press(id, undefined);
    node.removeEventListener('pointerdown', onDown);
    node.removeEventListener('pointermove', onMove);
    node.removeEventListener('pointerup', onUp);
    node.removeEventListener('pointercancel', onUp);
    node.removeEventListener('lostpointercapture', onUp);
    node.removeEventListener('click', onClick);
    el.classList.remove('tappable');
  };
}
