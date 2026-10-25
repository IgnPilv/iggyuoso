import { keyName, type Calibration } from '../calibration';
import { computerKeys } from '../midi/computerKeys';
import { isBlack, pitchClass } from '../music/notes';
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

  /**
   * `labels: 'c'` writes the name under every C (not for "find the C" drills, where it would give
   * the answer away). Middle C always gets a dot and a "middle C" caption. While the computer
   * keyboard is on, keys it can reach show their letter at the top (also not in those drills).
   */
  constructor(low: number, high: number, opts: { middleC?: number; cal?: Calibration; labels?: 'none' | 'c' } = {}) {
    // Start and end on white keys so the drawing is never cut through a black key.
    while (isBlack(low)) low--;
    while (isBlack(high)) high++;
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
    this.el.append(whiteLayer, blackLayer);
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
