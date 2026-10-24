import { describe, expect, it } from 'vitest';
import { defaultHands, readSong, writeSong } from '../src/music/importSong';
import { keyName, MidiFileError, parseMidiFile, writeMidiFile } from '../src/music/midiFile';
import { addMySong, deleteMySong, getMySong, mySongs, songExercise, songTakes, updateMySong } from '../src/progress/mySongs';
import { memoryBackend, Store } from '../src/progress/store';
import { isSynced } from '../src/sync/tracker';

// A tiny two-track file: a tune (C D E F | G held) over a bass (C3 whole, G2 whole).
const tune = [60, 62, 64, 65].map((midi, i) => ({ midi, at: i, beats: 0.9 })).concat([{ midi: 67, at: 4, beats: 3.9 }]);
const bass = [{ midi: 48, at: 0, beats: 3.9 }, { midi: 43, at: 4, beats: 3.9 }];
const file = () => writeMidiFile([{ name: 'Bass', notes: bass }, { name: 'Melody', notes: tune }], { bpm: 90, numerator: 4, denominator: 4 });

describe('MIDI files', () => {
  it('reads notes, names, tempo and time signature', () => {
    const f = parseMidiFile(file());
    expect(f.ppq).toBe(480);
    expect(f.tracks.map((t) => t.name)).toEqual([undefined, 'Bass', 'Melody']);
    expect(f.tracks[2].notes.map((n) => [n.midi, n.on / f.ppq])).toEqual([[60, 0], [62, 1], [64, 2], [65, 3], [67, 4]]);
    expect(f.tracks[2].notes[0].off / f.ppq).toBeCloseTo(0.9);
    expect(Math.round(60_000_000 / f.tempos[0].usPerQuarter)).toBe(90);
    expect(f.timeSignatures[0]).toMatchObject({ numerator: 4, denominator: 4 });
  });

  it('follows running status and note-on with velocity 0 as a release', () => {
    // MThd, then one track: note on C4, (running) note on E4, (running) C4 velocity 0, E4 velocity 0.
    const track = [0x00, 0x90, 60, 90, 0x00, 64, 90, 0x83, 0x60, 60, 0, 0x00, 64, 0, 0x00, 0xff, 0x2f, 0x00];
    const bytes = new Uint8Array([
      0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0,
      0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, track.length, ...track,
    ]);
    const f = parseMidiFile(bytes);
    expect(f.tracks[0].notes.map((n) => [n.midi, n.on, n.off])).toEqual([[60, 0, 480], [64, 0, 480]]);
  });

  it('says plainly when a file is not MIDI', () => {
    expect(() => parseMidiFile(new TextEncoder().encode('hello, not a midi file'))).toThrow(MidiFileError);
  });

  it('names key signatures in the app spelling', () => {
    expect(keyName(4, false)).toBe('E');
    expect(keyName(-3, false)).toBe('Eb');
    expect(keyName(0, true)).toBe('Am');
    expect(keyName(3, true)).toBe('F#m');
  });
});

describe('importing a song', () => {
  it('gives the highest part to the right hand and the lowest to the left', () => {
    const d = readSong(parseMidiFile(file()), 'Little tune');
    expect(d).toMatchObject({ title: 'Little tune', tempo: 90, meter: '4/4', key: 'C', grid: 0.5 });
    expect(d.parts.map((p) => p.name)).toEqual(['Bass', 'Melody']);
    expect(d.hands).toEqual(['left', 'right']);
    expect(writeSong(d)).toEqual({ right: 'C4:q D4:q E4:q F4:q | G4:w', left: 'C3:w | G2:w', bars: 2 });
  });

  it('splits a single part at middle C, and leaves extra parts out', () => {
    expect(defaultHands([{ name: 'Piano', notes: [[60, 0, 1, 80]] }])).toEqual(['split']);
    const parts = [65, 48, 72].map((m, i) => ({ name: `P${i}`, notes: [[m, 0, 1, 80] as [number, number, number, number]] }));
    expect(defaultHands(parts)).toEqual(['off', 'left', 'right']);
    const one = writeSong({ tempo: 90, meter: '4/4', key: 'C', grid: 0.5, hands: ['split'], parts: [{ name: 'Piano', notes: [[48, 0, 4, 80], [64, 0, 4, 80]] }] });
    expect(one).toEqual({ right: 'E4:w', left: 'C3:w', bars: 1 });
  });

  it('flattens tempo changes and drops drums, and says so', () => {
    const f = parseMidiFile(file());
    f.tempos.push({ tick: 960, usPerQuarter: 1_000_000 });
    f.tracks[1].notes.push({ midi: 36, on: 0, off: 100, velocity: 100, channel: 9 });
    const d = readSong(f, 'x');
    expect(d.tempo).toBe(90);
    expect(d.parts).toHaveLength(2);
    expect(d.notes.join(' ')).toMatch(/drum/);
    expect(d.notes.join(' ')).toMatch(/tempo changes/);
  });

  it('counts the tempo in the meter’s beat (dotted quarters in 6/8)', () => {
    const f = parseMidiFile(writeMidiFile([{ notes: [{ midi: 60, at: 0, beats: 3 }] }], { bpm: 120, numerator: 6, denominator: 8 }));
    expect(readSong(f, 'x')).toMatchObject({ meter: '6/8', tempo: 80 });
  });
});

describe('my songs', () => {
  it('keeps songs, changes their hands, and deletes them; they sync', () => {
    const s = new Store(memoryBackend());
    const song = addMySong(s, readSong(parseMidiFile(file()), 'Little tune'), 'little.mid');
    expect(mySongs(s).map((x) => x.title)).toEqual(['Little tune']);
    expect(songTakes(song)).toEqual(['together', 'right', 'left']);
    const swapped = updateMySong(s, song.id, { hands: ['off', 'right'] })!;
    expect(swapped.left).toBeUndefined();
    expect(songTakes(swapped)).toEqual(['right']);
    expect(isSynced(`iggyuoso.mysong.${song.id}`)).toBe(true);
    deleteMySong(s, song.id);
    expect(mySongs(s)).toEqual([]);
    expect(getMySong(s, song.id)).toBeUndefined();
  });

  it('plays as a timed piece with per-hand takes, the tempo ladder and its own records', () => {
    const s = new Store(memoryBackend());
    const song = addMySong(s, readSong(parseMidiFile(file()), 'Little tune'));
    const both = songExercise(song, 'together')!;
    expect(both).toMatchObject({ id: `mysong-${song.id}`, kind: 'timed', hand: 'together', tempo: 90, bars: 2, ladder: [50, 60, 70, 80, 90, 100] });
    const right = songExercise(song, 'right')!;
    expect(right).toMatchObject({ id: `mysong-${song.id}-right`, hand: 'right' });
    expect(right.left).toBeUndefined();
  });

  it('takes the tempo the player sets over the file’s', () => {
    const s = new Store(memoryBackend());
    const song = addMySong(s, { ...readSong(parseMidiFile(file()), 'Little tune'), tempo: 72 });
    expect(songExercise(song, 'together')!.tempo).toBe(72);
    const slower = updateMySong(s, song.id, { tempo: 60 })!;
    expect(songExercise(slower, 'right')!.tempo).toBe(60);
    expect(slower.right).toBe(song.right);
  });
});
