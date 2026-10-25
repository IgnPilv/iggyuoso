import { typing } from '../midi/computerKeys';

/**
 * While a lesson or exercise is on screen, Space never presses a focused button or link (that is
 * how a browser treats Space, and it made Space start an exercise and skip to the next step at
 * once). Space is kept for Play / Pause / Resume and the computer keyboard's pedal; Enter still
 * presses buttons. Both keydown and keyup are held back, since some browsers click on keyup.
 * Returns the function that removes the guard.
 */
export function guardSpace(): () => void {
  const hold = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || typing(e.target)) return;
    const el = e.target as HTMLElement | null;
    if (el?.closest?.('button, a, summary, [role="button"], input[type="checkbox"], input[type="radio"]')) e.preventDefault();
  };
  window.addEventListener('keydown', hold, { capture: true });
  window.addEventListener('keyup', hold, { capture: true });
  return () => {
    window.removeEventListener('keydown', hold, { capture: true });
    window.removeEventListener('keyup', hold, { capture: true });
  };
}
