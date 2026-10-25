import { describe, expect, it, vi } from 'vitest';

describe('animate', () => {
  it('stops for good when the draw itself stops it', async () => {
    const frames: (() => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (f: () => void) => frames.push(f));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const { animate } = await import('../src/modules/piano/ui/animate');
    let draws = 0;
    const stop = animate(() => { draws++; if (draws === 2) stop(); });
    for (let i = 0; i < 5 && frames.length; i++) frames.shift()!();
    expect(draws).toBe(2);
    expect(frames).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});
