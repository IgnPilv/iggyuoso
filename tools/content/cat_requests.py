# Songs Ignas asked for by name ("By request"). Unlike the rest of the catalogue these are not public
# domain: each one ships only because he named it himself (see CLAUDE.md). Always our own arrangement.
from catalogue import tune

# Sea Shanty 2 (Ian Taylor, RuneScape, 2004). The tune taken from the MIDI file Ignas sent (never
# committed): the main tune, the call on the E chord, the flute tune of the middle (an octave down) and
# the accordion's tune with its G natural, then the main tune again. Staccato quarters written as
# quarters; the chords and both left hands are ours.
A = ('A5:q E:e D C:q. C:e | D:e E F G E:h | F:q E:e D C:q C | B:q C D:h | '
     'A5:q E:e D C:h | C:e D E F D:h | F:e E D C B C D F | E:e D C B A:h')
B = ('C5:e B C:q C C:e B | C:q B C:h | A:e B C D C:q B | C:h r:h | '
     'C5:e B C:q C D:e C | B:q A C:h | C:e B C D C:q A | C:h r:h')
C = 'E5:e D E:q E E:e D | E:q F E:h | G:q G:e F E:q D | E:h r:h'
B2 = 'C5:e B C:q C B:e C | D:q B C:h | C:e B C D C:q A | A4:h r:h'
D = ('r:q A5:q C#5 A4 | C#5:e D C D C:q. C:e | D:q E Gn:e F Gn:q | E:h r:h | '
     'C5:e D E Gn F:s E D C r:q | r:s F5 E D r:q E:s C B A r:q | A4:e B C D E D C B | C5:e r:e Gn4:q A:h')
E = ('A4:e r:e E:e F Gn:q E | A4:e r:e E:e F Gn:q E | A4:e r:e E:e F Gn:q A | B:e A B:q E4:h | '
     'A4:e r:e E:e F Gn:q E | A4:e r:e E:e F Gn:q E | A4:e r:e E:e F Gn:q A | B:q A:h r:q')

CA = 'A | E | D A | E7 | A | A D | D Bm | E A'
CB = 'A | A | A | A | A | A | A | A'
CC = 'E | E | E | E'
CB2 = 'A | E A | A | A'
CD = 'A | A | G | A | A D | D A | A E | A'
CE = 'A | A | A | E | A | A | A | A'

tune('sea-shanty-2', 'Sea Shanty 2', 'Ian Taylor, for the game RuneScape, 2004 · by request', 'A', '2/2', 100,
     ' | '.join([A, B, C, B2, D, E, B, C, B2]), ' | '.join([CA, CB, CC, CB2, CD, CE, CB, CC, CB2]), 5, 'requests',
     'The jaunty sailors\' tune from RuneScape that became an internet favourite. This is our own arrangement: '
     'the main tune, a call over the E chord, the flute and accordion tunes from the middle (with a G natural, '
     'the sound of a sea shanty), and the main tune again, over a left hand that rocks like a ship.',
     tips='Two beats in a bar: count the half notes, not the quarters. A major: remember F♯, C♯ and G♯, '
          'except in the middle tunes, where every G is natural. Keep the short notes light and bouncy.',
     styles=('fifth', 'oompah'))
