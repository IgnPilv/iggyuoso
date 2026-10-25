# Children's songs and singing games: traditional, in our own arrangements. Tunes in the short form
# of catalogue.M (durations carry on, octaves are the nearest note unless written, the key's sharps
# and flats are added).
from catalogue import tune

G = 'nursery'

tune('skip-to-my-lou', 'Skip to My Lou', 'Play-party song, America, 1840s', 'C', '4/4', 104,
     'E4:q C C E | G:h G | D:q B3 B D | F:h F | E:q C C E | G:h G | D:q E F E | D:h C',
     'C | C | G7 | G7 | C | C | G7 | G C', 2, G,
     story='Pioneer families in America danced to this at "play parties", where fiddles were frowned on, so everyone sang instead.',
     tips='The tune hops between C and G chords; the left hand moves to G in bars 3 and 7.')

tune('alouette', 'Alouette', 'French-Canadian song, 1800s', 'C', '4/4', 108,
     'C4:q D:e E E:q E | D:e C D E C:q G3 | C4:q D:e E E:q E | D:e C D E C:h',
     'C | G C | C | G C', 2, G,
     story='A French-Canadian song from the fur-trade boatmen. Each verse adds one more line, so it grows longer and longer.',
     tips='Short and bouncy: the eighths go "lou-et" and "gen-til".')

tune('ah-vous-dirai', 'Baa, Baa, Black Sheep', 'English rhyme, 1731, on the French tune "Ah! vous dirai-je, maman"', 'G', '4/4', 96,
     'G3:q G D4 D | E:e E E E D:h | C:q C B3 B | A:e A A A G:h | D4:q D:e D C:q C:e C | B3:q B:e B A:h | D4:q D:e D C:q C:e C | B3:q B:e B A:h | G:q G D4 D | E:e E E E D:h | C:q C B3 B | A A G:h',
     'G | C G | C G | D G | G C | G D | G C | G D | G | C G | C G | D G', 2, G,
     story='Same tune as Twinkle, Twinkle, but the English rhyme splits some notes in two: "have you a-ny wool". This time in G major, with F♯ (not used here).',
     tips='The right hand sits low, from G below middle C; the left hand stays an octave lower.')

tune('pease-porridge', 'Pease Porridge Hot', 'English rhyme, 1760s', 'C', '4/4', 96,
     'C4:q D E:h | C:q D E:h | E:q F G G | F E D:h | C:q D E:h | C:q D E:h | E:q F G G | F D C:h',
     'C | C | C | G | C | C | C | G C', 2, G,
     story='A clapping rhyme about pea soup ("pease porridge") that was hot, cold, and nine days old. Partners clap each other\'s hands on the beat.',
     tips='All in C position: thumb on C, every finger on its own key.')

tune('oh-where-has-my-dog', 'Oh Where, Oh Where Has My Little Dog Gone?', 'Septimus Winner, 1864, on the tune "Ach, du lieber Augustin"', 'F', '3/4', 120,
     'F4:q. G:e F:q | E D C | D G G | E C C | F:q. G:e F:q | E D C | D G E | F:h.',
     'F | C | C7 | F | F | C | C7 | F', 3, G,
     story='The Viennese tune "Ach, du lieber Augustin" is about a bagpiper said to have survived the plague of 1679. In English it became a song about a lost dog.',
     tips='F major: remember B♭ (it does not come up in the tune, but the left hand uses it in C7).')

tune('pop-goes-the-weasel', 'Pop! Goes the Weasel', 'English song and dance, 1850s', 'C', '6/8', 56,
     'C4:q C:e D:q D:e | E:e G E C:q. | C:q C:e D:q D:e | E:q. C:q. | C:q C:e D:q D:e | E:e G E C:q. | A4:q. D4:q F:e | E:q. C:q.',
     'C | C | G | C | C | C | F G | C', 7, G,
     story='Danced in London music halls in the 1850s. "Pop" was slang for pawning something, but nobody knows quite what the weasel was.',
     tips='Two big beats a bar. The "Pop!" in bar 7 jumps up to A: the hand moves during the dotted quarter before it.')

tune('itsy-bitsy-spider', 'The Itsy Bitsy Spider', 'Children\'s song, America, 1910s', 'C', '6/8', 58,
     'G3:e | C4:q C:e C:q D:e | E:q. E:q E:e | D:q C:e D:q E:e | C:q. r:q E:e | E:q. F:q G:e | G:q. r:q G:e | F:q E:e F:q G:e | E:q. r:q C:e | C:q. D:q E:e | E:q. r:q E:e | D:q C:e D:q E:e | C:q. r:q G3:e | G:q G:e C4:q C:e | C:q D:e E:q E:e | D:q C:e D:q E:e | C:q. r:q',
     '- | C | C | G | C | C | C | G | C | C | C | G | C | G | C | G | C', 7, G, pickup='e',
     story='A finger-play song: little hands climb like the spider, wiggle down as the rain, and open wide for the sun.',
     tips='Count "1 2 3 4 5 6", with the beats on 1 and 4. Each line ends with a long note and a rest: lift and breathe.')

tune('hickory-dickory', 'Hickory Dickory Dock', 'English rhyme, 1744', 'C', '6/8', 60,
     'E4:e F | G:q. A:q G:e | F:q E:e D:q. | E:q F:e G:q. | r:q. r:q E:e | F:q. G:q. | A:q G:e F:q E:e | D:q E:e C:q. | C:q. r:e',
     '- | C | G | C | C | F C | F C | G | C', 7, G, pickup='e e',
     story='One of the oldest English nursery rhymes: the mouse runs up the clock, the clock strikes one, the mouse runs down.',
     tips='The left hand holds still while the tune climbs; bars 5 and 6 change chord halfway.')

tune('sur-le-pont', 'Sur le pont d\'Avignon', 'French song, 1500s', 'C', '2/4', 104,
     'C4:q C | C:e D E:q | E:q E | E:e F G:q | F:q E | D:e E C:q | D:e E C:q | D:e E C:q | C:q C | C:e D E:q | E:q E | E:e F G:q | F:q E | D:e E C:q | D:q G3 | C4:h',
     'C | C | C | C | F C | G C | G C | G C | C | C | C | C | F C | G C | G | C', 3, G,
     story='Children have danced in a ring to this since the 1500s. The bridge in Avignon (Pont Saint-Bénézet) is real, and only four of its arches are still standing.',
     tips='Two beats a bar, quick and light. The eighth notes come in pairs: "pont d\'A-".')

tune('a-la-claire-fontaine', 'À la claire fontaine', 'French song, 1600s, sung in France and Québec', 'F', '3/4', 92,
     'F4:h F:q | A:h A:q | A:q G A | F:h. | F:h F:q | A:h G:q | A:q G F | A:h. | A:h A:q | G:h A:q | C5:q A4 F | G:h. | F:h F:q | A:h G:q | A:q G F | F:h.',
     'F | F | C F | F | F | F C | F C | F | F | C F | F | C | F | F C | F C | F', 3, G,
     story='"At the clear fountain": a French song that sailed to Canada in the 1600s and became almost a second anthem in Québec.',
     tips='Three gentle beats. Bars 1 and 2 hold the first note for two beats: count them.')

tune('hanschen-klein', 'Hänschen klein', 'German children\'s song, 1800s', 'C', '4/4', 104,
     'G4:q E E:h | F:q D D:h | C:q D E F | G G G:h | G:q E E:h | F:q D D:h | C4:q E G G | C4:w | D:q D D D | D E F:h | E:q E E E | E F G:h | G:q E E:h | F:q D D:h | C4:q E G G | C4:w',
     'C | G | C | C | C | G | C | C | G | G | C | C | C | G | C | C', 2, G,
     story='"Little Hans" sets off into the wide world and comes home a grown man. German children learn it as one of their first tunes.',
     tips='C position for both hands; bars 9 to 12 climb a step at a time.')

tune('alle-meine-entchen', 'Alle meine Entchen', 'German children\'s song, 1800s', 'C', '4/4', 100,
     'C4:e D E F G:q G | A:e A A A G:h | A:e A A A G:h | F:e F F F E:q E | D:e D D D C:h',
     'C | F C | F C | G C | G C', 2, G,
     story='"All my ducklings swim on the lake, heads in the water, tails in the air." It climbs the first five notes of the scale and paddles back down.',
     tips='Five fingers on five keys, C to G, then A with the fifth finger stretching one key.')

tune('kuckuck', 'Kuckuck, Kuckuck, ruft\'s aus dem Wald', 'German spring song, 1835 (words by Hoffmann von Fallersleben)', 'F', '3/4', 108,
     'C5:h A4:q | C5:h A4:q | G:q F G | F:h. | G:h G:q | A:h A:q | Bb:q A Bb | C5:h. | C5:h A4:q | C5:h A4:q | Bb:q A G | F:h.',
     'F | F | C F | F | C | F | C F | F | F | F | C | F', 3, G,
     story='The cuckoo calls from the wood: the falling third C–A in bars 1 and 2 is the cuckoo\'s own two notes.',
     tips='F major: B♭ comes in bar 7 and bar 11.')

tune('cadet-rousselle', 'Cadet Rousselle', 'French song, 1792', 'G', '4/4', 108,
     'G4:q G G D | B4:q B B G | C5:q C B A | G:h D | G:q G G D | B4:q B B G | C5:q A B A | G:h G',
     'G | G | C G | G D | G | G | C D | G', 3, G,
     story='Cadet Rousselle had three houses with no roofs and three coats with no sleeves. The song mocked a real bailiff of the town of Auxerre.',
     tips='G major: F♯ is not in the tune, but the D chord in the left hand has one.')

tune('polly-wolly', 'Polly Wolly Doodle', 'Minstrel song, America, 1880', 'F', '2/4', 116,
     'C4:e C C C | C:q F | A:e A A A | A:q F | G:e G G G | G:q E | F:e F F A | C5:q. r:e | A4:e A A A | A:q F | G:e G G G | G:q E | F:e F F F | G:e F E G | F:h',
     'F | F | F | F | C | C | F | F | F | F | C | C | F | C | F', 3, G,
     story='A cheerful nonsense song: "Oh, I went down south for to see my Sal, sing Polly wolly doodle all the day."',
     tips='Four eighths, then a quarter: the same rhythm in almost every bar.')

tune('long-long-ago', 'Long, Long Ago', 'Thomas Haynes Bayly, 1833', 'C', '4/4', 88,
     'C4:q C D E | E:h D | E:q E F G | G:h. r:q | A:q G F E | E:h D | C:q E D C | D:h. r:q | C:q C D E | E:h D | E:q E F G | G:h. r:q | A:q G F E | E:h D | C:q E D D | C:h. r:q',
     'C | G | C | C | F C | G | C G | G | C | G | C | C | F C | G | C G | C', 2, G,
     story='A parlour song of 1833 about old times remembered, sung in English, German and Japanese schools for two hundred years.',
     tips='Long notes at the end of every second bar: hold them for their full length while the left hand changes.')

tune('the-mulberry-bush', 'Here We Go Round the Mulberry Bush', 'English singing game, 1840s', 'C', '6/8', 58,
     'C4:q C:e C:q E:e | G:q E:e C:q. | D:q D:e D:q B3:e | G:q. G:q. | C4:q C:e C:q E:e | G:q E:e C:q. | D:q. G3:q. | C4:q. C:q.',
     'C | C | G | G | C | C | G | C', 7, G,
     story='Children walk in a ring and act out the verses: "this is the way we wash our clothes, so early Monday morning".',
     tips='Two big beats a bar. Bar 4 leaps down to G below middle C.')

# Five songs that were first met inside the early "Songbook" lessons, now each a song of its own.
tune('london-bridge', 'London Bridge Is Falling Down', 'English singing game, 1700s', 'C', '4/4', 100,
     'G4:q. A:e G:q F | E F G:h | D:q E F:h | E:q F G:h | G:q. A:e G:q F | E F G:h | D:h G | E:q C:h.',
     'C | C | G | C | C | C | G | C', 2, G,
     story='Two children make an arch with their arms, and the others walk under it until the song stops and the "bridge" falls on someone.',
     tips='The dotted quarter and eighth in bars 1 and 5 are "long-short". C position, with G as the top note.')

tune('frere-jacques', 'Frère Jacques', 'French round, 1700s', 'C', '4/4', 96,
     'C4:q D E C | C D E C | E F G:h | E:q F G:h | G:e A G F E:q C | G:e A G F E:q C | C G3 C4:h | C:q G3 C4:h',
     'C | C | C | C | C | C | C G | C G', 2, G,
     story='"Brother John, are you sleeping?" A round: a second player can start at the beginning when the first reaches bar 3, and the parts fit together all the way.',
     tips='Bars 7 and 8 drop to the G below middle C: a stretch of the thumb, or a small move of the hand.')

tune('au-clair-de-la-lune', 'Au clair de la lune', 'French song, 1700s', 'C', '4/4', 92,
     'C4:q C C D | E:h D:h | C:q E D D | C:w | C:q C C D | E:h D:h | C:q E D D | C:w | D:q D D D | A3:h A:h | D4:q C B3 A | G:w | C4:q C C D | E:h D:h | C:q E D D | C:w',
     'C | C G | C G | C | C | C G | C G | C | G | Dm | G | G | C | C G | C G | C', 2, G,
     story='"By the light of the moon": Pierrot is asked to lend his pen. The middle part dips below middle C, then the opening comes back: A B A form.',
     tips='Bars 9 to 12 go down to G below middle C: let the thumb move to that side first.')

tune('go-tell-aunt-rhody', 'Go Tell Aunt Rhody', 'American folk song, on a tune by Jean-Jacques Rousseau, 1752', 'C', '4/4', 96,
     'E4:h E:q D | C:h C | D:q D F E | D:h C:h | G:h G:q F | E:h E | D:q C D E | C:w',
     'C | C | G | G C | C | C | G | C', 2, G,
     story='The tune comes from an opera by the philosopher Jean-Jacques Rousseau, 1752. In America it became a song about an old grey goose.',
     tips='Five notes, C to G: one finger for each, no moving.')

tune('when-the-saints', 'When the Saints Go Marching In', 'Spiritual, America, early 1900s', 'C', '4/4', 104,
     'r:q C4 E F | G:w | r:q C E F | G:w | r:q C E F | G:h E:h | C:h E:h | D:w | r:q E E D | C:h. C:q | E:h G:q G | F:w | r:q E F G | E:h C:h | D:h. D:q | C:w',
     'C | C | C | C | C | C | C | G | C | C | C7 | F | C | C | G | C', 3, 'hymns',
     story='A spiritual that New Orleans jazz bands made their own, played slowly on the way to a funeral and fast on the way back.',
     tips='Each line starts after a rest on beat 1: count "(one) two three four".')
