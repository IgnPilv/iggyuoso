import type { HandFrame, FingerState } from '../music/handPlacement';
import type { Hand } from '../music/notes';

// A stylised hand over the keys, the same shape on the canvas (falling notes) and in the SVG
// keyboard: a palm along the front edge of the keys and five fingers reaching up to the keys they
// rest on, the thumb shorter and from the side. Both drawings give a key's fingertip spot; this
// file turns a HandFrame into outlines (SVG path strings, which a canvas reads with Path2D).

export interface KeySpot { x: number; y: number; black: boolean }

export interface HandShape {
  hand: Hand;
  /** Palm and fingers as one outline, filled once so overlaps don't darken. */
  outline: string;
  tips: { finger: number; x: number; y: number; r: number; state: FingerState }[];
}

/** A capsule from `a` to `b` (round both ends) as an SVG path. */
function capsule(ax: number, ay: number, bx: number, by: number, r: number): string {
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = (-(by - ay) / len) * r, ny = ((bx - ax) / len) * r;
  const f = (n: number) => n.toFixed(1);
  return `M${f(ax + nx)} ${f(ay + ny)}L${f(bx + nx)} ${f(by + ny)}A${f(r)} ${f(r)} 0 0 0 ${f(bx - nx)} ${f(by - ny)}`
    + `L${f(ax - nx)} ${f(ay - ny)}A${f(r)} ${f(r)} 0 0 0 ${f(ax + nx)} ${f(ay + ny)}Z`;
}

/**
 * `spot(key)` is the fingertip point of a key (any key, also outside the drawing); `ww` a white
 * key's width; `bottom` the front edge of the keys; `palmH` how much of the keys the palm covers.
 */
export function handShape(frame: HandFrame, spot: (key: number) => KeySpot, ww: number, bottom: number, palmH: number): HandShape {
  const r = Math.max(3, ww * 0.3);
  const tips = frame.fingers.map((f) => {
    const a = spot(f.from), b = spot(f.to);
    // The thumb is short: on a white key it lands nearer the front. A pressed finger sinks a little.
    const low = (k: KeySpot) => k.y + (f.finger === 1 && !k.black ? r * 1.3 : 0);
    const y = low(a) + (low(b) - low(a)) * f.t + (f.state === 'down' ? r * 0.5 : 0);
    return { finger: f.finger, x: a.x + (b.x - a.x) * f.t, y, r, state: f.state };
  });
  const xs = tips.map((t) => t.x);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  const palmTop = bottom - Math.max(r * 1.6, palmH);
  const thumbSide = frame.hand === 'right' ? -1 : 1;
  const parts: string[] = [];
  let left = Infinity, right = -Infinity;
  for (const t of tips) {
    const thumb = t.finger === 1;
    // Knuckles sit on the palm, a little closer together than the tips.
    const bx = thumb ? mid + thumbSide * Math.max(ww * 1.1, Math.abs(t.x - mid) * 0.75) : mid + (t.x - mid) * 0.8;
    const by = thumb ? bottom - r * 0.4 : palmTop + r;
    parts.push(capsule(bx, by, t.x, t.y, thumb ? r * 1.08 : r));
    if (!thumb) { left = Math.min(left, bx - r * 1.2); right = Math.max(right, bx + r * 1.2); }
  }
  const pr = r * 1.4;
  const f = (n: number) => n.toFixed(1);
  const pb = bottom + pr;
  // Counter-clockwise, like the fingers (which all point up), so the overlaps fill (nonzero rule).
  parts.push(`M${f(left + pr)} ${f(palmTop)}A${f(pr)} ${f(pr)} 0 0 0 ${f(left)} ${f(palmTop + pr)}L${f(left)} ${f(pb)}`
    + `L${f(right)} ${f(pb)}L${f(right)} ${f(palmTop + pr)}A${f(pr)} ${f(pr)} 0 0 0 ${f(right - pr)} ${f(palmTop)}Z`);
  return { hand: frame.hand, outline: parts.join(''), tips };
}

/**
 * Paints a hand's body on a canvas: a soft fill with one outline around palm and fingers together
 * (drawn on a scratch canvas, where the inner half of every stroke is cut away by the fill).
 */
export function paintBody(ctx: CanvasRenderingContext2D, scratch: HTMLCanvasElement, outline: string, fill: string, line: string, lineWidth: number) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  if (scratch.width !== w || scratch.height !== h) { scratch.width = w; scratch.height = h; }
  const sc = scratch.getContext('2d')!;
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.clearRect(0, 0, w, h);
  sc.setTransform(ctx.getTransform());
  const body = new Path2D(outline);
  sc.lineJoin = 'round';
  sc.lineWidth = lineWidth * 2;
  sc.strokeStyle = line;
  sc.stroke(body);
  sc.globalCompositeOperation = 'destination-out';
  sc.fillStyle = '#000';
  sc.fill(body);
  sc.globalCompositeOperation = 'source-over';
  sc.fillStyle = fill;
  sc.fill(body);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
}
