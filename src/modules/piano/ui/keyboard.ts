import { keyName, type Calibration } from '../calibration';
import { computerKeys } from '../midi/computerKeys';
import { whiteIndex, type HandFrame } from '../music/handPlacement';
import { isBlack, pitchClass } from '../music/notes';
import { handShape } from './hands';
import { s } from '../../../core/dom';

// An on-screen keyboard for a range of device keys. States are CSS classes on each key.

const WW = 22;
const WH = 120;
const CAPTION = 16;
const BW = 13;
const BH = 68;

export class KeyboardView {
  readonly el: SVGSVGElement;
  private keys = new Map<number, SVGGElement>();
  private low: number;
  private handLayer = s('g', { class: 'hands' });
  private handSig = '';
  private static masks = 0;

  /**
   * `labels: 'c'` writes the name under every C (not for "find the C" drills, where it would give
   * the answer away). Middle C always gets a dot and a "middle C" caption. While the computer
   * keyboard is on, keys it can reach show their letter at the top (also not in those drills).
   */
  constructor(low: number, high: number, opts: { middleC?: number; cal?: Calibration; labels?: 'none' | 'c' } = {}) {
    // Start and end on white keys so the drawing is never cut through a black key.
    while (isBlack(low)) low--;
    while (isBlack(high)) high++;
    this.low = low;
    const whites: number[] = [];
    for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m);
    this.el = s('svg', { viewBox: `0 0 ${whites.length * WW} ${WH + CAPTION + 2}`, class: 'keyboard', role: 'img', 'aria-label': 'keyboard' });
    // Never draw keys much bigger than real ones on a wide screen.
    this.el.style.maxWidth = `${whites.length * 40}px`;
    const whiteLayer = s('g');
    const blackLayer = s('g');
    let wi = 0;
    for (let m = low; m <= high; m++) {
      const g = s('g', { class: isBlack(m) ? 'key black' : 'key white', 'data-midi': m });
      if (isBlack(m)) {
        const x = wi * WW - BW / 2;
        g.append(s('rect', { x, y: 0, width: BW, height: BH, rx: 2 }), s('text', { x: x + BW / 2, y: BH - 8, class: 'label' }), s('text', { x: x + BW / 2, y: 12, class: 'hint' }));
        blackLayer.append(g);
      } else {
        const x = wi * WW;
        g.append(s('rect', { x, y: 0, width: WW, height: WH, rx: 3 }), s('text', { x: x + WW / 2, y: WH - 6, class: 'label' }), s('text', { x: x + WW / 2, y: BH + 12, class: 'hint' }));
        if (opts.labels === 'c' && opts.cal && pitchClass(m) === 0) {
          g.append(s('text', { x: x + WW / 2, y: WH - 18, class: 'name' }, keyName(opts.cal, m)));
        }
        if (m === opts.middleC) {
          g.append(s('circle', { cx: x + WW / 2, cy: WH - 34, r: 4, class: 'middle-c' }));
          whiteLayer.append(s('text', { x: x + WW / 2, y: WH + CAPTION - 2, class: 'middle-c-caption' }, 'middle C'));
        }
        whiteLayer.append(g);
        wi++;
      }
      this.keys.set(m, g);
    }
    // The hands' palms run off the front edge of the keys.
    const clip = `hands-clip-${++KeyboardView.masks}`;
    this.handLayer.setAttribute('clip-path', `url(#${clip})`);
    this.el.append(whiteLayer, blackLayer, s('defs', {}, s('clipPath', { id: clip }, s('rect', { x: 0, y: 0, width: whites.length * WW, height: WH }))), this.handLayer);
    if (opts.labels === 'c') {
      this.showHints();
      const off = computerKeys.onChange(() => {
        if (!this.el.isConnected) { off(); return; }
        this.showHints();
      });
    }
  }

  /** Letters of the computer keyboard on the keys they play (empty while it is off). */
  private showHints() {
    for (const [m, g] of this.keys) {
      g.querySelector('text.hint')!.textContent = computerKeys.enabled ? computerKeys.letterFor(m) ?? '' : '';
    }
  }

  /** The hands over the keys (none: hide them). Fingertips rest on white keys low down, on black keys near their ends. */
  showHands(frames: HandFrame[] | undefined, numbers = true) {
    const sig = frames ? JSON.stringify(frames) + numbers : '';
    if (sig === this.handSig) return;
    this.handSig = sig;
    this.handLayer.replaceChildren();
    if (!frames) return;
    const base = whiteIndex(this.low);
    const spot = (m: number) => ({ x: (whiteIndex(m) - base + 0.5) * WW, y: isBlack(m) ? BH * 0.6 : WH * 0.6, black: isBlack(m) });
    for (const fr of frames) {
      const shape = handShape(fr, spot, WW, WH, WH * 0.17);
      // One outline around palm and fingers together: the stroke is masked to outside the body.
      const id = `hand-${fr.hand}-${++KeyboardView.masks}`;
      const mask = s('mask', { id, maskUnits: 'userSpaceOnUse' },
        s('path', { d: shape.outline, class: 'hand-mask' }));
      const g = s('g', { class: `hand ${fr.hand}` }, s('defs', {}, mask),
        s('path', { d: shape.outline, class: 'hand-body' }),
        s('path', { d: shape.outline, class: 'hand-line', mask: `url(#${id})` }));
      for (const t of shape.tips) {
        g.append(s('circle', { cx: t.x, cy: t.y, r: t.r, class: `tip ${t.state}` }));
        if (numbers) g.append(s('text', { x: t.x, y: t.y + t.r * 0.45, class: `tip-n ${t.state}` }, String(t.finger)));
      }
      this.handLayer.append(g);
    }
  }

  set(midi: number, cls: string, on = true, label?: string) {
    const g = this.keys.get(midi);
    if (!g) return;
    g.classList.toggle(cls, on);
    if (label !== undefined) g.querySelector('text.label')!.textContent = on ? label : '';
  }

  clear(cls: string) {
    for (const g of this.keys.values()) g.classList.remove(cls);
  }

  clearLabels() {
    for (const g of this.keys.values()) g.querySelector('text.label')!.textContent = '';
  }

  flash(midi: number, cls: string, ms = 350) {
    this.set(midi, cls, true);
    setTimeout(() => this.set(midi, cls, false), ms);
  }
}
