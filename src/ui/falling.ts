import { keyName, type Calibration } from '../calibration';
import type { LiveState } from '../engine/timedSession';
import { isBlack, pitchClass, type Hand } from '../music/notes';

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
  /** Keys to tint when nothing else lights them (hand position, keys already found). */
  marked?: ReadonlyMap<number, string>;
}

const COLORS: Record<Hand, { fill: string; bright: string; key: string }> = {
  right: { fill: '#3b82f6', bright: '#93c5fd', key: '#60a5fa' },
  left: { fill: '#22c55e', bright: '#86efac', key: '#4ade80' },
};
const MISSED = '#ef4444';
const LANE_BG = '#14161c';

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

  constructor(
    low: number, high: number,
    private cal: Calibration,
    private notes: FallingNote[],
    private opts: { lookahead: number; barQuarters: number; totalBeats: number; labels?: 'c' | 'middle-c' },
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
  }

  destroy() {
    this.resize.disconnect();
  }

  private layout() {
    const w = this.el.clientWidth || 800;
    const ww = w / this.whites;
    const kbH = Math.min(170, Math.max(90, ww * 4.6));
    const laneH = Math.min(420, Math.max(260, w * 0.42));
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
  }

  draw(s: FrameState) {
    if (!this.width) this.layout();
    const { ctx, width, laneH } = this;
    const ppb = laneH / this.opts.lookahead;
    const yOf = (beat: number) => laneH - (beat - s.beat) * ppb;

    // Lane background, white-key lanes, beat and bar lines.
    ctx.fillStyle = LANE_BG;
    ctx.fillRect(0, 0, width, laneH);
    for (const [m, k] of this.keys) {
      if (k.black) continue;
      ctx.fillStyle = pitchClass(m) === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.025)';
      ctx.fillRect(k.x + 0.5, 0, 1, laneH);
      if (m === this.cal.middleC) {
        ctx.fillStyle = 'rgba(250,204,21,0.07)';
        ctx.fillRect(k.x, 0, k.w, laneH);
      }
    }
    const firstBeat = Math.floor(s.beat);
    for (let b = Math.max(0, firstBeat); b <= Math.min(this.opts.totalBeats, s.beat + this.opts.lookahead); b++) {
      const y = yOf(b);
      const bar = b % this.opts.barQuarters === 0;
      ctx.fillStyle = bar ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, y, width, bar ? 1.5 : 1);
      if (bar && b < this.opts.totalBeats) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`bar ${b / this.opts.barQuarters + 1}`, 6, y - 4);
      }
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
      const c = COLORS[n.hand];
      const pad = k.black ? 1 : Math.max(2, k.w * 0.1);
      const x = k.x + pad;
      const w = k.w - 2 * pad;
      const yTop = Math.max(-4, top);
      const h = Math.min(laneH, bottom) - yTop;
      ctx.globalAlpha = state === 'hit' ? 0.45 : 1;
      ctx.fillStyle = state === 'missed' ? MISSED : state === 'now' ? c.bright : c.fill;
      if (state === 'now') { ctx.shadowColor = c.bright; ctx.shadowBlur = 16; }
      roundRect(ctx, x, yTop, w, h, Math.min(6, w / 3));
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      // Label at the leading edge: note name, and finger number if given.
      if (h > 14 && w > 12) {
        ctx.fillStyle = '#0b0d12';
        ctx.textAlign = 'center';
        ctx.font = `700 ${Math.min(14, w * 0.5)}px system-ui, sans-serif`;
        const label = keyName(this.cal, n.device).replace(/-?\d+$/, '');
        const ly = Math.min(laneH, bottom) - 6;
        ctx.fillText(label, x + w / 2, ly);
        if (n.finger && h > 32) {
          ctx.font = `600 ${Math.min(12, w * 0.45)}px system-ui, sans-serif`;
          ctx.fillText(String(n.finger), x + w / 2, ly - 16);
        }
      }
    }

    // Hit line.
    ctx.fillStyle = 'rgba(250,204,21,0.9)';
    ctx.fillRect(0, laneH - 2, width, 2);

    // Live judgements just above the hit line.
    for (const f of s.flashes) {
      const k = this.keys.get(f.device);
      if (!k || f.until < s.now) continue;
      const life = Math.max(0, Math.min(1, (f.until - s.now) / 900));
      ctx.globalAlpha = life;
      ctx.fillStyle = f.kind === 'hit' ? '#4ade80' : MISSED;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, k.x + k.w / 2, laneH - 14 - (1 - life) * 24);
      ctx.globalAlpha = 1;
    }

    // Count-in or banner.
    const big = s.count !== undefined ? String(s.count) : s.banner;
    if (big) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.textAlign = 'center';
      ctx.font = `700 ${s.count !== undefined ? 72 : 28}px system-ui, sans-serif`;
      ctx.fillText(big, width / 2, laneH / 2);
    }

    this.drawKeyboard(s);
  }

  private drawKeyboard(s: FrameState) {
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
    const fill = (m: number, k: KeyGeom) => {
      if (s.held.has(m)) return wrong.has(m) ? MISSED : wanted.has(m) ? COLORS[wanted.get(m)!].fill : '#94a3b8';
      if (sounding.has(m)) return COLORS[sounding.get(m)!].key;
      if (s.marked?.has(m)) return s.marked.get(m)!;
      return k.black ? '#1f2128' : '#fafafa';
    };
    for (const black of [false, true]) {
      for (const [m, k] of this.keys) {
        if (k.black !== black) continue;
        const h = black ? kbH * 0.62 : kbH;
        ctx.fillStyle = fill(m, k);
        roundRect(ctx, k.x + (black ? 0 : 0.5), laneH, k.w - (black ? 0 : 1), h, 3);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (!black && pitchClass(m) === 0 && (this.opts.labels !== 'middle-c' || m === this.cal.middleC)) {
          const mid = m === this.cal.middleC;
          ctx.fillStyle = mid ? '#b45309' : '#555';
          ctx.font = `${mid ? 700 : 500} ${Math.min(12, k.w * 0.42)}px system-ui, sans-serif`;
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
  }
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
