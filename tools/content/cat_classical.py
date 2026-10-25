# Classical themes: by composers who died more than 70 years ago, published before 1930, in our own
# arrangements (the tune as the composer wrote it, simplified where it needs to be, over our own left
# hand). Short form: see catalogue.M.
from catalogue import tune

G = 'classical'

tune('surprise-symphony', 'Surprise Symphony', 'Joseph Haydn, Symphony No. 94, 1791', 'C', '2/4', 84,
     'C4:e C E E | G G E:q | F:e F D D | B3 B G:q | C4:e C E E | G G E:q | F:e F D D | B3 B G:q',
     'C | C | G7 | G | C | C | G7 | G', 3, G,
     story='Haydn\'s slow movement tiptoes along twice, the second time very softly, and then the whole orchestra crashes in on one chord. He wanted to wake up the London audience.',
     tips='Short, light eighths, like walking on tiptoe. The tune is just the C and G chords spelled out.')

tune('bridal-chorus', 'Bridal Chorus', 'Richard Wagner, "Lohengrin", 1850', 'C', '4/4', 80,
     'G4:q | C5:q. C:e C:h | r:q G4 D5:q. B4:e | C5:h. G4:q | C5:q. F:e F:q. E:e | D:q. C:e B4:q. C5:e | D:h. G4:q | C5:q. C:e C:h | r:q G4 D5:q. B4:e | C5:h.',
     '- | C | G | C | F | G | G | C | G | C', 3, G, pickup='q',
     story='"Here comes the bride": sung in Wagner\'s opera as the couple go to their room, and played at weddings ever since.',
     tips='Long-short (dotted quarter, eighth) in almost every bar: keep it stately, not jumpy.')

tune('symphony-5', 'Symphony No. 5: the opening', 'Ludwig van Beethoven, 1808', 'Cm', '2/4', 108,
     'r:e G4 G G | E:h | r:e F F F | D:h | r:e G G G | E A A A | G E5 E E | C5:h',
     'Cm | Cm | G7 | G7 | Cm | Ab | Cm | Cm', 4, G,
     story='Four notes, short-short-short-long, that everyone knows. The story that it is "fate knocking at the door" came from Beethoven\'s secretary, who liked to make things up.',
     tips='Each bar starts with an eighth-note rest: feel the beat, then play. C minor: E♭ and A♭.')

tune('can-can', 'Can-Can', 'Jacques Offenbach, "Orpheus in the Underworld", 1858', 'C', '2/4', 112,
     'C5:q D:e F | E D G:q | G:q G:e A | E F D:q | D:q F:e E | D C C6:q | B5:e A G F | E D C:q',
     'C | C | G7 | G7 | G7 | C | G7 | C', 4, G,
     story='Offenbach wrote this galop for a party of gods in the underworld. Paris dancers made it famous with high kicks, and it has been "the can-can" ever since.',
     tips='Fast and bright. Bar 6 leaps up an octave to high C: prepare the hand on the C before it.')

tune('blue-danube', 'The Blue Danube', 'Johann Strauss II, 1866', 'D', '3/4', 152,
     'D4:q D F# | A:h. | r:q A A | r:q F# F# | D:q D F# | A:h. | r:q A A | r:q G G | C#4:q C# E | B4:h. | r:q B B | r:q G G | C#4:q C# E | B4:h. | r:q B B | r:q F# F# | D:q D F# | A:h. | r:q D5 D | D5:h.',
     'D | D | D | D | D | D | D | A7 | A7 | A7 | A7 | A7 | A7 | A7 | A7 | D | D | D | D | D', 5, G,
     story='The most famous waltz of all, from Vienna. The "pa-pa, pa-pa" answers after each long note are horns and trumpets in the orchestra.',
     tips='One strong beat per bar. The tune climbs the D chord, then the A7 chord (C♯ E B), then home.')

tune('mountain-king', 'In the Hall of the Mountain King', 'Edvard Grieg, "Peer Gynt", 1875', 'Am', '4/4', 96,
     'A3:e B C4 D E C E:q | D#:e B3 D#4:q D:e Bb3 D4:q | A3:e B C4 D E C E A | G:e E C E G:h | A3:e B C4 D E C E:q | D#:e B3 D#4:q D:e Bb3 D4:q | A3:e B C4 D E C E A | G:e E C E G:h | A3:w',
     'Am | E | Am | C | Am | E | Am | C | Am', 4, G,
     story='Peer Gynt creeps into the troll king\'s hall. Grieg\'s tune starts softly and slowly and gets faster and louder until the trolls chase him out.',
     tips='Tiptoe eighths. Bar 2 has D♯ then D♮ and B♭: a chromatic slide.')

tune('swan-lake', 'Swan Lake', 'Pyotr Ilyich Tchaikovsky, 1876', 'Bm', '4/4', 66,
     'F#4:h B3:e C#4 D E | F#:h. D:q | F#:h. D:q | F#:h. B3:q | D4:q B3 G D4 | B3:w | F#4:h B3:e C#4 D E | F#:h. D:q | F#:h. D:q | F#:h. B3:q | D4:q B3 G D4 | B3:w',
     'Bm | Bm | Bm | Bm | G | Bm | Bm | Bm | Bm | Bm | G | Bm', 6, G,
     story='The swans\' theme, played by an oboe over shimmering strings. Odette is a princess turned into a swan by day.',
     tips='B minor: F♯ and C♯. Long notes: let them sing for their full value.')

tune('morning-mood', 'Morning Mood', 'Edvard Grieg, "Peer Gynt", 1875', 'E', '6/8', 46,
     'B4:e G F E F G | B G F E F G | F G B G B C5 | G4 C5 B4 G F E | B4 G F E F G | B G F E F G | F G B G B C5 | G4 C5 B4 G F E | E:h.',
     'E | E | E | B7 E | E | E | E | B7 E | E', 7, G,
     story='Sunrise, in a flute and an oboe passing the tune back and forth. Grieg set it in the Moroccan desert, but most people hear a Norwegian morning.',
     tips='E major: four sharps (F♯ C♯ G♯ D♯). The tune rocks on E, F♯, G♯ and B, like a five-note scale.')

tune('symphony-40', 'Symphony No. 40', 'Wolfgang Amadeus Mozart, 1788', 'Gm', '4/4', 116,
     'E5:e D | D:q E:e D D:q E:e D | D:q B5:q r:q B5:e A | G:q G:e F E:q E:e D | C:q C:q r:q D:e C | C:q D:e C C:q D:e C | C:q A5:q r:q A5:e G | F#:q F#:e E D:q D:e C | B4:q B r:q',
     '- | Gm | Gm | Cm | D7 | D7 | D7 | D7 | Gm', 7, G, pickup='e e',
     story='One of only two symphonies Mozart wrote in a minor key. The restless sighing tune (a falling half step) starts straight away, with no introduction.',
     tips='G minor: B♭ and E♭, and F♯ in bar 7. Keep the sighing pairs light.')

tune('jesu-joy', 'Jesu, Joy of Man\'s Desiring', 'Johann Sebastian Bach, Cantata BWV 147, 1723', 'G', '3/4', 56,
     'G4:e3 A B D5 C C E D D | G5:e3 F G D5 B4 G A B C5 | D5:e3 E D C B4 A B G F | G4:e3 A D4 F# A C5 B4 A B | G4:e3 A B D5 C C E D D | G5:e3 F G D5 B4 G A B C5 | D5:e3 E D C B4 A B G F | G4:h.',
     'G | G | C D | D G | G | G | C D | G', 6, G,
     story='The flowing triplets are the orchestra\'s part; between them the choir sings a hymn tune. Bach wrote it for a church cantata in Leipzig.',
     tips='Three notes to every beat, smooth and even: "trip-o-let". Do not let the first of each three bump.')

tune('minuet-g-minor', 'Minuet in G minor', 'Christian Petzold, from Anna Magdalena Bach\'s notebook, 1725', 'Gm', '3/4', 100,
     'D5:q G4:e A B C5 | D5:q G4 G | E5:q C5:e D E F | G5:q G4 G | C5:q D5:e C B4 A | B4:q C5:e B4 A G | F#:q G:e A B G | A:h. | D5:q G4:e A B C5 | D5:q G4 G | E5:q C5:e D E F | G5:q G4 G | C5:q D5:e C B4 A | B4:q C5:e B4 A G | A:q B:e A G F# | G:h.',
     'Gm | Gm | Cm | Gm | F | Gm | D | D | Gm | Gm | Cm | Gm | F | Gm | D | Gm', 7, G,
     story='The partner of the famous Minuet in G major, from the notebook Bach kept for his wife Anna Magdalena. For a long time both were thought to be by Bach himself.',
     tips='G minor: B♭ and E♭ in the key, F♯ as the leading note.')

tune('turkish-march', 'Turkish March', 'Wolfgang Amadeus Mozart, Sonata K. 331, 1783', 'Am', '2/4', 96,
     'B4:s A G# A | C5:e r D5:s C B4 C5 | E5:e r F5:s E D# E | B5:s A G# A B A G# A | C6:q A5:e C6 | B5:e A G# A | E5:e F D:q | C5:q B4:q | A4:q',
     '- | Am | Am | Am | Am | E | Dm | Am E | Am', 7, G, pickup='s s s s',
     story='"Rondo alla Turca": Mozart imitating the Turkish military bands (with drums and cymbals) that were all the rage in Vienna.',
     tips='The four-note turns (B A G♯ A) must be even and light: fingers close to the keys.')

tune('entertainer', 'The Entertainer', 'Scott Joplin, 1902', 'C', '2/4', 76,
     'D4:s D# | E4:s C5:e E4:s C5:e E4:s C5:s~ | C5:q. C5:s D5:s | D#5:s E5 C5 D5 E5:e B4:s D5:s | C5:q. D4:s D#4:s | E4:s C5:e E4:s C5:e E4:s C5:s~ | C5:q r:s A4:s G4:s F#4:s | A4:s C5 E5:e D5:s C5 A4 D5:s~ | D5:q. D4:s D#4:s | E4:s C5:e E4:s C5:e E4:s C5:s~ | C5:q. C5:s D5:s | D#5:s E5 C5 D5 E5:e B4:s D5:s | C5:q.',
     '- | C | C | C G7 | C | C | C D7 | G | G | C | C | C G7 | C', 9, 'ragtime', pickup='s s', styles=('root', 'oompah'),
     story='Joplin, "the King of Ragtime", wrote it in 1902. The left hand goes "oom-pah" like a march while the right hand pushes notes ahead of the beat: that is the syncopation of ragtime.',
     tips='Not too fast: Joplin wrote on his rags "it is never right to play ragtime fast". The tied notes land just before the beat.')

tune('fur-elise-song', 'Für Elise', 'Ludwig van Beethoven, 1810', 'Am', '3/8', 60,
     'E5:s D# | E5:s D# E B4 D5 C | A4:e r:s C4:s E A | B4:e r:s E4:s G# B | C5:e r:s E4:s E5 D# | E5:s D# E B4 D5 C | A4:e r:s C4:s E A | B4:e r:s E4:s C5 B4 | A4:q',
     '- | r | Am | E | Am | r | Am | E | Am', 6, G, pickup='s s',
     left='r:e | r:q. | A2:s E3 A3 r:s r:e | E2:s E3 G#3 r:s r:e | A2:s E3 A3 r:s r:e | r:q. | A2:s E3 A3 r:s r:e | E2:s E3 G#3 r:s r:e | A2:s E3 A3 r:s',
     story='Beethoven\'s little piece "for Elise" was found after his death; nobody is sure who Elise was. Here is the famous opening part, with Beethoven\'s own rippling left hand in the fuller arrangement.',
     tips='The E–D♯ wobble is light and even. In the fuller arrangement the hands take turns: the left hand\'s three notes, then the right hand\'s.')

tune('moldau', 'The Moldau', 'Bedřich Smetana, "Má vlast", 1874', 'Em', '6/8', 50,
     'B3:e | E4:q F#:e G:q A:e | B:q. B:q. | C5:q. E5:q C5:e | B4:q. B:q. | A:q. C5:q A4:e | G:q. G:q. | F#:q F#:e G:q F#:e | E:q. r:q',
     '- | Em | Em | Am | Em | Am | Em | B7 | Em', 7, G, pickup='e',
     story='Smetana\'s river music: the Vltava (Moldau in German) flows from two springs through Bohemia to Prague. The tune is the river itself, broad and singing.',
     tips='E minor: F♯. Two big beats in a bar; let each long note flow into the next.')

tune('sonata-k545', 'Sonata facile', 'Wolfgang Amadeus Mozart, Sonata in C, K. 545, 1788', 'C', '4/4', 84,
     'C5:h E5:q G | B4:q. C5:s D C5:h | A5:h G5:q C6 | G5:q F:e G E:h | A4:s B C5 D E F G A G F E D C B4 A G | G4:s A B C5 D E F G F E D C B4 A G F | F4:s G A B C5 D E F E D C B4 A G F E | E4:s F G A B C5 D E D C B4 A G F E D | C4:w',
     'C | G7 C | F C | G7 C | F | C | Dm | G | C', 8, G, styles=('block', 'alberti'),
     story='Mozart called it "a little sonata for beginners", but its scales need real evenness. The left hand is the Alberti bass: low, high, middle, high.',
     tips='The scale bars run in sixteenths: practise them slowly on the tempo ladder, thumb passing smoothly under.')

def _prelude():
    # Bach's Prelude in C: each bar one chord, broken the same way twice (two notes in the left hand, three in the right, twice).
    bars = [('C', 'C4', 'E4', 'G4 C5 E5'), ('Dm7', 'C4', 'D4', 'A4 D5 F5'), ('G7', 'B3', 'D4', 'G4 D5 F5'), ('C', 'C4', 'E4', 'G4 C5 E5'),
            ('Am', 'C4', 'E4', 'A4 E5 A5'), ('D7', 'C4', 'D4', 'F#4 A4 D5'), ('G', 'B3', 'D4', 'G4 D5 G5'), ('C', 'B3', 'C4', 'E4 G4 C5'),
            ('Am7', 'A3', 'C4', 'E4 G4 C5'), ('D7', 'D3', 'A3', 'D4 F#4 C5'), ('G', 'G3', 'B3', 'D4 G4 B4'), ('G7', 'G3', 'Bb3', 'E4 G4 C#5'),
            ('Dm', 'F3', 'A3', 'D4 A4 D5'), ('Dm', 'F3', 'Ab3', 'D4 F4 B4'), ('C', 'E3', 'G3', 'C4 G4 C5'), ('F', 'E3', 'F3', 'A3 C4 F4'),
            ('Dm7', 'D3', 'F3', 'A3 C4 F4'), ('G7', 'G2', 'D3', 'G3 B3 F4'), ('C', 'C3', 'E3', 'G3 C4 E4')]
    right = ' | '.join(' '.join(f'r:e {a}:s {b}:s {c}:s {a}:s {b}:s {c}:s'.replace('r:e', 'r:e') for _ in range(2)).replace(' ', ' ')
                       for _, _, _, t in bars for a, b, c in [t.split()])
    left = ' | '.join(f'{lo}+{hi}:h {lo}+{hi}:h' for _, lo, hi, _ in bars)
    return right + ' | E4+G4+C5:w', left + ' | C3+C4:w', ' | '.join(c for c, *_ in bars) + ' | C'

_r, _l, _c = _prelude()
tune('bach-prelude-c', 'Prelude in C', 'Johann Sebastian Bach, The Well-Tempered Clavier, Book 1, 1722', 'C', '4/4', 60,
     _r, _c, 6, G, left=_l, styles=('root', 'block'), pedal=False,
     story='The first piece of Bach\'s "Well-Tempered Clavier": no tune at all, just one chord per bar, broken the same way. The music is in how the chords move. Gounod later sang an "Ave Maria" over it.',
     tips='In the fuller arrangement the left hand holds the two low notes and the right hand ripples the three high ones, twice a bar. Listen to which note changes from one chord to the next.')
