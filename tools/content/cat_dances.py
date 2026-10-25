# Dances and fiddle tunes: traditional, in our own arrangements. Short form: see catalogue.M.
from catalogue import tune

G = 'dances'

_ww = 'B4:e G G D G G | B G B D5 C B4 | C5 A4 A E A A | C5 A4 C5 E D C | B4 G G D G G | B G B D5 C B4 | C5 B4 C5 A4 D5 C'
tune('irish-washerwoman', 'The Irish Washerwoman', 'Irish jig, 1700s', 'G', '6/8', 56,
     f'D5:e C | {_ww} | B4:e G G G D5 C | {_ww} | B4:e G G G',
     '- | G | G | Am | D | G | G | C D | G | G | G | Am | D | G | G | C D | G', 7, G, pickup='e e',
     story='A jig: a quick dance in 6/8, played on the fiddle and the tin whistle in Irish sessions for two hundred years.',
     tips='Six eighths a bar in two groups of three, "di-dle-di di-dle-di". Light and even; the beat is on the first of each three.')

_st = 'G4:e E4 E4 B4 E4 E4 | G4 E4 E4 B4 A4 G4 | F#4 D4 D4 A4 D4 D4 | D5 C#5 D5 A4 G4 F#4 | G4 E4 E4 B4 E4 E4 | G4 E4 E4 B4:q C5:e | D5:e C#5 D5 A4 G4 F#4'
tune('swallowtail-jig', 'Swallowtail Jig', 'Irish jig, 1800s', 'Em', '6/8', 52,
     f'{_st} | G4:e E4 E4 E4:q. | {_st} | G4:e E4 E4 E4:q.',
     'Em | Em | D | D | Em | Em | D | Em | Em | Em | D | D | Em | Em | D | Em', 7, G,
     story='A jig in E minor with the wild sound of the old Irish modes: the C♯ in bar 4 is from the Dorian mode.',
     tips='E minor with F♯; C♯ in bars 4 and 7. Keep the three-note groups bouncing.')
