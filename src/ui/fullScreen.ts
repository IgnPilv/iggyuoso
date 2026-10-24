import { demo } from '../demo/demo';
import { h } from './dom';

// A phone held sideways shows an exercise as falling notes only, edge to edge: no header, step
// bar, options or sheet strip. The score (or the question) stays small in a corner; a tap shows
// the controls, Leave full screen and Next. Portrait, tablets and desktops are unchanged.

/** A phone on its side: landscape, a phone-sized short side, a touch screen. */
export const PHONE_LANDSCAPE = '(orientation: landscape) and (max-height: 500px) and (hover: none) and (pointer: coarse)';

let previewHost: HTMLElement | undefined;
/** The demo shows the full-screen view inside a phone-shaped frame instead of the whole window. */
export function previewFullScreen(host?: HTMLElement) { previewHost = host; }

export interface FullScreenParts {
  /** Always in view, top left: the live score, or the question. */
  score?: HTMLElement[];
  /** Listen / Play / Pause / Stop. */
  controls?: HTMLElement;
  stage: HTMLElement;
  result: HTMLElement;
  /** Full screen went on or off: the player builds falling notes when on, its own pick when off. */
  onChange: (on: boolean) => void;
}

export interface FullScreen {
  readonly on: boolean;
  /** While a take runs the controls hide; a tap shows them for a few seconds. */
  setRunning(running: boolean): void;
  /** Mirror the lesson's way forward (after a take its Skip becomes Next). */
  refresh(): void;
  destroy(): void;
}

const REVEAL_MS = 3500;

export function fullScreen(p: FullScreenParts): FullScreen {
  const mq = matchMedia(PHONE_LANDSCAPE);
  let on = false;
  let exited = false;
  let running = false;
  let revealed = false;
  let hideTimer = 0;
  const marks: [Node, Comment][] = [];

  const exitBtn = h('button', { class: 'secondary fs-exit', type: 'button', title: 'Leave full screen', 'aria-label': 'Leave full screen' }, '✕');
  const nextBtn = h('button', { class: 'fs-next', type: 'button' });
  const scoreBox = h('div', { class: 'fs-score' });
  const controls = h('div', { class: 'fs-controls' });
  const layer = h('div', { class: 'fs-layer' }, scoreBox, h('div', { class: 'fs-bar' }, controls, nextBtn, exitBtn));

  const forward = () => document.querySelector<HTMLButtonElement>('.top-next');
  const refresh = () => {
    const t = forward();
    nextBtn.hidden = !t || t.hidden || t.disabled;
    if (!t) return;
    nextBtn.textContent = t.textContent;
    nextBtn.classList.toggle('secondary', !t.classList.contains('go'));
  };
  nextBtn.onclick = () => forward()?.click();

  const paint = () => {
    layer.classList.toggle('show', !running || revealed);
    refresh();
  };
  const reveal = () => {
    revealed = true;
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => { revealed = false; paint(); }, REVEAL_MS);
    paint();
  };
  // A tap on the notes (not on a control or the result card) shows or hides the controls.
  layer.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button, a, select, input, label, .fs-result')) {
      if (running && revealed) reveal();
      return;
    }
    if (!running) return;
    if (revealed) { revealed = false; clearTimeout(hideTimer); paint(); } else reveal();
  });

  const move = (node: Node, into: HTMLElement) => {
    const mark = document.createComment('full screen');
    node.parentNode?.insertBefore(mark, node);
    marks.push([node, mark]);
    into.append(node);
  };
  const restore = () => {
    for (const [node, mark] of marks.splice(0)) mark.replaceWith(node);
    layer.remove();
    p.result.classList.remove('fs-result');
    document.body.classList.remove('fs-page');
  };
  const wanted = () => !exited && (previewHost ? true : !demo.active && mq.matches);
  const update = (notify = true) => {
    const want = wanted();
    if (want === on) return;
    on = want;
    if (on) {
      move(p.stage, layer);
      layer.prepend(p.stage);
      for (const el of p.score ?? []) move(el, scoreBox);
      if (p.controls) move(p.controls, controls);
      move(p.result, layer);
      p.result.classList.add('fs-result');
      layer.classList.toggle('preview', !!previewHost);
      (previewHost ?? document.body).append(layer);
      if (!previewHost) document.body.classList.add('fs-page');
      paint();
      // The lesson sets its forward button up just after the exercise is mounted.
      queueMicrotask(refresh);
    } else restore();
    if (notify) p.onChange(on);
  };
  exitBtn.onclick = () => { exited = true; update(); };
  // Turning to portrait and back brings full screen back after Leave.
  const onMedia = () => { if (!mq.matches) exited = false; update(); };
  mq.addEventListener('change', onMedia);
  update(false);

  return {
    get on() { return on; },
    setRunning(r: boolean) {
      running = r;
      revealed = false;
      clearTimeout(hideTimer);
      paint();
    },
    refresh,
    destroy() {
      clearTimeout(hideTimer);
      mq.removeEventListener('change', onMedia);
      if (on) restore();
      on = false;
    },
  };
}
