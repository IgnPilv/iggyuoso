import { describe, expect, it } from 'vitest';
import { prefixedBackend, previewPrefix, seedPreview } from '../src/core/preview';
import { memoryBackend, type Backend } from '../src/core/storage';

describe('preview storage', () => {
  it('keeps its own copy of the records, seeded once from the main site without the account', () => {
    const base = memoryBackend() as Required<Backend>;
    base.set('iggyuoso.ex.a', '{"best":90}');
    base.set('iggyuoso.account', '{"email":"x"}');
    base.set('iggyuoso.sync.changes', '{}');
    base.set('other', '1');
    const p = prefixedBackend(base, previewPrefix('pr-1'));
    seedPreview(base, p);
    expect(p.get('iggyuoso.ex.a')).toBe('{"best":90}');
    expect(p.get('iggyuoso.account')).toBeNull();
    expect(p.get('iggyuoso.sync.changes')).toBeNull();
    p.set('iggyuoso.ex.a', '{"best":99}');
    expect(base.get('iggyuoso.ex.a')).toBe('{"best":90}');
    expect(base.get('iggyuoso-preview-pr-1.ex.a')).toBe('{"best":99}');
    expect(p.keys().sort()).toEqual(['iggyuoso.ex.a', 'iggyuoso.preview.seeded']);
    // Seeded once: later main-site changes don't overwrite the preview's.
    base.set('iggyuoso.ex.a', '{"best":10}');
    seedPreview(base, p);
    expect(p.get('iggyuoso.ex.a')).toBe('{"best":99}');
  });
});
