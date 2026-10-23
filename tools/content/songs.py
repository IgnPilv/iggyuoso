# The songbook: public-domain tunes, arranged by us, opening after the milestones.
# Each song becomes a lesson: the tune (right hand), the left hand, both together, and for most a
# richer arrangement. Melodies are written out in full here; left hands come from the chords.
from lib import *

M1, M2, M3, M4, M5, M6, M7, M8 = 'y1-checkpoint-a', 'y1-checkpoint-b', 'y1-exit', 'y2-checkpoint-a', 'y2-checkpoint-b', 'y2-exit', 'm7-flat-keys', 'm8-arpeggios'
STAGE_AFTER = {M1: 2, M2: 3, M3: 4, M4: 5, M5: 6, M6: 7, M7: 8, M8: 9}

SONGS = []
def song(id, title, about, key, meter, tempo, melody, chords, shelf, styles=('root', 'block'), pickup=None, story='', tips='', pedal=False):
    SONGS.append(dict(id=id, title=title, about=about, key=key, meter=meter, tempo=tempo, melody=melody, chords=chords,
                      shelf=shelf, styles=styles, pickup=pickup, story=story, tips=tips, pedal=pedal))

# ---------------------------------------------------------------- after Milestone 1: tune plus one bass note

song('rain-rain', 'Rain, Rain, Go Away', 'Children\'s chant, England', 'C', '4/4', 88,
     'G4:h E4:h | G4:q G4:q E4:h | G4:q G4:q E4:q E4:q | A4:q G4:q E4:h | G4:h E4:h | G4:q G4:q E4:h | G4:q G4:q E4:q E4:q | A4:q G4:q C4:h',
     'C | C | C | F C | C | C | C | F C', M1, ('root', 'fifth'),
     story='Children all over the world sing this chant on just two or three notes: G, E and A. Musicians call it *sol–mi–la*.',
     tips='The left hand only changes in bars 4 and 8, to F for two beats and back to C.')

song('twinkle', 'Twinkle, Twinkle, Little Star', 'French tune "Ah! vous dirai-je, maman", 1761', 'C', '4/4', 92,
     'C4:q C4:q G4:q G4:q | A4:q A4:q G4:h | F4:q F4:q E4:q E4:q | D4:q D4:q C4:h | G4:q G4:q F4:q F4:q | E4:q E4:q D4:h | G4:q G4:q F4:q F4:q | E4:q E4:q D4:h | C4:q C4:q G4:q G4:q | A4:q A4:q G4:h | F4:q F4:q E4:q E4:q | D4:q D4:q C4:h',
     'C | F C | F C | G C | C F | C G | C F | C G | C | F C | F C | G C', M1, ('root', 'block'),
     story='The tune is a French song from the 1760s. Mozart wrote twelve variations on it, and English children sing it as *Twinkle, Twinkle* and *Baa, Baa, Black Sheep*.',
     tips='Two chords in most bars: the left hand moves on beat 3. Lift and move early, then land on time.')

song('westminster', 'Westminster Chimes', 'Clock chime, Cambridge 1793, Big Ben since 1859', 'C', '3/4', 80,
     'E4:q D4:q C4:q | G3:h. | C4:q E4:q D4:q | G3:h. | C4:q D4:q E4:q | C4:h. | E4:q C4:q D4:q | G3:h. | G3:q D4:q E4:q | C4:h.',
     'C | G | C | G | C | C | C | G | G | C', M1, ('root', 'fifth'),
     story='Big Ben in London plays these four-note "changes" every quarter of an hour, and the full set on the hour. The tune was written for a church in Cambridge in 1793.',
     tips='Let each long note ring like a bell, all three beats. The left hand rings low with it.')

song('old-macdonald', 'Old MacDonald Had a Farm', 'Folk song, England and America', 'G', '4/4', 100,
     'G4:q G4:q G4:q D4:q | E4:q E4:q D4:h | B4:q B4:q A4:q A4:q | G4:h. D4:q | G4:q G4:q G4:q D4:q | E4:q E4:q D4:h | B4:q B4:q A4:q A4:q | G4:w',
     'G | C G | G D | G | G | C G | G D | G', M1, ('root', 'fifth'),
     story='"E-I-E-I-O": a farm song sung in a hundred versions, one animal at a time.',
     tips='Right hand in G position, thumb on G... but the tune dips to D below it. Use your thumb for D and shift.')

song('going-home', 'Going Home', 'Dvořák, Symphony "From the New World", 1893', 'C', '4/4', 60,
     'E4:q G4:q G4:h | E4:q D4:q C4:h | D4:q E4:q G4:q E4:q | D4:w | E4:q G4:q G4:h | E4:q D4:q C4:h | D4:q E4:q D4:q C4:q | C4:w',
     'C | C | G | G | C | Am | G | C', M1, ('root', 'block'),
     story='Antonín Dvořák wrote this slow melody for the cor anglais in his New World Symphony, after a stay in America. Words were added later and it became a song.',
     tips='Very slow and very smooth. Breathe at the end of bar 4.')


song('hot-cross-buns', 'Hot Cross Buns', 'Street cry, London, 1700s', 'C', '4/4', 88,
     'E4:q D4:q C4:h | E4:q D4:q C4:h | C4:e C4:e C4:e C4:e D4:e D4:e D4:e D4:e | E4:q D4:q C4:h',
     'C | C | C G | C', M1, ('root', 'block'),
     story='Bakers in London sang this to sell spiced buns at Easter: "one a penny, two a penny".',
     tips='Three notes only: E, D, C. The eighths in bar 3 are twice as fast: "one-and two-and".')

song('mary-lamb', 'Mary Had a Little Lamb', 'Tune by Lowell Mason, words by Sarah Josepha Hale, 1830', 'C', '4/4', 96,
     'E4:q D4:q C4:q D4:q | E4:q E4:q E4:h | D4:q D4:q D4:h | E4:q G4:q G4:h | E4:q D4:q C4:q D4:q | E4:q E4:q E4:q E4:q | D4:q D4:q E4:q D4:q | C4:w',
     'C | C | G | C | C | C | G | C', M1, ('root', 'fifth'),
     story='A poem about a real girl whose lamb followed her to school, set to a simple tune in 1830.',
     tips='Right thumb on C. Only the left hand moves, once, to G in bar 3 and bar 7.')

song('this-old-man', 'This Old Man', 'Counting song, England', 'C', '4/4', 100,
     'G4:q E4:q G4:h | G4:q E4:q G4:h | A4:q G4:q F4:q E4:q | D4:q E4:q F4:h | E4:e F4:e G4:q C4:q C4:e C4:e | C4:e D4:e E4:e F4:e G4:h | G4:q D4:q F4:q E4:q | D4:q C4:h.',
     'C | C | F | G | C | C | G | G C', M1, ('root', 'block'),
     story='A counting song: "he played one, he played knick-knack on my thumb". Each verse counts one higher.',
     tips='Bar 5 has eighths: "knick-knack pad-dy-whack". Bar 6 runs straight up the C position.')

# ---------------------------------------------------------------- after Milestone 2: chords in the left hand

song('yankee-doodle', 'Yankee Doodle', 'Folk song, America, 1700s', 'C', '4/4', 104,
     'C4:q C4:q D4:q E4:q | C4:q E4:q D4:q G3:q | C4:q C4:q D4:q E4:q | C4:h B3:h | C4:q C4:q D4:q E4:q | F4:q E4:q D4:q C4:q | B3:q G3:q A3:q B3:q | C4:h C4:h',
     'C | C G | C | C G | C | F G | G | C', M2, ('root', 'block'),
     story='A marching song from the American War of Independence, first sung to make fun of the colonists, who then took it as their own.',
     tips='The tune dips below middle C to B, A and G: keep the thumb on C and reach down with the hand, not the arm.')

song('aura-lee', 'Aura Lee', 'Song by George Poulton, 1861', 'C', '4/4', 76,
     'G4:q C5:q B4:q C5:q | D5:q A4:q D5:h | C5:q B4:q A4:q B4:q | C5:w | G4:q C5:q B4:q C5:q | D5:q A4:q D5:h | C5:q B4:q A4:q B4:q | C5:w',
     'C | D7 | G7 | C | C | D7 | G7 | C', M2, ('root', 'block'),
     story='A Civil War love song from 1861. Almost a hundred years later its tune came back as a famous ballad.',
     tips='The left hand meets a new chord: D7, with an F♯. Find it before you start.')

song('drunken-sailor', 'What Shall We Do with the Drunken Sailor?', 'Sea shanty, England', 'C', '4/4', 112,
     'A4:h A4:h | A4:q D4:q F4:q A4:q | G4:h G4:h | G4:q C4:q E4:q G4:q | A4:h A4:h | A4:q B4:q C5:q D5:q | C5:q A4:q G4:q E4:q | D4:h D4:h',
     'Dm | Dm | C | C | Dm | Dm | C Am | Dm', M2, ('root', 'block'),
     story='Sailors sang shanties to pull ropes together. This one is in the *Dorian mode*: a minor sound with a bright B natural.',
     tips='Strong beats: pull on beats 1 and 3, like hauling a rope.')

song('oh-susanna', 'Oh! Susanna', 'Stephen Foster, 1848', 'C', '4/4', 96,
     'C4:e D4:e | E4:q G4:q G4:q. A4:e | G4:q E4:q C4:q. D4:e | E4:q E4:q D4:q C4:q | D4:h. C4:e D4:e | E4:q G4:q G4:q. A4:e | G4:q E4:q C4:q. D4:e | E4:q E4:q D4:q D4:q | C4:h. r:q | F4:h F4:h | A4:q A4:h A4:q | G4:q G4:q E4:q C4:q | D4:h. C4:e D4:e | E4:q G4:q G4:q. A4:e | G4:q E4:q C4:q. D4:e | E4:q E4:q D4:q D4:q | C4:h.',
     '- | C | C | C | G | C | C | C G | C | F | F | C | G | C | C | C G | C', M3, ('root', 'oompah'), pickup='e e',
     story='Stephen Foster wrote it in 1848 and it travelled west with the gold rush. The upbeat "Oh I" comes before bar 1.',
     tips='Dotted quarter and eighth: "long, short". Count "1 2 3 and 4" in the first bar.')

song('happy-birthday', 'Happy Birthday', 'Mildred and Patty Hill, 1893; public domain', 'C', '3/4', 100,
     'G3:e G3:e | A3:q G3:q C4:q | B3:h G3:e G3:e | A3:q G3:q D4:q | C4:h G3:e G3:e | G4:q E4:q C4:q | B3:q A3:q F4:e F4:e | E4:q C4:q D4:q | C4:h',
     '- | C | G | G | C | C | F | C G | C', M3, ('root', 'waltz'), pickup='e e',
     story='The tune began as a classroom greeting song, "Good Morning to All", in 1893. It is now free for everyone to play.',
     tips='Starts on an upbeat. The big leap in bar 5 goes up an octave: G below middle C to the G above it.')

song('ode-to-joy-song', 'Ode to Joy', 'Ludwig van Beethoven, Symphony No. 9, 1824', 'C', '4/4', 96,
     'E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | E4:q. D4:e D4:h | E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | D4:q. C4:e C4:h | D4:q D4:q E4:q C4:q | D4:q E4:e F4:e E4:q C4:q | D4:q E4:e F4:e E4:q D4:q | C4:q D4:q G3:h | E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | D4:q. C4:e C4:h',
     'C | G | C | G | C | G | C | G C | G C | G C | G C | C G | C | G | C | G C', M2, ('root', 'block'),
     story='The big tune from the last movement of Beethoven\'s Ninth Symphony, now the anthem of Europe. Almost all of it is in steps.',
     tips='The middle section has eighths ("E F E") and a dip to G below middle C: let the thumb reach down.')

song('jingle-bells-song', 'Jingle Bells', 'James Lord Pierpont, 1857', 'C', '4/4', 112,
     'E4:q E4:q E4:h | E4:q E4:q E4:h | E4:q G4:q C4:q. D4:e | E4:w | F4:q F4:q F4:q. F4:e | F4:q E4:q E4:q E4:e E4:e | E4:q D4:q D4:q E4:q | D4:h G4:h | E4:q E4:q E4:h | E4:q E4:q E4:h | E4:q G4:q C4:q. D4:e | E4:w | F4:q F4:q F4:q. F4:e | F4:q E4:q E4:q E4:e E4:e | G4:q G4:q F4:q D4:q | C4:w',
     'C | C | C | C | F | C | G | G | C | C | C | C | F | C | G | C', M2, ('root', 'block'),
     story='Written for a Thanksgiving concert in 1857, it became the best-known winter song in the world.',
     tips='Three E\'s, three E\'s: count them. The last line climbs to G before coming home.')

# ---------------------------------------------------------------- after Milestone 3: eighths, 3/4, dotted notes

song('auld-lang-syne', 'Auld Lang Syne', 'Scottish song, words by Robert Burns, 1788', 'F', '4/4', 80,
     'C4:q | F4:q. F4:e F4:q A4:q | G4:q. F4:e G4:q A4:q | F4:q. F4:e A4:q C5:q | D5:h. D5:q | C5:q. A4:e A4:q F4:q | G4:q. F4:e G4:q A4:q | F4:q. D4:e D4:q C4:q | F4:h.',
     '- | F | C | F | Bb | F | C | Bb C | F', M3, ('root', 'block'), pickup='q',
     story='Sung at midnight on New Year\'s Eve around the world. Robert Burns wrote down the words in 1788 from an old song.',
     tips='Key of F: every B is B♭ (the left hand meets it in the B♭ chord).')

song('silent-night', 'Silent Night', 'Franz Gruber, 1818', 'C', '3/4', 72,
     'G4:q. A4:e G4:q | E4:h. | G4:q. A4:e G4:q | E4:h. | D5:h D5:q | B4:h. | C5:h C5:q | G4:h. | A4:h A4:q | C5:q. B4:e A4:q | G4:q. A4:e G4:q | E4:h. | A4:h A4:q | C5:q. B4:e A4:q | G4:q. A4:e G4:q | E4:h. | D5:h D5:q | F5:q. D5:e B4:q | C5:h. | E5:h. | C5:q G4:q E4:q | G4:q. F4:e D4:q | C4:h.',
     'C | C | C | C | G | G | C | C | F | F | C | C | F | F | C | C | G | G | C | C | C | G | C', M3, ('root', 'waltz'),
     story='First sung on Christmas Eve 1818 in a village church in Austria, with a guitar because the organ was broken.',
     tips='A gentle rocking 3/4. The dotted quarter takes a beat and a half: "1 – and 2".')

song('we-wish', 'We Wish You a Merry Christmas', 'Folk carol, England', 'C', '3/4', 120,
     'G4:q | C5:q C5:e D5:e C5:e B4:e | A4:q A4:q A4:q | D5:q D5:e E5:e D5:e C5:e | B4:q G4:q G4:q | E5:q E5:e F5:e E5:e D5:e | C5:q A4:q G4:e G4:e | A4:q D5:q B4:q | C5:h',
     '- | C | F | D7 | G | E7 | Am | F G | C', M3, ('root', 'waltz'), pickup='q',
     story='An old West Country carol, sung by carollers asking for figgy pudding.',
     tips='Fast and bouncy. Eighth notes come in pairs: "1 and 2 and 3".')

song('hark-the-herald', 'Hark! The Herald Angels Sing', 'Felix Mendelssohn, 1840', 'C', '4/4', 96,
     'G4:q C5:q C5:q. B4:e | C5:q E5:q E5:q D5:q | G5:q G5:q G5:q. F5:e | E5:q D5:q E5:h | G4:q C5:q C5:q. B4:e | C5:q E5:q E5:q D5:q | G5:q D5:q D5:q. B4:e | B4:q A4:q G4:h',
     'C | C G | C | G C | C | C G | G | D G', M3, ('root', 'block'),
     story='Mendelssohn wrote the music for a festival in 1840; it was later fitted to Charles Wesley\'s words.',
     tips='The last line moves to G major: the left hand plays a D chord with F♯.')

song('joy-to-the-world', 'Joy to the World', 'Arranged by Lowell Mason, 1839', 'C', '4/4', 88,
     'C5:h B4:q. A4:e | G4:h. F4:q | E4:h D4:h | C4:h. G4:q | A4:h. A4:q | B4:h. B4:q | C5:h. C5:q | C5:q B4:q A4:q G4:q | G4:q. F4:e E4:q C5:q | C5:q B4:q A4:q G4:q | G4:q. F4:e E4:q E4:q | E4:q E4:q E4:q E4:e F4:e | G4:h. F4:e E4:e | D4:q D4:q D4:q D4:e E4:e | F4:h. E4:e D4:e | C4:q C5:h A4:q | G4:q. F4:e E4:q F4:q | E4:h D4:h | C4:w',
     'C | G | C G | C | F | G | C | C | C | C | C | C | C | G | G | C F | C | C G | C', M3, ('root', 'block'),
     story='The opening is a C major scale coming down, one note at a time: you know this one from your scale practice.',
     tips='Bar 1 to 4: the descending scale. Keep it even, like walking down stairs.')

song('deck-the-halls', 'Deck the Halls', 'Welsh carol "Nos Galan"', 'C', '4/4', 104,
     'G4:q. F4:e E4:q D4:q | C4:q D4:q E4:q C4:q | D4:e E4:e F4:e D4:e E4:q. D4:e | C4:q B3:q C4:h | G4:q. F4:e E4:q D4:q | C4:q D4:q E4:q C4:q | D4:e E4:e F4:e D4:e E4:q. D4:e | C4:q B3:q C4:h | D4:q. E4:e F4:q D4:q | E4:q. F4:e G4:q D4:q | E4:e F#4:e G4:q A4:e B4:e C5:q | B4:q A4:q G4:h | G4:q. F4:e E4:q D4:q | C4:q D4:q E4:q C4:q | A4:e A4:e A4:e A4:e G4:q. F4:e | E4:q D4:q C4:h',
     'C | C | G7 C | G C | C | C | G7 C | G C | G | C G | Am D | G | C | C | F | G C', M3, ('root', 'block'),
     story='A Welsh New Year tune from the 1500s; the "fa la la" words came in 1862.',
     tips='"Fa la la la la" is eighth notes: count "1 and 2 and".')

song('brahms-lullaby', 'Lullaby', 'Johannes Brahms, 1868', 'C', '3/4', 76,
     'E4:e E4:e | G4:h E4:e E4:e | G4:h E4:e G4:e | C5:q B4:q. A4:e | A4:q G4:q D4:e E4:e | F4:q D4:q D4:e E4:e | F4:h D4:e F4:e | B4:q A4:q G4:q | B4:q C5:q C4:e C4:e | C5:h A4:e F4:e | G4:h E4:e C4:e | F4:q G4:q A4:q | G4:h C4:e C4:e | C5:h A4:e F4:e | G4:h E4:e C4:e | F4:q E4:q D4:q | C4:h',
     '- | C | C | C | G | G | G | G | C | F | C | F | C | F | C | G | C', M3, ('root', 'waltz'), pickup='e e',
     story='Brahms wrote this cradle song in 1868 for a friend\'s new baby. It is one of the most sung melodies ever.',
     tips='Rock gently: the left hand plays on beat 1, the chord on beats 2 and 3.')

song('clementine', 'Oh My Darling, Clementine', 'Folk ballad, America, 1880s', 'C', '3/4', 104,
     'C4:e C4:e | C4:q G3:q E4:e E4:e | E4:q C4:q C4:e E4:e | G4:q. F4:e E4:e D4:e | D4:h D4:e E4:e | F4:q F4:q E4:e D4:e | E4:q C4:q C4:e E4:e | D4:q. G3:e B3:e D4:e | C4:h',
     '- | C | C | C | G | G | C | G | C', M3, ('root', 'waltz'), pickup='e e',
     story='A gold-rush ballad, sad words to a cheerful waltz.',
     tips='Three beats in a bar. The left hand plays "oom-pah-pah".')

# ---------------------------------------------------------------- after Milestone 4: minor keys, wider range

song('greensleeves', 'Greensleeves', 'English ballad, 1500s', 'Am', '3/4', 84,
     'A4:q | C5:h D5:q | E5:q. F5:e E5:q | D5:h B4:q | G4:q. A4:e B4:q | C5:h A4:q | A4:q. G#4:e A4:q | B4:h G#4:q | E4:h A4:q | C5:h D5:q | E5:q. F5:e E5:q | D5:h B4:q | G4:q. A4:e B4:q | C5:q. B4:e A4:q | G#4:q. F#4:e G#4:q | A4:h. | G5:h. | G5:q. F#5:e E5:q | D5:h B4:q | G4:q. A4:e B4:q | C5:h A4:q | A4:q. G#4:e A4:q | B4:h G#4:q | E4:h. | G5:h. | G5:q. F#5:e E5:q | D5:h B4:q | G4:q. A4:e B4:q | C5:q. B4:e A4:q | G#4:q. F#4:e G#4:q | A4:h',
     '- | Am | C | G | Em | Am | E | E | E | Am | C | G | Em | Am | E | Am | C | G | G | Em | Am | E | E | E | C | G | G | Em | Am | E | Am', M4, ('root', 'waltz'), pickup='q',
     story='A tune from Tudor England, in A minor. The G♯ and F♯ come from the melodic minor scale you learned.',
     tips='Watch for G♯ (leading note) going up to A, and F♯ in the bar before the end.')

song('sailors-song', 'Sailor\'s Song in D Minor', 'Our own tune, in the style of a sea shanty', 'Dm', '4/4', 96,
     'D4:q F4:q A4:q A4:q | G4:q F4:q E4:h | C4:q E4:q G4:q G4:q | F4:q E4:q D4:h | A4:q A4:q A4:q F4:q | G4:q G4:q G4:q E4:q | F4:q E4:q D4:q C#4:q | D4:w',
     'Dm | Dm A | C | Dm | Dm | C | Dm A | Dm', M4, ('root', 'block'),
     story='A tune of our own in the style of a sea shanty, the songs sailors sang to pull ropes together.',
     tips='D minor: one flat (B♭), and the C♯ in bar 7 is the leading note pulling home to D.')

song('row-your-boat', 'Row, Row, Row Your Boat', 'Round, England and America, 1852', 'C', '6/8', 60,
     'C4:q. C4:q. | C4:q D4:e E4:q. | E4:q D4:e E4:q F4:e | G4:h. | C5:e C5:e C5:e G4:e G4:e G4:e | E4:e E4:e E4:e C4:e C4:e C4:e | G4:q F4:e E4:q D4:e | C4:h.',
     'C | C | C G | C | C | C | G | C', M6, ('root', 'broken'),
     story='A round: a second player can start from the beginning when the first reaches bar 3. In 6/8 there are two beats a bar, each a dotted quarter.',
     tips='Feel two big beats a bar: "ROW, row | ROW your boat".')

# ---------------------------------------------------------------- after Milestone 5 and 6: fuller arrangements

song('twinkle-alberti', 'Twinkle with an Alberti bass', 'Arranged in the style of Mozart', 'C', '4/4', 84,
     'C5:q C5:q G5:q G5:q | A5:q A5:q G5:h | F5:q F5:q E5:q E5:q | D5:q D5:q C5:h | G5:q G5:q F5:q F5:q | E5:q E5:q D5:h | G5:q G5:q F5:q F5:q | E5:q E5:q D5:h | C5:q C5:q G5:q G5:q | A5:q A5:q G5:h | F5:q F5:q E5:q E5:q | D5:q D5:q C5:h',
     'C | F C | F C | G C | C F | C G | C F | C G | C | F C | F C | G C', M5, ('block', 'alberti'),
     story='Mozart played this tune with a left hand like this: low, high, middle, high. It is called an Alberti bass, after Domenico Alberti.',
     tips='Keep the Alberti bass quiet and even; the melody sings on top, an octave higher than before.')

song('aura-lee-pedal', 'Aura Lee, with pedal', 'George Poulton, 1861, arranged', 'C', '4/4', 66,
     'G4:q C5:q B4:q C5:q | D5:q A4:q D5:h | C5:q B4:q A4:q B4:q | C5:w | G4:q C5:q B4:q C5:q | D5:q A4:q D5:h | C5:q B4:q A4:q B4:q | C5:w',
     'C | D7 | G7 | C | C | D7 | G7 | C', M6, ('broken', 'arp'), pedal=True,
     story='The same song as before, now with a flowing left hand and the sustain pedal changing with every chord.',
     tips='Pedal down just after each new bass note; lift as the next chord sounds.')

# ---------------------------------------------------------------- after Milestones 7 and 8: pedalled arrangements

song('greensleeves-pedal', 'Greensleeves, with pedal', 'English ballad, 1500s, arranged', 'Am', '3/4', 76,
     'A4:q | C5:h D5:q | E5:q. F5:e E5:q | D5:h B4:q | G4:q. A4:e B4:q | C5:h A4:q | A4:q. G#4:e A4:q | B4:h G#4:q | E4:h A4:q | C5:h D5:q | E5:q. F5:e E5:q | D5:h B4:q | G4:q. A4:e B4:q | C5:q. B4:e A4:q | G#4:q. F#4:e G#4:q | A4:h. | A4:h',
     '- | Am | C | G | Em | Am | E | E | E | Am | C | G | Em | Am | E | Am | Am', M7, ('broken', 'arp'), pickup='q', pedal=True,
     story='The Tudor tune again, now with a flowing left hand and the pedal changing on every chord.',
     tips='Pedal just after each new bass note. Keep the left hand softer than the tune.')

song('silent-night-arp', 'Silent Night, flowing', 'Franz Gruber, 1818, arranged', 'C', '3/4', 66,
     'G4:q. A4:e G4:q | E4:h. | G4:q. A4:e G4:q | E4:h. | D5:h D5:q | B4:h. | C5:h C5:q | G4:h. | A4:h A4:q | C5:q. B4:e A4:q | G4:q. A4:e G4:q | E4:h. | A4:h A4:q | C5:q. B4:e A4:q | G4:q. A4:e G4:q | E4:h. | D5:h D5:q | F5:q. D5:e B4:q | C5:h. | E5:h. | C5:q G4:q E4:q | G4:q. F4:e D4:q | C4:h.',
     'C | C | C | C | G | G | C | C | F | F | C | C | F | F | C | C | G | G | C | C | C | G | C', M8, ('waltz', 'arp'), pedal=True,
     story='The carol with rolling left-hand arpeggios and pedal, like a harp.',
     tips='Root, fifth, octave in the left hand; the pedal joins them into one sound.')

def write_songs():
    out = []
    for s in SONGS:
        sid = f"song-{s['id']}"
        key, meter, tempo, pk = s['key'], s['meter'], s['tempo'], s['pickup']
        mel = s['melody']
        n = len(mel.split('|'))
        pkv = sum(dur_value(x) for x in pk.split()) if pk else 0
        styles = s['styles']
        lh1 = accompany(s['chords'], meter, styles[0], pickup=pkv)
        lh2 = accompany(s['chords'], meter, styles[1], pickup=pkv) if len(styles) > 1 else None
        pedal = pedal_for(s['chords'], meter, pkv) if s['pedal'] else None
        ids = []
        lo = min(midi(p) for p in pitches_in(mel))
        rr, rl = rhythm_of(mel), rhythm_of(lh1)
        tapkw = dict(meter=meter, tempo=tempo, reps=2, days=1, ladder=False, **({'pickup': pk} if pk else {}))
        if rr:
            ids.append(tap(f'{sid}-tap', f"{s['title']}: tap the rhythm", rr, prompt='First the rhythm alone, on any key: tap the tune while you hum it.', display='staff', **tapkw))
        if rr and rl and rhythm_of(lh1).count('x') > 0:
            ids.append(tap2(f'{sid}-tap-hands', f"{s['title']}: tap both hands", rr, rl, prompt='Both rhythms at once on any keys: right hand from middle C up, left hand below.', display='staff', **tapkw))
        if mel.count(':') >= 6:
            ids.append(ear(f'{sid}-by-ear', f"{s['title']}: by ear", [{'type': 'melody', 'notes': ' '.join(first_notes(mel, 6)), 'plays': 3, 'lit': True}, {'type': 'melody', 'notes': ' '.join(first_notes(mel, 4)), 'plays': 3}], questions=4, reps=2, days=1,
                           prompt='Play the start of the tune back from hearing it. Lit keys help the first time.'))
        common = dict(meter=meter, key=key if key != 'C' else None, display='staff', pickup=pk)
        ids.append(timed(f'{sid}-rh', f"{s['title']}: the tune", right=mel, tempo=tempo, prompt='The tune alone, right hand. Sing it in your head as you play.', reps=2, days=1, **common))
        ids.append(timed(f'{sid}-lh', f"{s['title']}: left hand", left=lh1, tempo=tempo, prompt='The left hand alone: find each chord change before it comes.', reps=2, days=1, **common))
        ids.append(timed(f'{sid}', f"{s['title']}", right=mel, left=lh1, tempo=tempo, prompt='Both hands. Start slow; the tempo ladder brings you up to speed.', reps=3, days=2, **common))
        if lh2:
            ids.append(timed(f'{sid}-arranged', f"{s['title']}, full arrangement", right=mel, left=lh2, tempo=tempo,
                             prompt=f"A fuller left hand ({STYLE_WORDS[styles[1]]}).", reps=3, days=2, pedal=pedal, **common))
        # The tune in the left hand under right-hand chords, when it fits the left hand.
        low = shift_octave(mel, -1)
        if all(midi('E2') <= midi(p) <= midi('C5') for p in pitches_in(low)) and not s['pedal']:
            ids.append(timed(f'{sid}-swap', f"{s['title']}: swap hands", right=shift_octave(accompany(s['chords'], meter, 'block', pickup=pkv), 1), left=low, tempo=tempo,
                             prompt='The tune in the left hand, an octave lower; the right hand plays the chords.', reps=2, days=1, **common))
        if key in MOVE and not s['pedal']:
            k2, st, se = MOVE[key]
            ch2 = ' | '.join(' '.join(x if x in ('-', 'r') else transpose(parse_chord(x)[0] + '4', st, se)[:-1] + parse_chord(x)[1] for x in b.split()) for b in s['chords'].split('|'))
            mel2 = transpose_string(mel, st, se)
            if all(midi('C3') <= midi(p) <= midi('A5') for p in pitches_in(mel2)):
                ids.append(timed(f'{sid}-in-{k2.lower()}', f"{s['title']} in {key_words(k2)}", right=mel2, left=accompany(ch2, meter, styles[0], pickup=pkv), tempo=tempo,
                                 prompt=f'The same song moved to {key_words(k2)}: think in degrees, and mind the key signature.', reps=2, days=1, **{**common, 'key': k2}))
        third = {'3/4': 'waltz', '6/8': 'arp', '4/4': 'oompah'}.get(meter)
        if third and third not in styles and meter != '6/8':
            ids.append(timed(f'{sid}-{third}', f"{s['title']}, with {STYLE_WORDS[third]}", right=mel, left=accompany(s['chords'], meter, third, pickup=pkv), tempo=tempo,
                             prompt=f"Another left hand: {STYLE_WORDS[third]}.", reps=2, days=1, **common))
        ids.append(timed(f'{sid}-performance', f"{s['title']}: performance", right=mel, left=lh2 or lh1, tempo=tempo, ladder=False, pedal=pedal if lh2 else None,
                         prompt='Full tempo, start to end, as if someone is listening.', reps=2, days=2, **common))
        if key in MOVE2 and not s['pedal']:
            k2, st, se = MOVE2[key]
            ch2 = ' | '.join(' '.join(x if x in ('-', 'r') else transpose(parse_chord(x)[0] + '4', st, se)[:-1] + parse_chord(x)[1] for x in b.split()) for b in s['chords'].split('|'))
            mel2 = transpose_string(mel, st, se)
            if all(midi('C3') <= midi(p) <= midi('A5') for p in pitches_in(mel2)):
                ids.append(timed(f'{sid}-in-{k2.lower()}', f"{s['title']} in {key_words(k2)}", right=mel2, left=accompany(ch2, meter, styles[-1], pickup=pkv), tempo=tempo,
                                 prompt=f'Now in {key_words(k2)}, with a fuller left hand.', reps=2, days=1, **{**common, 'key': k2}))
        first_bars = ' | '.join(mel.split('|')[:2]).strip()
        steps = [S(f"**{s['title']}** · {s['about']}\n\n{s['story']}", staff=staff(first_bars, key=key if key != 'C' else None), sound=' | '.join(mel.split('|')[:4]).strip()),
                 S(f"**Before you play.** {s['tips']}\n\nThe steps: the tune, the left hand, then both together." + (" Last, a fuller arrangement." if lh2 else ''),
                   callout=f"Key: {key_words(key)} · Time: {meter} · Tempo: {tempo}")]
        for i in ids: steps.append(X(i))
        lesson(sid, s['title'], steps, f"{s['title']}: tune, left hand, together. Come back to it any time; songs are for fun.", skills=['songs'])
        node(sid, 'songs', STAGE_AFTER[s['shelf']], s['title'], [s['shelf']], about=s['about'])
        out.append(sid)
    return out

MOVE = {'C': ('G', 4, 7), 'G': ('C', -4, -7), 'F': ('C', -3, -5), 'Am': ('Dm', 3, 5), 'Dm': ('Am', -3, -5)}

MOVE2 = {'C': ('F', 3, 5), 'G': ('F', -1, -2), 'F': ('Bb', 3, 5)}

STYLE_WORDS = {'root': 'one bass note', 'fifth': 'root and fifth', 'block': 'held chords', 'pulse': 'a chord on every beat',
               'oompah': 'bass, then chord', 'waltz': 'bass, chord, chord', 'broken': 'broken chords', 'arp': 'rolling arpeggios', 'alberti': 'an Alberti bass'}

def key_words(k):
    m = 'minor' if k.endswith('m') else 'major'
    t = k[:-1] if k.endswith('m') else k
    return f"{t.replace('b', '♭').replace('#', '♯')} {m}"

def pedal_for(chords, meter, pickup=0.0):
    """A pedal line that changes with every chord (up for rests)."""
    q = meter_quarters(meter)
    out = []
    allbars = chords.split('|')
    for i, syms in enumerate(b.split() for b in allbars):
        length = pickup if (i == 0 and pickup) else (q - pickup if (pickup and i == len(allbars) - 1) else q)
        if syms in (['-'], ['r']):
            out.append(' '.join(f'r:{v}' for v in fill(length))); continue
        each = length / len(syms)
        out.append(' '.join(' '.join(f'x:{v}' if k == 0 else f'x:{v}' for k, v in enumerate(fill(each))) for _ in syms))
    return ' | '.join(out)
