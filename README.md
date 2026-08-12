# ACHIEVE — Write The Vision

A gamified vision board that runs on **Be → Do → Have**, with scripture (KJV) as the
mainframe and peer-reviewed behavioural neuroscience as the mechanics.

> And the LORD answered me, and said, Write the vision, and make it plain upon tables,
> that he may run that readeth it.
> — **Habakkuk 2:2**

It is one self-contained HTML file. No account, no server, no build toolchain required
to run it. Your data lives on your device; your private *Why* never leaves it at all.

---

## The one idea

The world runs **HAVE → DO → BE**: *when I have the money, I'll do the things, then I'll
be free.* It never arrives, because the having is the gate and the gate never opens.

Scripture runs it backwards, and so does the evidence:

| | | |
|---|---|---|
| **BE** | Identity is assigned *before* the behaviour matches it. | Abram was renamed "father of many nations" while childless (Gen 17:5). Gideon was called "thou mighty man of valour" *while hiding in a winepress* (Judg 6:12). Paul describes the God Abraham believed as one who names what is not yet visible (Rom 4:17). |
| **DO** | Each action is a vote. The tally becomes the self. | Bem (1972): people infer who they are by observing their own behaviour. The game never says "task complete" — it says *"the evidence now says you are a person who trains, 71% of the time."* |
| **HAVE** | The result is added, never chased. | Pham & Taylor (1999): students who simulated the **outcome** did *worse than controls*; those who simulated the **process** did better. So the daily screen shows the next rep, and the board is kept as a memorial. Christ tells the crowd not to be anxious, and puts seeking God's kingdom before the things that get added (Matt 6:33). |

---

## What is actually in it

**The vision board.** Upload a photo of your real board and tap each thing on it to set a
**Stone**, after the twelve memorial stones taken out of the Jordan (Josh 4:6). Or describe them one
at a time. The image never leaves your device and is stripped from anything your circle
can see.

**The WOOP gate.** A Stone stays **veiled and unplayable** until you have counted its cost:
the outcome, the honest *inner* obstacle, and an if-then plan. This is the hardest gate in
the game and it is deliberate — Oettingen (2012) found positive fantasy **alone** predicts
*lower* attainment. An uncontrasted vision board is a measured de-motivator. Christ gave
the instruction first: sit down *first* and count the cost (Luke 14:28). The gate rejects
external obstacles ("my boss", "no time") because WOOP only works on the inner one.

**If-then steps.** The composer refuses a bare verb. Every step must be *"When [cue],
I will [action] at [place]"* — Gollwitzer & Sheeran (2006), 94 studies, d = 0.65.

**The private Why.** Sealed per identity, stored under a **separate storage key**, excluded
from every sync and export by default. Before a hard step the game puts it full-screen and
holds the button for a moment before it arms — values affirmation buffers the stress
response and improves performance (Cohen & Sherman 2014). Christ contrasts prayer offered
privately to the Father with prayer performed for an audience (Matt 6:6).

**Two maps.**
- *Promised Land* — four territories under fog of war, revealed as you take ground:
  **Business, Health, Family, Spiritual Growth**. Each carries a verse, printed in full
  (Proverbs 22:29 · 1 Corinthians 6:19 · Joshua 24:15 · 2 Peter 3:18).
- *Real ground* — **Ping me here** drops a marker at your actual coordinates, named after
  the stone Samuel set at Mizpeh (1 Samuel 7:12). This is not decoration — Godden &
  Baddeley (1975) showed physical context becomes part of the memory trace, so the same act
  in the same place builds automaticity faster.

**Linear and exponential at the same time.** Two lines on one chart:

```
STEPS     L(t) = Σ steps                     one act, one step, counted plainly
INCREASE  I(t) = I(t-1) × (1 + gₜ) + stepsₜ   compounding, exactly like interest
```

When the earned rate `g` is zero, **the two lines lie exactly on top of each other** — an
inconsistent player sees one line, and the chart refuses to pretend otherwise. `g` is earned
from consistency (Lally 2010), identity alignment (Bem 1972), and the Covenant Circle
(Christakis & Fowler 2007) — the only term that can grow without you spending more hours.
The gap between the lines is the **Yield**, reported in the parable's own units:
**thirtyfold, sixtyfold, hundredfold** (Mark 4:8).

**Grace instead of streak-loss.** Miss a day and a grace token covers it; the streak stands,
momentum takes the hit. Streaks *never* zero out. This is not softness — Lally (2010) found
a single missed day did **not** measurably harm the automaticity trajectory, so punishing it
is factually wrong, and all-or-nothing framing triggers the what-the-hell effect. Proverbs 24:16
describes the just man as one who rises again after falling. An unfinished *today* is
never counted as a miss.

**The Sabbath lock.** One day a week the game **refuses to serve you quests**. Psychological
detachment predicts recovery better than rest alone (Sonnentag & Fritz 2007). It is also the
fourth commandment.

**The Upper Room.** Timed focus blocks that do not end at the timer — they end after a
mandatory stillness window. Attention gates plasticity (Recanzone & Merzenich 1993), and
quiet rest right after practice produces the replay that predicts later performance (Foster
& Wilson 2006). Skipping the stillness forfeits part of the credit
(Ps 46:10).

**The Covenant Circle.** Friends by invite code, group chat, and a recap showing where each
person started versus where they are now. Ecclesiastes 4:12 on the strength of company over
isolation.

**The Chronicle.** Nothing completes silently. After every action the game writes a note of
what was accomplished and what it built toward — Amabile & Kramer (2011) found progress in
meaningful work is the strongest driver of inner work life, and *noticing* it is part of the
effect.

**The Codex.** Every mechanic, its study, and the verse it serves — including an explicit
ethics warning on the variable-ratio reward, which is the same mechanism slot machines
exploit. The rule for that file: if you can delete a principle and the game plays
identically, it does not belong there.

---

## Run it

```bash
npm install      # only needed for the test suite
npm run build    # writes dist/index.html
```

Then open `dist/index.html` — from disk, or host it anywhere static. It is one file.

```bash
npm test          # 210 unit tests
npm run test:e2e  # 37 browser tests
npm run test:all  # everything
```

---

## The live circle (optional)

Out of the box everything works, but your circle lives on **this device only** — friends on
other phones cannot join. The app says so rather than implying otherwise.

To turn on a real shared circle:

1. Create a free project at [supabase.com](https://supabase.com).
2. Paste **`supabase/schema.sql`** into the SQL editor and run it.
3. In the app: **Settings → Live circle**, paste your project URL and the **anon
   (publishable)** key. Never paste a service key into any web app.

**Security model, plainly.** There are no accounts. The 16-character circle code *is* the
authorisation — the "secret link" model. The tables are unreadable with the anon key: RLS
denies everything and all access goes through `SECURITY DEFINER` functions that require the
code as an argument, so nobody can drop the filter and read every circle. What this does
**not** protect against: anyone you give the code to can read that circle and post under any
name, and messages are not end-to-end encrypted. Your private Why is never sent at all.

> **Note on the published artifact version:** claude.ai artifacts run under a strict CSP that
> blocks *all* external hosts, so the live circle cannot connect there. That build is
> local-only. Host `dist/index.html` yourself (GitHub Pages, Vercel, Netlify, anywhere) to
> use live sync.

---

## Layout

```
src/
  core/util.js        dates, seeded RNG, escaping
  core/state.js       the model — and the structural privacy rule
  core/identity.js    Be>Do>Have: statement validation, vote ledger, tier ladder
  core/engine.js      WOOP gate, if-then, calibration, XP/manna, grace, Sabbath, focus
  core/growth.js      the two lines
  core/storage.js     persistence + local/Supabase adapters
  core/guide.js       reads your state, decides the ONE next step
  data/scripture.js   KJV bank, bound to game states
  data/neuro.js       the principle registry — each one changes a mechanic
  ui/views.js         render functions
  app.js              controller, canvas maps, the chart
supabase/schema.sql   the live circle backend
build.mjs             flattens it all into one HTML file
```

`npm run build` fails loudly if two modules declare the same top-level name, since
flattening would otherwise shadow one silently.

---

## On the guide

The game never speaks *as* Christ and never puts words in His mouth. It carries the lamp —
it surfaces His actual words and points at the next piece of ground. A lamp at the feet
lights the next step, not the whole road (Ps 119:105), which is why the game shows you **one**
step and not a dashboard of competing priorities.

Science is the servant here, not the master. It describes the machinery the Word already
commanded.

> My sheep hear my voice, and I know them, and they follow me: — **John 10:27**

---

## On the scripture

Three rules govern every verse in this app, and there is a test suite enforcing each one.

**1. Verses appear exactly as they read in the Bible.** Authorized (King James) Version,
verbatim and complete. No verse is trimmed to the clause that suits a mechanic, reworded,
paraphrased, or given a bracketed gloss. `tests/unit/scripture-fidelity.test.js` holds a
reference table transcribed independently of the app and compares character for character —
if anyone ever shortens a verse to make it land better, the build fails.

**2. Verse text lives in exactly one place.** `src/data/scripture.js`. No module quotes a
verse inline, and nothing draws scripture onto a canvas where it cannot carry its reference.
A test scans the source for any six-word run lifted out of a verse and fails on it.

**3. The app's commentary is labelled as the app's commentary.** Every note renders under
"Note from this app", and each one opens by stating what is happening in the passage on its
own terms before saying anything about the game. Where the app borrows a name — Stone,
Manna, Ebenezer — it says plainly that it is borrowing. The verse is not bent to fit the
mechanic; the mechanic is told to stand next to the verse and explain itself.

Corrections applied on review: Romans 4:17 had lost its parentheses; Psalm 46:10, Proverbs
23:7, Zechariah 4:10, Revelation 12:11, Matthew 17:20 and Luke 9:23 had been cut short at
the useful clause; the territory labels were clipped half-verses; and the commentary on
Jeremiah 29:11 and 3 John 1:2 had been bent toward the game rather than left in its own
setting. All are fixed and covered by tests.

## Sources

Bem (1972) · Markus & Nurius (1986) · Hershfield et al. (2011) · Cohen & Sherman (2014) ·
Adam & Galinsky (2012) · Schultz, Dayan & Montague (1997) · Ferster & Skinner (1957) ·
Kivetz, Urminsky & Zheng (2006) · Wilson et al. (2019) · Gollwitzer & Sheeran (2006) ·
Oettingen (2012) · Godden & Baddeley (1975) · Lally et al. (2010) · Cochran & Tesser (1996) ·
Recanzone, Schreiner & Merzenich (1993) · Foster & Wilson (2006) · Walker et al. (2002) ·
Kleitman (1963) · Sonnentag & Fritz (2007) · Amabile & Kramer (2011) · Pham & Taylor (1999) ·
Christakis & Fowler (2007) · Cialdini (2009) · Newell & Rosenbloom (1981) ·
Dai, Milkman & Riis (2014) · Milkman, Minson & Volpp (2014) · Kross et al. (2014)

Scripture quotations are from the Authorized (King James) Version, which is in the public
domain.
