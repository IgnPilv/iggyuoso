import { keyName, type Calibration } from '../calibration';
import { computerKeys } from '../midi/computerKeys';
import type { LiveState } from '../engine/timedSession';
import { whiteIndex, type HandPlan } from '../music/handPlacement';
import { isBlack, pitchClass, type Hand } from '../music/notes';
import type { PedalSpan } from '../music/timeline';
import { LEVELS, type DynamicSpan } from '../scoring/dynamics';
import { palette, tokenColor, type Palette } from '../../../core/theme';
import { handShape, paintBody } from './hands';

// Synthesia-style view: notes fall towards the keyboard and reach it on their beat. Drawn on a
// canvas every frame from the session clock; the view owns no timing of its own.

export interface FallingNote {
  device: number;
  beat: number;
  beats: number;
  hand: Hand;
  finger?: number;
}

export interface Flash {
  device: number;
  kind: 'hit' | 'wrong' | 'extra';
  text: string;
  until: number;
}

export interface FrameState {
  beat: number;
  count?: number;
  banner?: string;
  held: ReadonlySet<number>;
  noteState: (i: number) => LiveState;
  flashes: Flash[];
  now: number;
  /** Keys to tint when nothing else lights them (hand position, keys already found): a colour or a CSS token name such as '--ok'. */
  marked?: ReadonlyMap<number, string>;
  /** The sustain pedal is down now (drawn at the foot of the pedal line). */
  pedalDown?: boolean;
  /** Where the hands are drawn from, when it is not `beat` (step-by-step: just before the waiting note). */
  handBeat?: number;
}

// All colours come from the design tokens (styles/tokens.css) through palette().
const handColors = (p: Palette, hand: Hand) =>
  hand === 'right' ? { fill: p.rh, bright: p.rhBright, key: p.rhKey } : { fill: p.lh, bright: p.lhBright, key: p.lhKey };

interface KeyGeom { x: number; w: number; black: boolean }

export class FallingView {
  readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private keys = new Map<number, KeyGeom>();
  private width = 0;
  private height = 0;
  private laneH = 0;
  private low: number;
  private high: number;
  private whites = 0;
  private resize: ResizeObserver;
  /** Last frame drawn, so a resize (or a computer-keyboard octave shift) can redraw it while idle. */
  private last?: FrameState;
  private offKeys: () => void;
  private scratch?: HTMLCanvasElement;

  constructor(
    low: number, high: number,
    private cal: Calibration,
    private notes: FallingNote[],
    private opts: { lookahead: number; barQuarters: number; totalBeats: number; labels?: 'c' | 'middle-c'; /** Quarters per beat line (1.5 in 6/8). */ pulse?: number;
      /** A pedal line, drawn as a strip down the right edge. */ pedal?: PedalSpan[];
      /** Loud and soft marks, written next to the bar numbers. */ dynamics?: DynamicSpan[];
      /** Hands drawn over the keys (Options → Hands), with finger numbers on the tips unless `handNumbers` is false. */ hands?: HandPlan; handNumbers?: boolean;
      /** Bars before the first one drawn (practising from a later bar keeps the piece's bar numbers). */ firstBar?: number;
      /** Chord names (Options → Chord names), each beside the notes that strike it at `beat`. */ chords?: { beat: number; name: string }[] },
  ) {
    while (isBlack(low)) low--;
    while (isBlack(high)) high++;
    this.low = low;
    this.high = high;
    for (let m = low; m <= high; m++) if (!isBlack(m)) this.whites++;
    this.el = document.createElement('div');
    this.el.className = 'falling';
    this.canvas = document.createElement('canvas');
    this.el.append(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize = new ResizeObserver(() => this.layout());
    this.resize.observe(this.el);
    this.offKeys = computerKeys.onChange(() => { if (this.last) this.draw(this.last); });
  }

  destroy() {
    this.resize.disconnect();
    this.offKeys();
  }

  private layout() {
    const w = this.el.clientWidth || 800;
    const ww = w / this.whites;
    let kbH = Math.min(170, Math.max(90, ww * 4.6));
    let laneH = Math.min(420, Math.max(260, w * 0.42));
    // Full screen (a phone on its side) or a lesson's main screen: fill the height, the keys taking
    // at most a third.
    const fill = this.el.closest('.fs-layer, .focus') ? this.el.clientHeight : 0;
    if (fill > 0) {
      kbH = Math.round(Math.max(56, Math.min(kbH, fill * 0.32)));
      laneH = Math.max(80, fill - kbH);
    }
    const dpr = window.devicePixelRatio || 1;
    this.width = w;
    this.height = laneH + kbH;
    this.laneH = laneH;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.keys.clear();
    let wi = 0;
    for (let m = this.low; m <= this.high; m++) {
      if (isBlack(m)) this.keys.set(m, { x: wi * ww - ww * 0.31, w: ww * 0.62, black: true });
      else this.keys.set(m, { x: wi++ * ww, w: ww, black: false });
    }
    // Setting the canvas size wiped it; without a running animation nothing else would redraw.
    if (this.last) this.draw(this.last);
  }

  draw(s: FrameState) {
    this.last = s;
    if (!this.width) this.layout();
    const { ctx, width, laneH } = this;
    const p = palette();
    const ppb = laneH / this.opts.lookahead;
    const yOf = (beat: number) => laneH - (beat - s.beat) * ppb;

    // Lane background with a faint glow rising from the hit line, white-key lanes, beat and bar lines.
    ctx.fillStyle = p.laneBg;
    ctx.fillRect(0, 0, width, laneH);
    const glow = ctx.createLinearGradient(0, laneH * 0.55, 0, laneH);
    glow.addColorStop(0, 'transparent');
    glow.addColorStop(1, withAlpha(p.hitLine, 0.12));
    ctx.fillStyle = glow;
    ctx.fillRect(0, laneH * 0.55, width, laneH * 0.45);
    for (const [m, k] of this.keys) {
      if (k.black) continue;
      ctx.fillStyle = pitchClass(m) === 0 ? p.laneC : p.laneLine;
      ctx.fillRect(k.x + 0.5, 0, 1, laneH);
      if (m === this.cal.middleC) {
        ctx.fillStyle = p.laneMiddleC;
        ctx.fillRect(k.x, 0, k.w, laneH);
      }
    }
    const step = this.opts.pulse ?? 1;
    const barQ = this.opts.barQuarters;
    for (let i = Math.max(0, Math.floor(s.beat / step)); i * step <= Math.min(this.opts.totalBeats, s.beat + this.opts.lookahead); i++) {
      const b = i * step;
      const y = yOf(b);
      const bar = Math.abs(b / barQ - Math.round(b / barQ)) < 1e-6;
      ctx.fillStyle = bar ? p.laneBar : p.laneBeat;
      ctx.fillRect(0, y, width, bar ? 1.5 : 1);
      if (bar && b < this.opts.totalBeats) {
        ctx.fillStyle = p.laneText;
        ctx.font = `500 10px ${p.fontMono}`;
        ctx.textAlign = 'left';
        const n = Math.round(b / barQ) + 1 + (this.opts.firstBar ?? 0);
        const d = this.opts.dynamics?.find((x) => x.bars[0] === n);
        const mark = d ? (d.hairpin ? (d.hairpin > 0 ? 'cresc.' : 'dim.') : LEVELS[d.level]) : '';
        ctx.fillText(`BAR ${n}`, 8, y - 5);
        if (mark) {
          ctx.font = `italic 700 13px ${p.fontBody}`;
          ctx.fillStyle = p.laneText;
          ctx.fillText(mark, 56, y - 5);
        }
      }
    }

    // The pedal line: a strip down the right edge, broken where the pedal changes.
    if (this.opts.pedal?.length) {
      const accent = tokenColor('--accent');
      const px = width - 16;
      ctx.fillStyle = accent;
      for (const sp of this.opts.pedal) {
        const bottom = Math.min(laneH, yOf(sp.beat) - (sp.change ? 2 : 0));
        const top = Math.max(0, yOf(sp.beat + sp.beats));
        if (bottom <= top) continue;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(px, top, 7, bottom - top);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = s.pedalDown ? accent : p.laneLine;
      ctx.fillRect(px - 3, laneH - 10, 13, 8);
      ctx.fillStyle = s.pedalDown ? accent : p.laneText;
      ctx.font = `600 10px ${p.fontMono}`;
      ctx.textAlign = 'right';
      ctx.fillText('PED', px - 7, laneH - 3);
    }

    // Notes: white-key notes first so black-key notes sit on top.
    const order = this.notes.map((_, i) => i).sort((a, b) => Number(this.keys.get(this.notes[a].device)?.black) - Number(this.keys.get(this.notes[b].device)?.black));
    for (const i of order) {
      const n = this.notes[i];
      const k = this.keys.get(n.device);
      if (!k) continue;
      const bottom = yOf(n.beat);
      const top = yOf(n.beat + n.beats) + 3;
      if (bottom < 0 || top > laneH) continue;
      const state = s.noteState(i);
      const c = handColors(p, n.hand);
      const pad = k.black ? 1 : Math.max(2, k.w * 0.1);
      const x = k.x + pad;
      const w = k.w - 2 * pad;
      const yTop = Math.max(-4, top);
      const h = Math.min(laneH, bottom) - yTop;
      if (h <= 0) continue;
      ctx.globalAlpha = state === 'hit' ? 0.35 : 1;
      if (state === 'missed') ctx.fillStyle = p.bad;
      else {
        // Bright leading edge fading into the hand colour: notes read as light, not blocks.
        const g = ctx.createLinearGradient(0, yTop, 0, yTop + h);
        g.addColorStop(0, withAlpha(c.fill, 0.75));
        g.addColorStop(1, state === 'now' ? c.bright : c.fill);
        ctx.fillStyle = g;
      }
      ctx.shadowColor = state === 'missed' ? p.bad : c.fill;
      ctx.shadowBlur = state === 'now' ? 24 : state === 'coming' ? 10 : 0;
      roundRect(ctx, x, yTop, w, h, Math.min(7, w / 3));
      ctx.fill();
      ctx.shadowBlur = 0;
      if (state !== 'hit' && state !== 'missed') {
        ctx.strokeStyle = withAlpha(c.bright, 0.7);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // At the leading edge: the finger number as a dark chip (it is what the hand needs first,
      // so it shows even on short notes), and the note name above it when there is room.
      if (w > 9) {
        const bottomY = Math.min(laneH, bottom);
        let ly = bottomY - 6;
        let room = h > 14;
        if (n.finger) {
          const r = Math.max(6, Math.min(10, w * 0.38));
          const cy = bottomY - r - 3;
          ctx.fillStyle = withAlpha(p.noteInk, 0.82);
          ctx.beginPath();
          ctx.arc(x + w / 2, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = c.bright;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `700 ${Math.round(r * 1.45)}px ${p.fontDisplay}`;
          ctx.fillText(String(n.finger), x + w / 2, cy + 0.5);
          ctx.textBaseline = 'alphabetic';
          ly = cy - r - 5;
          room = h > 2 * r + 24;
        }
        if (room && w > 12) {
          ctx.fillStyle = p.noteInk;
          ctx.textAlign = 'center';
          ctx.font = `700 ${Math.min(14, w * 0.5)}px ${p.fontDisplay}`;
          ctx.fillText(keyName(this.cal, n.device).replace(/-?\d+$/, ''), x + w / 2, ly);
        }
      }
    }

    // Chord names in a pill beside their chord's leading edge (left of it, or right where the
    // lane's edge leaves no room), falling with it down to the hit line.
    for (const c of this.opts.chords ?? []) {
      const y = yOf(c.beat);
      if (y < 16 || y > laneH) continue;
      const xs = this.notes.filter((n) => Math.abs(n.beat - c.beat) < 1e-6).flatMap((n) => {
        const k = this.keys.get(n.device);
        return k ? [k.x, k.x + k.w] : [];
      });
      if (!xs.length) continue;
      ctx.font = `700 13px ${p.fontDisplay}`;
      const tw = ctx.measureText(c.name).width + 16;
      const left = Math.min(...xs) - 6 - tw;
      const x = left >= 4 ? left : Math.min(width - tw - 4, Math.max(...xs) + 6);
      const cy = y - 13;
      ctx.fillStyle = withAlpha(p.noteInk, 0.88);
      roundRect(ctx, x, cy - 11, tw, 22, 11);
      ctx.fill();
      ctx.strokeStyle = tokenColor('--accent');
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = p.laneBig;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.name, x + tw / 2, cy + 0.5);
      ctx.textBaseline = 'alphabetic';
    }

    // Notes fade in from the dark at the top of the lane.
    const fade = ctx.createLinearGradient(0, 0, 0, Math.min(60, laneH * 0.15));
    fade.addColorStop(0, p.laneBg);
    fade.addColorStop(1, withAlpha(p.laneBg, 0));
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, width, Math.min(60, laneH * 0.15));

    // Hit line: a neon bar with a glow.
    ctx.shadowColor = p.hitLine;
    ctx.shadowBlur = 14;
    ctx.fillStyle = p.hitLine;
    ctx.fillRect(0, laneH - 2, width, 2);
    ctx.shadowBlur = 0;

    // Live judgements just above the hit line.
    for (const f of s.flashes) {
      const k = this.keys.get(f.device);
      if (!k || f.until < s.now) continue;
      const life = Math.max(0, Math.min(1, (f.until - s.now) / 900));
      ctx.globalAlpha = life;
      ctx.fillStyle = f.kind === 'hit' ? p.ok : p.bad;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.font = `700 13px ${p.fontDisplay}`;
      ctx.textAlign = 'center';
      ctx.fillText(f.text, k.x + k.w / 2, laneH - 14 - (1 - life) * 24);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Count-in or banner.
    const big = s.count !== undefined ? String(s.count) : s.banner;
    if (big) {
      ctx.fillStyle = p.laneBig;
      ctx.shadowColor = p.laneBg;
      ctx.shadowBlur = 24;
      ctx.textAlign = 'center';
      ctx.font = `700 ${s.count !== undefined ? 96 : 30}px ${p.fontDisplay}`;
      ctx.fillText(big, width / 2, laneH / 2 + (s.count !== undefined ? 30 : 0));
      ctx.shadowBlur = 0;
    }

    this.drawKeyboard(s, p);
  }

  private drawKeyboard(s: FrameState, p: Palette) {
    const { ctx, laneH } = this;
    const kbH = this.height - laneH;
    const sounding = new Map<number, Hand>();
    const wanted = new Map<number, Hand>();
    this.notes.forEach((n, i) => {
      const state = s.noteState(i);
      if (state === 'now') sounding.set(n.device, n.hand);
      if (state === 'now' || (s.beat >= n.beat && s.beat < n.beat + n.beats)) wanted.set(n.device, n.hand);
    });
    const wrong = new Set(s.flashes.filter((f) => f.kind !== 'hit' && f.until > s.now).map((f) => f.device));
    /** Fill and whether the key glows. */
    const fill = (m: number, k: KeyGeom): [string, boolean] => {
      if (s.held.has(m)) return wrong.has(m) ? [p.bad, true] : wanted.has(m) ? [handColors(p, wanted.get(m)!).fill, true] : [p.keyPressed, false];
      if (sounding.has(m)) return [handColors(p, sounding.get(m)!).key, true];
      if (s.marked?.has(m)) return [tokenColor(s.marked.get(m)!), false];
      return [k.black ? p.keyBlack : p.keyWhite, false];
    };
    for (const black of [false, true]) {
      for (const [m, k] of this.keys) {
        if (k.black !== black) continue;
        const h = black ? kbH * 0.62 : kbH;
        const [color, lit] = fill(m, k);
        ctx.fillStyle = color;
        if (lit) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
        roundRect(ctx, k.x + (black ? 0 : 0.5), laneH, k.w - (black ? 0 : 1), h, black ? 3 : 4);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = p.keyStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
        const hint = this.opts.labels !== 'middle-c' && computerKeys.enabled ? computerKeys.letterFor(m) : undefined;
        if (hint) {
          // The computer-keyboard letter that plays this key, near the top of the key.
          ctx.fillStyle = black ? p.keyWhite : p.keyLabel;
          ctx.font = `600 ${Math.min(11, k.w * 0.55)}px ${p.fontMono}`;
          ctx.textAlign = 'center';
          ctx.fillText(hint, k.x + k.w / 2, laneH + 13);
        }
        if (!black && pitchClass(m) === 0 && (this.opts.labels !== 'middle-c' || m === this.cal.middleC)) {
          const mid = m === this.cal.middleC;
          ctx.fillStyle = mid ? p.middleC : p.keyLabel;
          ctx.font = `${mid ? 700 : 500} ${Math.min(12, k.w * 0.42)}px ${p.fontDisplay}`;
          ctx.textAlign = 'center';
          ctx.fillText(keyName(this.cal, m), k.x + k.w / 2, laneH + kbH - 8);
          if (mid) {
            ctx.beginPath();
            ctx.arc(k.x + k.w / 2, laneH + kbH - 26, Math.min(5, k.w * 0.18), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    // A thin shadow where the keys meet the lane, like a key slip.
    const slip = ctx.createLinearGradient(0, laneH, 0, laneH + 8);
    slip.addColorStop(0, 'rgba(0,0,0,0.45)');
    slip.addColorStop(1, 'transparent');
    ctx.fillStyle = slip;
    ctx.fillRect(0, laneH, this.width, 8);
    if (this.opts.hands) this.drawHands(this.opts.hands.at(s.handBeat ?? s.beat), p, kbH);
  }

  private drawHands(frames: ReturnType<HandPlan['at']>, p: Palette, kbH: number) {
    const { ctx, laneH } = this;
    const ww = this.width / this.whites;
    const base = whiteIndex(this.low);
    const spot = (m: number) => ({ x: (whiteIndex(m) - base + 0.5) * ww, y: laneH + (isBlack(m) ? kbH * 0.62 * 0.6 : kbH * 0.6), black: isBlack(m) });
    for (const fr of frames) {
      const c = handColors(p, fr.hand);
      const shape = handShape(fr, spot, ww, laneH + kbH, kbH * 0.17);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, laneH, this.width, kbH);
      ctx.clip();
      paintBody(ctx, (this.scratch ??= document.createElement('canvas')), shape.outline, withAlpha(c.fill, 0.22), withAlpha(c.fill, 0.95), 1.3);
      for (const t of shape.tips) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = t.state === 'down' ? c.bright : withAlpha(p.noteInk, 0.78);
        ctx.fill();
        ctx.lineWidth = t.state === 'next' ? 2.5 : 1.5;
        ctx.strokeStyle = t.state === 'next' ? c.bright : t.state === 'down' ? p.noteInk : c.fill;
        if (t.state === 'next') { ctx.shadowColor = c.fill; ctx.shadowBlur = 10; }
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (this.opts.handNumbers !== false && t.r >= 5) {
          ctx.fillStyle = t.state === 'down' ? p.noteInk : c.bright;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `700 ${Math.round(t.r * 1.2)}px ${p.fontDisplay}`;
          ctx.fillText(String(t.finger), t.x, t.y + 0.5);
          ctx.textBaseline = 'alphabetic';
        }
      }
      ctx.restore();
    }
  }
}

/** A colour with a new alpha. Accepts #rgb, #rrggbb and rgb()/rgba(). */
function withAlpha(color: string, a: number): string {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const v = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    const n = parseInt(v, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const rgb = color.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((x) => x.trim());
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (h <= 0 || w <= 0) return;
  r = Math.max(0, Math.min(r, h / 2, w / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
