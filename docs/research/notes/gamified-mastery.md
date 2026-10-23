# Gamified mastery systems and learning science for a multi-year piano trainer

## Learning science: deliberate practice, spacing, interleaving, mastery, slow practice, session length

### Takeaway
Practice *quality* (accuracy during practice, targeting the hard spot until it is fixed) predicts next-day piano performance better than practice *quantity*; motor sequences consolidate offline, especially during sleep; interleaving has modest, suggestive evidence in music. A trainer should therefore score accuracy during practice, isolate hard spots, spread each skill over several days, and mix review into sessions instead of drilling one item for a long block.

### Cited Findings
- Duke, Simmons & Cash (2009), *It's Not How Much; It's How* (JRME): 17 advanced piano majors learned a hard 3-bar Shostakovich passage and were tested the next day. Total practice time, number of repetitions and number of complete run-throughs did **not** significantly predict next-day performance. Accuracy during practice did: share of error-free complete run-throughs (reported r = -.71 against the performance rank/score; the sign convention isn't explained in the secondary source), share of correct attempts (r = -.51), number of practice mistakes (r = .48). Small, correlational, single session. — [Structural Learning research briefing](https://www.structural-learning.com/research-briefings/practise-the-hard-bit)
- The same briefing describes the better practisers as pinpointing the exact hard passage and repeating it until the error was fixed. (Its own advice to vary tempo is not a study finding.) — [Structural Learning](https://www.structural-learning.com/research-briefings/practise-the-hard-bit)
- Carter & Grahn (2016, *Frontiers in Psychology*): 10 advanced clarinettists, within-subjects. Blocked = 12 min continuous per piece; interleaved = alternating 3-min segments of two pieces (12 min each in total). Day-2 retention was rated blind by 3 professionals. Interleaved scores were higher on average, but significant only in a few rater-specific comparisons (e.g. concertos p = 0.02 for one rater; technical studies end of day 1 to day 2, p = 0.02 for one rater, p = 0.07 averaged). Inter-rater correlations were 0.02–0.59. 6 of 10 found interleaving more useful, but 6 of 10 *preferred* blocked. The authors note that blocked practice *feels* more fluent, which misleads learners about how much they actually retain ("desirable difficulties"). — [Carter & Grahn 2016](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01251/pdf)
- Debas et al. (2014, *NeuroImage*, Doyon lab): after learning a piano-like finger sequence, subjects who slept performed better than a daytime-only control group. A cortico-striatal network became more integrated after sleep; daytime rest did not produce this effect. No effect-size figure in the news summary. — [Technology Networks summary](https://www.technologynetworks.com/proteomics/news/learning-play-piano-sleep-it-282492); [Debas 2014 PDF](https://www.lib.upmc.fr/~marrelec/Publis/Debas-2014.pdf)
- Spacing in a large production system: Duolingo's half-life regression (HLR) model predicts each item's recall probability from the learner's history and lengthens the item's "half-life" after correct answers and shortens it after mistakes. Its prediction error was about half that of the Leitner system. In A/B tests, HLR scheduling raised practice sessions by 9.5% and overall activity by 12%. Strength meters flag a skill for practice when it decays to half. — [Duolingo blog, "How we learn how you learn"](https://blog.duolingo.com/how-we-learn-how-you-learn); paper: [Settles & Meeder 2016, ACL](https://preview.aclanthology.org/landing_page/P16-1174)
- FSRS (the Anki scheduler) models each card's stability and retrievability. A higher target retention means shorter intervals and more reviews. The "optimal retention" (CMRR) tool picks the retention that minimises workload per unit of knowledge, and workload against retention is a U-shaped curve. — [FSRS4Anki wiki, The optimal retention](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-optimal-retention)

### Inferences
- **Score practice, not just performances.** Because practice accuracy predicts retention, the app should track a "clean-rep ratio" per exercise and reward clean repetitions over raw repetition counts or minutes played. Don't award XP for minutes alone.
- **Tempo ladder with accuracy gates.** Advance tempo only after N clean reps (e.g. 3 consecutive ≥92%) at the current tempo. Drop back one rung after repeated errors. This puts the Duke finding into practice and matches CLAUDE.md's "records only at ≥90% tempo".
- **Hard-spot isolation.** When a passage has errors, offer a loop drill on the 1–2 bars where the errors cluster, then reinsert it into the full passage.
- **Mastery needs a second day.** Because consolidation happens offline and overnight, a skill should not reach "Mastered" in the session where it was first passed. Require a successful retest on a later day (spaced), like Khan's mixed-skill promotion below.
- **Interleave at session level, gently.** Build sessions from 3–5 min segments rotating new material, review items and a pitch/theory drill. Expect learners to prefer blocking. Explain why mixing helps (in the guide's voice) instead of hiding it.
- **Skill-level spaced scheduling.** Use a per-skill decay model (HLR/FSRS-like: stability grows with successful spaced retests, shrinks on failure) to drive a "due for review" queue. Keep it simple at first (Leitner-like boxes are acceptable; HLR beat Leitner, but Leitner is a reasonable v1 for local storage).

### Gaps
- Not verified this session (standard references worth citing in the final report if checked): Ericsson, Krampe & Tesch-Römer (1993) on deliberate practice; Macnamara et al. (2014/2016) meta-analyses finding deliberate practice explains a modest share of music performance variance; Bloom (1968/1984) mastery learning and the "2-sigma" tutoring result; Shea & Morgan (1979) contextual interference; Abushanab & Bishara (2013) on interleaved piano practice; Walker et al. (2002) on sleep-dependent finger-tapping gains (~20%).
- I found no peer-reviewed data on optimal daily session length for adult amateur pianists; 20–40 min is a product constraint, not an evidence-based optimum.
- I did not fetch the Abushanab & Bishara piano interleaving paper (the PMC fetch hit a captcha), so the strongest piano-specific interleaving evidence is not verified here.

## Mastery systems in existing products (Khan, Duolingo, FSRS, Melodics)

### Takeaway
The proven pattern is a **single guided path** with explicit mastery states that **can decay**, promotion to the top state only via **mixed, later re-testing**, and **spaced review woven into the path** rather than left as an optional extra.

### Cited Findings
- Khan Academy mastery states: Not started → Attempted (<70% on an exercise) → Familiar (70–99%) → Proficient (100%) → Mastered. **Mastered is only reachable by answering the skill correctly on a mixed-skill assessment** while Proficient. Missing questions on a mixed assessment demotes a skill one level (Mastered → Proficient → Familiar → Attempted). — [Khan Academy help: How do mastery levels work?](https://support.khanacademy.org/hc/uz/articles/5548760867853)
- Duolingo moved from a free-choice "tree" to a linear "path" (2022) because learners were unsure whether they were using the app the "best" way. The path interleaves levels from different skills, orders lessons to revisit concepts at increasing intervals (spaced repetition), builds practice and stories into the path, groups lessons into units with a guidebook, and has unit-level "Legendary" challenges. No usage metrics were published in that post. — [Duolingo blog, new home screen](https://blog.duolingo.com/new-duolingo-home-screen-design)
- The path change was controversial with some users (UX critique). — [uxdesign.cc, "Down the wrong path"](https://uxdesign.cc/down-the-wrong-path-the-disaster-of-the-latest-duolingo-ui-update-a4cdd1e6ea1c) (not read in full)
- Duolingo streak data: learners with a 7-day streak were 2.4x more likely to return the next day. Learners with high daily goals were *less* likely to keep streaks (the "intense" tier was almost 40% of two-day-active learners without a streak). **Decoupling the streak from the daily goal** (one lesson extends the streak) raised D14 retention 3.3%, learners on a streak 10.5%, new learners on a streak 19%, and 7+ day streaks by over 40% after about a year. Fewer people hit daily goals, but more built habits. The author concluded that "lowering the barriers to building a consistent daily habit is more important" than how much people study each day. — [Duolingo blog, Improving the streak](https://blog.duolingo.com/improving-the-streak)
- Melodics (a rhythm/keys trainer with MIDI input): XP ("Stardom") for every session with no cap; **15 sequential Stages per instrument** that act as assessments (passing ≈ 3 stars on a lesson); **readiness dials** fill as you play warm-ups and same-grade lessons, and turn green when you are ready to attempt the Stage; unlimited retries; Weekly Goals = curated lessons for your current Stage, refreshed Mondays with bonus XP; scoring rewards combo and timing precision (scores can exceed 100); 1/2/3/Platinum stars; Trophies and Records were *retired*. — [Melodics support: guide to progress](https://support.melodics.com/en/articles/13876438-your-guide-to-progress-in-melodics)
- Piano Marvel's SASR (Standard Assessment of Sight-Reading): an adaptive test that serves excerpts "at an ideal level" and gives a score tracked over time. Learners also self-rate excerpts Easy / Manageable / Difficult / Impossible. The scoring algorithm is not public. — [Piano Marvel: get your score](https://pianomarvel.com/en/info/get-your-score)

### Inferences
- **Skill states for iggyuoso** (adapted from Khan): Locked → Introduced → Practised (passed ★, ≥65) → Solid (★★★, ≥92, at ≥90% tempo) → Mastered (passed again on a *later day* inside a mixed review or "checkpoint"). Allow decay: a failed review demotes one level, and time without review lowers a "freshness" meter (Duolingo strength meter / FSRS retrievability).
- **Path plus tree.** Show a guided linear path (the default "next" button, Duolingo's lesson) on top of a visible mastery tree (the map of everything, with prerequisites). The tree is for orientation and optional side branches (e.g. extra pitch training, repertoire). The path prevents choice paralysis.
- **Stage exams with readiness dials** (Melodics pattern) map well to "years" or "grades": e.g. 5 years × 3–4 grade exams. The exam unlocks when the prerequisite skills are Solid, and passing it promotes those skills toward Mastered.
- **Adaptive placement and benchmarking** (SASR pattern): one adaptive sight-reading/ear test that recurs every few weeks gives a single longitudinal "level" number for reading and for ear. This is a good metric of real progress, separate from XP.
- Melodics retiring Trophies/Records suggests that a proliferation of collectible badges wasn't worth keeping. Prefer a few meaningful milestones.

### Gaps
- Duolingo crowns/Legendary detailed retention effects, leagues' measured impact, and XP mechanics were not found in primary sources this session.
- Brilliant's progression model and game skill trees (Path of Exile, RPGs) were not researched in depth. Inference only: game skill trees give meaningful *choice* between branches; in a curriculum the core should stay linear, with choice limited to elective branches.

## Music apps: progression, gamification, assessments, criticisms

### Takeaway
Consumer piano apps are strong at onboarding and song-based motivation but are commonly criticised for weak rhythm judging, optional or shallow theory, thin bass-clef/reading development, vague structure after the beginner tier (plateau), and little diagnostic feedback. These are exactly the gaps a trainer focused on theory plus skill can fill.

### Cited Findings
- Simply Piano review (Pianist's Compass): the basic lessons use treble clef only, with bass clef only in advanced lessons; the app "doesn't really judge rhythm" (early/late notes still go green, and note values all pass the same way); Music Theory 101 is marked "Optional"; structure becomes vague after the Essentials courses ("learn whatever you want"), and many learners are expected to outgrow it; the Soloist and Chords paths can be done separately, leaving gaps; feedback is only correct/incorrect/assisted, with no stats on earlier mistakes and no dashboard of accuracy or time; you can't isolate small sections or adjust the count-in; there is little improvisation. — [Pianist's Compass Simply Piano review](https://pianistscompass.org/reviews/apps/simply-piano/)
- Its strengths in the same review: quick onboarding, Basics/Essentials gate the song library (stops rushing ahead), a listen mode, slower practice tempos (85%/95%), "Wait for me" mode, a Lead Sheet course that teaches melody and chords together, and milestone pieces (e.g. "The Entertainer"). — [Pianist's Compass](https://pianistscompass.org/reviews/apps/simply-piano/)
- Piano Marvel positions graded sight-reading assessment (SASR) as its differentiator and claims (from its own studies) that regular use improves reading. — [Piano Marvel sight-reading](https://pianomarvel.com/sight-reading); [Piano Marvel get your score](https://pianomarvel.com/en/info/get-your-score)
- Melodics shows a precision-scoring model (combo plus timing tightness) and Stage exams (see above). — [Melodics support](https://support.melodics.com/en/articles/13876438-your-guide-to-progress-in-melodics)

### Inferences
- Differentiators for iggyuoso: (1) real rhythm/timing scoring per hand (already in the scoring spec); (2) theory and reading as **required** nodes on the path, not optional extras; (3) both clefs from early on; (4) clear structure through year 5 (graded exams); (5) diagnostic feedback ("left hand late by 40 ms on beat 3"); (6) section looping and tempo ladders; (7) off-app transfer tasks (e.g. play from a printed score, play without the guide track, improvise over a progression) so learners don't depend on the falling-notes display.
- "Wait for me" (step mode) is a useful early scaffold, but an exercise should not count toward Solid/Mastered unless it is played in time.

### Gaps
- Flowkey, Skoove, Playground Sessions, Yousician, Synthesia and Pianote were not reviewed this session. Commonly reported issues (dependence on falling-note displays, e.g. Synthesia) are not cited here.
- No independent outcome studies of piano apps were found.

## Risks of gamification and self-determination theory

### Takeaway
Gamification has small positive average effects on learning (cognitive g ≈ 0.49, robust), but motivational and behavioural effects are less robust. Competitive mechanics (leagues, XP races) and streak obsession produce documented misuse (XP farming, binge lessons, anxiety). Reward *learning*, not activity, and make competitive features optional.

### Cited Findings
- Sailer & Homner (2020) meta-analysis: gamification effects are cognitive g = .49 (k = 19), motivational g = .36 (k = 16), behavioural g = .25 (k = 9). In high-rigor studies only the cognitive effect held (g = .42); the motivational and behavioural effects were not significant. Social interaction mixing competition with collaboration beat competition alone. Game fiction mattered only for behavioural outcomes. Interventions lasting up to half a year beat one-day ones for motivation. — [Sailer & Homner 2020, Educational Psychology Review](https://link.springer.com/article/10.1007/s10648-019-09498-w)
- Mogavi et al. (2022, ACM L@S), a qualitative study of Duolingo (357 forum posts, 30,618 comments, 15 interviews): misuse included leaderboard cheating, XP farming on easy content, streak obsession "at the cost of learning", binge lessons without retention, and expecting game-style fun. Reported harms: lower confidence, reduced interest, churn, league anxiety, self-recrimination, wrist pain. Causes included league demotions that punish motivated users and unfair random grouping. Recommendations: group by comparable level, make gamification optional, accommodate weekend-only schedules, **weight rewards by task difficulty and importance and reward learning rather than engagement**, and explain to users why gaming the system hurts their learning. — [Mogavi et al. 2022, arXiv](https://arxiv.org/pdf/2203.16175)
- Duolingo's own data shows that streaks drive return visits (2.4x next-day return at 7 days), and that a *low* bar (one lesson) works better for habit-building than tying the streak to an ambitious goal. — [Duolingo blog](https://blog.duolingo.com/improving-the-streak)

### Inferences
- **XP only for quality:** award XP for clean reps, for stars gained, for review completed while due, and for new skill-state promotions. Give no XP for replaying already-mastered easy exercises (prevents farming). Wrist pain was a reported harm, so a piano app especially should never reward marathon sessions; cap the daily "bonus" and suggest breaks.
- **Gentle streaks:** a streak counts any day with a minimal session (e.g. one 5-minute review set). Allow rest days or "weekly streaks" (e.g. 5 of 7 days) to avoid streak anxiety. Never punish by resetting all progress.
- **No public leagues** for a single-user, local-storage app. Compete against your own past self (personal bests, a monthly level chart).
- **Self-determination theory mapping (inference):** competence = visible skill states, diagnostic feedback, level benchmarks; autonomy = elective branches, choice of repertoire, optional challenges; relatedness = a guide character's voice, and later shareable recordings. Informational feedback ("your left hand is now steady at 80 bpm") supports competence; controlling feedback ("you'll lose your streak!") undermines autonomy.

### Gaps
- Deci, Koestner & Ryan (1999) meta-analysis on the overjustification effect (expected, tangible rewards undermine intrinsic motivation) and Ryan & Deci's SDT were not fetched this session. They are standard references to cite if verified.
- No research specific to music apps on streak anxiety was found.

## Guide/mentor, onboarding, placement, adaptive "what to practise today"

### Takeaway
Products converge on a single "next step" recommendation backed by a decay-aware review queue (Duolingo strength meters and Practice Hub, Melodics Weekly Goals tied to the current Stage) and adaptive placement or benchmark tests (Piano Marvel SASR).

### Cited Findings
- Duolingo: strength meters at half-full signal that practice is due; a "Practice Weak Skills" button picks the weakest items for you; the path itself injects spaced review; units carry a guidebook. — [Duolingo blog, HLR](https://blog.duolingo.com/how-we-learn-how-you-learn); [Duolingo new home screen](https://blog.duolingo.com/new-duolingo-home-screen-design)
- Duolingo Practice Hub (Super feature) collects mistakes, words and targeted practice. — [Duolingo blog, Practice Hub guide](https://blog.duolingo.com/guide-to-duolingo-practice-hub/) (not read in full)
- Melodics: Weekly Goals = lessons curated to the current Stage; readiness dials show when the next exam is attemptable. — [Melodics support](https://support.melodics.com/en/articles/13876438-your-guide-to-progress-in-melodics)
- Piano Marvel SASR adaptively picks material at the right level and tracks a score over time. — [Piano Marvel](https://pianomarvel.com/en/info/get-your-score)

### Inferences
- **"Today's practice" builder (20–40 min):** warm-up (2–3 min technique) → due reviews from the decay queue (~30%) → the new lesson on the path (~40%) → an ear/pitch drill (~15%) → a "fun" piece or free play (~15%). Present it as a single "Start today's session" button with a visible plan, and let the user swap blocks.
- **Guide character:** introduces each unit (like Duolingo's guidebook), explains *why* mixing and slow practice work (pre-empting the "blocked feels better" bias from Carter & Grahn), and turns score data into diagnoses ("right hand rushes in bar 3"). Keep its tone informational, never guilt-tripping.
- **Placement:** for an absolute beginner, skip placement by default but offer "I already know some": a short adaptive test per strand (reading, rhythm, keyboard geography, ear) that unlocks earlier nodes as Practised (not Mastered), so they still enter review.
- **Strands in the tree:** Playing technique, Reading (treble/bass), Rhythm, Theory (intervals, scales, chords, harmony), Ear/pitch, Repertoire, Creativity (improvise/compose). Each grade exam samples all the strands.

### Gaps
- No primary sources were found on how guide/mascot characters affect learning outcomes in apps (e.g. Duo the owl). Evidence for "pedagogical agents" exists in the academic literature but was not fetched.
- No published data was found on placement-test accuracy in music apps.
