# Ideas log

Ideas built on a preview (docs/previews.md) for Ignas to try. Verdict: **go** (merged),
**no-go** (closed), or **pending**. Check here before proposing, so nothing is repeated.

| # | Date | Idea | PR / preview | Verdict |
|---|------|------|--------------|---------|
| 1 | 2026-10-25 | Note Rush: one-minute note-reading mini game (streaks, three levels, both clefs, best scores) | [#83](https://github.com/IgnPilv/iggyuoso/pull/83), [preview](https://ignpilv.github.io/iggyuoso/preview/pr-83/#/noterush) | kept |
| 2 | 2026-10-25 | Chord finder (`#/chords`): hold any keys, see the chord named, spelled, its position, other names and keys; or type a name (no ♯ or ♭ needed) to build it | [#85](https://github.com/IgnPilv/iggyuoso/pull/85) | kept |
| 3 | 2026-10-25 | Timing mirror (`#/pulse`): a metronome that shows each press early or late per hand, how steady each hand is, tap tempo, and silent bars to test the inner pulse | [#86](https://github.com/IgnPilv/iggyuoso/pull/86) | kept |
| 4 | 2026-10-25 | Jam room (`#/jam`): a band (drums, bass, chords) loops a progression in any key and groove while you improvise; lit chord and scale keys, every note counted as chord / scale / key / outside, with a tip | [#87](https://github.com/IgnPilv/iggyuoso/pull/87) | kept |
| 5 | 2026-10-25 | Scale gym (`#/scales`): scales and arpeggios on the click with textbook fingering on the keys; every note charted early or late, thumb passes and a bumping thumb called out per hand, with a tip; after Ignas's try: free tempo (no click, your own tempo, held back / hurried notes) and recognising the scale played | [#89](https://github.com/IgnPilv/iggyuoso/pull/89) | kept |
| 6 | 2026-10-25 | Play by ear (`#/byear`): hear the opening of a known public-domain tune, find it on the keys note by note with higher/lower and step/skip/leap hints, replays never counted, in any key or as a mystery | [#90](https://github.com/IgnPilv/iggyuoso/pull/90) | kept |
| 7 | 2026-10-25 | Play report (`#/report`): play anything with no click and nothing picked; it finds your own tempo and charts it, marks every note held back or hurried against the beat around it, stops, which hand lands first, the key, the chords with Roman numerals, loudness, and up to three tips | [#92](https://github.com/IgnPilv/iggyuoso/pull/92) | kept |
| 8 | 2026-10-25 | Duet (`#/duet`): you play a tune's melody, the app plays the left hand (held chords, oom-pah or rolling eighths) and follows you: starts when you start, learns your tempo, waits at every note; then where you held back or hurried against your own beat, where the band waited, the tempo, tips | [#94](https://github.com/IgnPilv/iggyuoso/pull/94) | kept |

**2026-10-25, end of the first run:** Ignas kept all eight ("sure add all"; any can still be cut
later). They are now the **practice room** (`src/modules/piano/ui/practiceRoom.ts`): one card on
home, each on its branch page (Note Rush: reading; Play by ear: ear; Duet: pieces; Chord finder:
theory; Timing mirror and Play report: rhythm; Scale gym: technique; Jam room: creativity) with
the milestone it is best after, and named on the recap of the lessons it fits.

