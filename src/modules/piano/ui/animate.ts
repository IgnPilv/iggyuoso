// A drawing loop on animation frames, for screens that redraw as time passes.

/** Calls `draw(now)` every frame until the returned function is called (also from inside `draw`). */
export function animate(draw: (now: number) => void) {
  let raf = 0;
  // `draw` may stop the loop itself (a run that ends on its own), so the next frame is only asked
  // for while the loop is still on.
  let on = true;
  const tick = () => { draw(performance.now()); if (on) raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return () => { on = false; cancelAnimationFrame(raf); };
}
