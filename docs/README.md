# Documents

Start with **[vision.md](vision.md)** (what iggyuoso is and where it is going), then
**[roadmaps.md](roadmaps.md)** (three proposed directions for what comes next, for Ignas to pick) and the repository's
`CLAUDE.md` (the brief and every decision so far).

## How the app works (developer docs)

Written so the owner can follow them without being a programmer: each page starts with the idea in
plain words, then names the files.

1. [The big picture](dev/architecture.md): shell, core and modules; how a page gets on screen; a
   take from key press to saved progress.
2. [Content](dev/content.md): lessons, exercises, the mastery tree, the Book, and the Python
   content generator.
3. [Input and timing](dev/input-and-timing.md): MIDI, the computer keyboard, calibration, latency,
   and the timing loop shared by the sheet and the falling notes.
4. [Scoring](dev/scoring.md): how every kind of exercise is scored, with the numbers.
5. [Drawing](dev/rendering.md): sheet music, falling notes, keyboard, hands, chord names, lesson
   panels and the other screens.
6. [Progress](dev/progress.md): what is saved, mastery states, Today's practice, sync.
7. [Building and testing](dev/build-and-test.md): commands, tests, CI and deploying to GitHub Pages.
8. [Being found](dev/seo.md): search engines and link previews (title, share card, structured
   data, sitemap) and the one line to change for a custom domain.
9. [How to](dev/how-to.md): add a lesson, a song, a Book chapter, an exercise kind, an option, a
   module or a demo scene.

## Reference

- [content/README.md](../content/README.md): the content format, field by field.
- [modules.md](modules.md): modules, their addresses and records, and how to add one.
- [accounts.md](accounts.md): guest and account, sync, and setting up Supabase
  ([supabase.sql](supabase.sql)).
- [design.md](design.md): the design system (tokens, themes, rules).
- [mastery-curriculum.md](mastery-curriculum.md): the curriculum design; research in
  [research/](research/).
- [beta-curriculum-proposal.md](beta-curriculum-proposal.md): the first proposal (historical).
- [previews.md](previews.md): a test copy of the site for every pull request labelled `preview`,
  and how the hourly ideas run works; [ideas.md](ideas.md): the ideas log (go / no-go).
