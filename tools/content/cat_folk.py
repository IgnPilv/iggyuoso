# Folk songs from around the world: traditional, or by songwriters who died long ago, in our own
# arrangements. Short form: see catalogue.M.
from catalogue import tune

G = 'folk'

tune('kumbaya', 'Kumbaya', 'Spiritual, Gullah people of South Carolina and Georgia, 1920s', 'C', '4/4', 76,
     'C4:q E G:h | G:q A G:h | C4:q E G:h | G:q F E:h | C4:q E G:h | G:q A G:h | F:q E D D | C:w',
     'C | F C | C | G C | C | F C | F G | C', 2, G,
     story='"Come by here": a prayer song first written down in the 1920s from Gullah singers in the American South, and sung round campfires all over the world since.',
     tips='Slow and calm. Every bar starts with a long-ish note: keep the hand loose.')

tune('michael-row', 'Michael, Row the Boat Ashore', 'Spiritual, Sea Islands of Georgia, 1860s', 'C', '4/4', 92,
     'C4:q E G:q. E:e | G:q A G:h | E:q G A:q. G:e | G:w | E:q G G:q. E:e | F:q E D:h | C:q D E:q. D:e | C:w',
     'C | F C | C F | C | C | G | C G | C', 2, G,
     story='Freed slaves on the Sea Islands of Georgia sang it as they rowed in the 1860s. "Hallelujah" falls on bars 3 and 4, and again on 7 and 8.',
     tips='The dotted quarter and eighth (bars 1, 3, 5, 7) are "long-short": count "1 2 3-and 4".')

tune('scarborough-fair', 'Scarborough Fair', 'English ballad, 1600s and older', 'Dm', '3/4', 92,
     'D4:h D:q | A4:h A:q | E4:q. F:e E:q | D:h. | r:q A4:q C5:q | D5:h C:q | A4:q Bn G | A:h. | r:q r D5:q | D5:h D:q | C:h A4:q | A:q G F | E:q C:h | D:h A4:q | G:h F:q | E:q D C | D:h.',
     'Dm | Dm | C | Dm | Dm | F | G | Am | Dm | Dm | F | Dm | C | Dm | C | C | Dm', 5, G,
     story='An old riddle song: a lover sets impossible tasks, like a shirt sewn without a needle. It is in the Dorian mode, D minor with a B natural (bar 7), which gives it its misty sound.',
     tips='D minor with one flat, but this tune has B natural in bar 7: the Dorian sixth.')

tune('my-bonnie', 'My Bonnie Lies Over the Ocean', 'Scottish song, 1880s', 'C', '3/4', 104,
     'G3:q | E4:q. D:e C:q | D:q C A3 | G:q E:h | r:h G3:q | E4:q. D:e C:q | C:q B3 C4 | D:h. | r:h G3:q | E4:q. D:e C:q | D:q C A3 | G:q E:h | r:h G3:q | A3:q D4 C | B3:q A B | C4:h',
     '- | C | F | C | C | C | G | G | G | C | F | C | C | D7 | G | C', 3, G, pickup='q',
     story='Sung by Scottish students in the 1880s; some say "Bonnie" was Bonnie Prince Charlie, who fled over the sea in 1746.',
     tips='The tune swoops down a sixth in bar 1 ("Bon-nie lies"): let the hand float, not stretch.')

tune('camptown-races', 'Camptown Races', 'Stephen Foster, 1850', 'C', '2/4', 108,
     'G4:e G E G | A G E:q | E:e D:q. | E:e D:q. | G:e G E G | A G E:q | D:e D E D | C:h | C:e. C:s E:e G | C5:h | A4:e. A:s C5:e A4 | G:h | G:e G E E | G G E:q | D:e D E D | C:h',
     'C | C | G | G | C | C | G | C | C | C | F | C | C | C | G | C', 3, G,
     story='Stephen Foster wrote it in 1850 for minstrel shows. "Doo-dah! doo-dah!" in bars 3 and 4 is the bit everyone joins in.',
     tips='The chorus (bar 9 on) has a dotted eighth and sixteenth: "Go-in\' to run".')

tune('swanee-river', 'Old Folks at Home (Swanee River)', 'Stephen Foster, 1851', 'C', '4/4', 76,
     'E4:q. D:e C E D C | C5:h A4:q C5 | G4:h E:q C | D:h. r:q | E:q. D:e C E D C | C5:h A4:q C5 | G4:q E C D | C:h. r:q',
     'C | F | C | G | C | F | C G | C', 3, G,
     story='Foster never saw the Suwannee River in Florida; he picked the name off a map because it sang well.',
     tips='Bar 2 leaps up to high C: the hand moves during the eighths of bar 1.')

tune('sakura', 'Sakura, Sakura', 'Japanese folk song, 1800s', 'Am', '4/4', 66,
     'A4:q A B:h | A:q A B:h | A:q B C5 B | A:q B:e A F:h | E:q C E F | E:q E:e C B3:h | A4:q B C5 B | A:q B:e A F:h | E:q C E F | E:q E:e C B3:h | A4:q A B:h | A:q A B:h | E4:q F B:e A F:q | E:w',
     'Am | Am | Am | Dm | Am | E | Am | Dm | Am | E | Am | Am | Dm | E', 4, G,
     story='"Cherry blossoms": a Japanese song on a five-note scale (A B C E F) that sounds like the koto, the Japanese zither.',
     tips='Only five different notes. It ends on E, not A: it floats rather than closes.')
