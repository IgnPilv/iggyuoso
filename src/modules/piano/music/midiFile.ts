// Standard MIDI files (.mid), read in the browser for "My songs". Only what a piano part needs:
// notes with their times and velocities, track names, the first tempo, time and key signature.
// Times stay in ticks here; `ppq` (ticks per quarter note) turns them into quarter beats.

export interface MidiFileNote {
  /** MIDI note number as written in the file (C4 = 60). */
  midi: number;
  /** Start and end in ticks. */
  on: number;
  off: number;
  velocity: number;
  channel: number;
}

export interface MidiFileTrack {
  name?: string;
  notes: MidiFileNote[];
}

export interface MidiFile {
  format: number;
  /** Ticks per quarter note. */
  ppq: number;
  tracks: MidiFileTrack[];
  /** Tempo changes, microseconds per quarter note. */
  tempos: { tick: number; usPerQuarter: number }[];
  timeSignatures: { tick: number; numerator: number; denominator: number }[];
  /** `sf` = sharps (negative = flats), `minor` from the key signature meta event. */
  keySignatures: { tick: number; sf: number; minor: boolean }[];
}

export class MidiFileError extends Error {}

/** Read a .mid file. Throws MidiFileError when it is not one (or uses SMPTE time, which is rare). */
export function parseMidiFile(data: Uint8Array): MidiFile {
  let pos = 0;
  const need = (n: number) => { if (pos + n > data.length) throw new MidiFileError('The file ends too early.'); };
  const u8 = () => { need(1); return data[pos++]; };
  const u16 = () => (u8() << 8) | u8();
  const u32 = () => ((u8() << 24) >>> 0) + (u8() << 16) + (u8() << 8) + u8();
  const tag = () => { need(4); const s = String.fromCharCode(...data.subarray(pos, pos + 4)); pos += 4; return s; };
  const vlq = () => {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const b = u8();
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
    throw new MidiFileError('A length in the file is broken.');
  };

  if (data.length < 14 || tag() !== 'MThd') throw new MidiFileError('This is not a MIDI file (.mid).');
  const headerLen = u32();
  const format = u16();
  const count = u16();
  const division = u16();
  pos += headerLen - 6;
  if (division & 0x8000) throw new MidiFileError('This MIDI file counts time in SMPTE frames, which is not supported.');
  const ppq = division || 480;

  const out: MidiFile = { format, ppq, tracks: [], tempos: [], timeSignatures: [], keySignatures: [] };
  for (let t = 0; t < count && pos + 8 <= data.length; t++) {
    const id = tag();
    const len = u32();
    const end = Math.min(data.length, pos + len);
    if (id !== 'MTrk') { pos = end; continue; }
    const track: MidiFileTrack = { notes: [] };
    const open = new Map<number, MidiFileNote[]>(); // channel * 128 + note -> notes still sounding
    let tick = 0;
    let status = 0;
    while (pos < end) {
      tick += vlq();
      let b = u8();
      if (b === 0xff) {
        const type = u8();
        const n = vlq();
        need(n);
        const body = data.subarray(pos, pos + n);
        pos += n;
        if (type === 0x2f) break;
        if (type === 0x03 && !track.name) track.name = new TextDecoder('latin1').decode(body).trim() || undefined;
        if (type === 0x51 && n >= 3) out.tempos.push({ tick, usPerQuarter: (body[0] << 16) | (body[1] << 8) | body[2] });
        if (type === 0x58 && n >= 2) out.timeSignatures.push({ tick, numerator: body[0], denominator: 2 ** body[1] });
        if (type === 0x59 && n >= 2) out.keySignatures.push({ tick, sf: (body[0] << 24) >> 24, minor: body[1] === 1 });
        continue;
      }
      if (b === 0xf0 || b === 0xf7) {
        pos += vlq();
        continue;
      }
      // Channel messages may leave out a repeated command byte ("running status"); some files
      // keep it running across meta events too, so it is only replaced by a new command.
      if (b & 0x80) {
        status = b;
        b = u8();
      } else if (!status) {
        throw new MidiFileError('The file has a note without a command.');
      }
      const kind = status & 0xf0;
      const channel = status & 0x0f;
      const d1 = b;
      const d2 = kind === 0xc0 || kind === 0xd0 ? 0 : u8();
      if (kind === 0x90 && d2 > 0) {
        const note: MidiFileNote = { midi: d1, on: tick, off: tick, velocity: d2, channel };
        track.notes.push(note);
        const k = channel * 128 + d1;
        open.set(k, [...(open.get(k) ?? []), note]);
      } else if (kind === 0x80 || kind === 0x90) {
        const k = channel * 128 + d1;
        const first = open.get(k)?.shift();
        if (first) first.off = tick;
      }
    }
    // Notes never released end at the track's last event.
    for (const list of open.values()) for (const n of list) n.off = Math.max(n.on + 1, tick);
    pos = end;
    out.tracks.push(track);
  }
  out.tempos.sort((a, b) => a.tick - b.tick);
  out.timeSignatures.sort((a, b) => a.tick - b.tick);
  out.keySignatures.sort((a, b) => a.tick - b.tick);
  return out;
}

/** The key a key signature stands for, in the app's spelling (G, Bb, F#m...). */
export function keyName(sf: number, minor: boolean): string {
  const MAJOR = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const MINOR = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];
  const i = Math.max(-7, Math.min(7, sf)) + 7;
  return minor ? `${MINOR[i]}m` : MAJOR[i];
}

/** A small type 1 MIDI file from notes in quarter beats (for tests and the demo). */
export function writeMidiFile(tracks: { name?: string; notes: { midi: number; at: number; beats: number; velocity?: number }[] }[], opts: { bpm?: number; numerator?: number; denominator?: number; ppq?: number } = {}): Uint8Array {
  const ppq = opts.ppq ?? 480;
  const bytes: number[] = [];
  const push = (...b: number[]) => bytes.push(...b);
  const u32 = (v: number) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const vlq = (v: number) => {
    const out = [v & 0x7f];
    while ((v >>= 7)) out.unshift((v & 0x7f) | 0x80);
    return out;
  };
  const chunk = (id: string, body: number[]) => push(...[...id].map((c) => c.charCodeAt(0)), ...u32(body.length), ...body);
  chunk('MThd', [0, 1, 0, tracks.length + 1, (ppq >> 8) & 255, ppq & 255]);
  const us = Math.round(60_000_000 / (opts.bpm ?? 100));
  chunk('MTrk', [
    0, 0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255,
    0, 0xff, 0x58, 4, opts.numerator ?? 4, Math.log2(opts.denominator ?? 4), 24, 8,
    0, 0xff, 0x2f, 0,
  ]);
  tracks.forEach((tr, ch) => {
    const evs: [number, number[]][] = [];
    for (const n of tr.notes) {
      evs.push([Math.round(n.at * ppq), [0x90 | ch, n.midi, n.velocity ?? 80]]);
      evs.push([Math.round((n.at + n.beats) * ppq), [0x80 | ch, n.midi, 0]]);
    }
    // Releases before presses at the same tick, so repeated notes stay apart.
    evs.sort((a, b) => a[0] - b[0] || (a[1][0] & 0xf0) - (b[1][0] & 0xf0));
    const body: number[] = [];
    if (tr.name) body.push(0, 0xff, 0x03, ...vlq(tr.name.length), ...[...tr.name].map((c) => c.charCodeAt(0) & 0x7f));
    let last = 0;
    for (const [t, msg] of evs) { body.push(...vlq(t - last), ...msg); last = t; }
    body.push(0, 0xff, 0x2f, 0);
    chunk('MTrk', body);
  });
  return new Uint8Array(bytes);
}
