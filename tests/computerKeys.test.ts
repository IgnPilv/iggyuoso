import { describe, expect, it } from 'vitest';
import { ComputerKeys, letterOf, noteFor, PORT } from '../src/midi/computerKeys';
import { midi, type NoteEvent } from '../src/midi/input';

describe('computer keyboard', () => {
  it('maps the home row to white keys and the row above to black keys', () => {
    const white = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'];
    expect(white.map((c) => noteFor(c, 60, 0))).toEqual([60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77]);
    const black = ['KeyW', 'KeyE', 'KeyT', 'KeyY', 'KeyU', 'KeyO', 'KeyP'];
    expect(black.map((c) => noteFor(c, 60, 0))).toEqual([61, 63, 66, 68, 70, 73, 75]);
    expect(noteFor('KeyR', 60, 0)).toBeUndefined(); // no black key between E and F
    expect(noteFor('KeyI', 60, 0)).toBeUndefined(); // nor between B and C
    expect(letterOf('Quote')).toBe("'");
    expect(letterOf('KeyA')).toBe('A');
  });

  it('follows the calibrated middle C and the octave shift', () => {
    expect(noteFor('KeyA', 48, 0)).toBe(48); // keyboard set an octave low
    expect(noteFor('KeyA', 60, -2)).toBe(36);
    expect(noteFor('KeyA', 60, 6)).toBeUndefined(); // past MIDI's top
  });

  it('plays through the MIDI path and releases the key it pressed after an octave change', () => {
    const k = new ComputerKeys();
    const seen: NoteEvent[] = [];
    const ports: string[] = [];
    const off = midi.onNote((e) => seen.push(e));
    const offRaw = midi.onRaw((e) => ports.push(e.port));
    k.press('KeyA');
    k.press('KeyA'); // held: no second note
    k.press('KeyX'); // octave up while A is held
    k.release('KeyA');
    k.press('KeyA');
    k.release('KeyA');
    off(); offRaw();
    expect(seen.map((e) => `${e.type}${e.note}`)).toEqual(['on60', 'off60', 'on72', 'off72']);
    expect(ports.every((p) => p === PORT)).toBe(true);
    expect(k.letterFor(72)).toBe('A');
    expect(k.letterFor(60)).toBeUndefined();
  });

  it('shows up as an input while switched on', () => {
    const k = new ComputerKeys();
    k.enable(true);
    expect(midi.inputNames()).toContain(PORT);
    k.enable(false);
    expect(midi.inputNames()).not.toContain(PORT);
  });
});
