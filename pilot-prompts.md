# Pilot prompts: Pompeii, Part 1

How to use this:
1. Create a new empty folder (e.g. `decisions-shorts`) and put `CLAUDE.md` in it.
2. Open a terminal in that folder and start Claude Code with `claude`.
3. Paste ONE prompt at a time. Only go to the next one when the "Done when" check is true.
4. After each working step, ask Claude Code to commit. If something breaks, say so before moving on.
5. Between phases you can type `/clear` to keep the session clean. CLAUDE.md is re-read automatically.

---

## Prompt 0: Check my computer

```
Read CLAUDE.md. Do not change anything yet. Check my computer: operating system, Node.js version,
Python version, git, and whether espeak-ng is installed. Tell me in a short list what is
installed, what is missing, and the exact steps to fix each missing thing for my system.
```
Done when: you have a list and everything missing is installed.

## Prompt 1: Create the project

```
Read CLAUDE.md. Create the Remotion project in this folder for 1080x1920 vertical video at 30 fps,
using TypeScript. Create the folder layout from CLAUDE.md (empty folders with a short README line
is fine). Add the npm scripts listed under "Commands" as placeholders that print "not built yet".
Then show me how to start the preview and what I should see.
```
Done when: `npm run dev` opens the Remotion preview and shows an empty vertical canvas.

## Prompt 2: Stickman v1

```
Build the Stickman component as an SVG React component. Props: pose, expression, x, y, scale,
color. Poses: idle, walking, running, pointing, shocked, deciding (both hands up). Expressions:
neutral, worried, scared. Add a "Stickman test" composition in the preview that shows all poses
next to each other with labels, so I can judge the look. Style rules are in CLAUDE.md.
```
Done when: you see all poses in the preview and like the basic look. Ask for changes now, e.g.
"thicker lines", "bigger head", "more expressive face".

## Prompt 3: Voice with Kokoro

```
Create the voice step. Set up Kokoro TTS in a Python virtual environment (ask me before any big
download). Write scripts/voice.py so that `npm run voice -- <episode-id>` does this:
1. Reads episodes/<episode-id>/script.txt (one sentence per line, empty line = longer pause).
2. Generates one audio file per line into the voice/ folder.
3. Joins them with short pauses into voice.wav.
4. Writes timing.json with start and end seconds for every line.
Speaking speed should be slightly slower than normal and easy to change in one place. Show me how to
switch between a few English voices. Test it with a 3-line example in a test episode.
```
Done when: you can play voice.wav and timing.json has sensible times. Listen to 2-3 voices and pick
the calmest one.

## Prompt 4: Create the Pompeii script

```
Create episodes/ep01-pompeii-part1/script.txt from the text in the appendix below
(one sentence per line, empty line before the choice). Then run the voice step for it.
Tell me the total voice length. If it is over 90 seconds, suggest where to shorten.
```
Done when: voice length is 80-90 s.

## Prompt 5: Captions

```
Create the caption step. `npm run captions -- <episode-id>` should use Whisper.cpp via
@remotion/install-whisper-cpp to produce captions.json with word-level timestamps from voice.wav
(ask me before the model download and choose the smallest model that works well for English).
Then build a Captions component in TikTok style: big bold text, current word highlighted, max 2
lines, placed in the safe area from CLAUDE.md. Show it over a plain background with the real voice.
```
Done when: captions match the voice in at least 3 spot checks.

## Prompt 6: Scene engine and first full episode

```
Build Episode.tsx so it reads scenes.json, timing.json and captions.json and plays the scenes in
sync with voice.wav. Then write scenes.json for ep01-pompeii-part1 following the 8-scene plan in
the appendix. Create simple backgrounds (bakery, street with Vesuvius, harbor direction, room with
roof beam) as SVG components in the flat style. The last scene is the vote card. Render a first
version to out/ep01-pompeii-part1-v1.mp4 and tell me where it is.
```
Done when: you have a v1 MP4 that plays from start to finish. Do not expect it to look good yet.

## Prompt 7: Review and improve (use this prompt after every render)

```
Check the latest render: render still frames at 5 key moments (first second, a caption moment,
a scene change, the choice, the vote card) and look at them. Then run the quality checklist from
CLAUDE.md and append the result to notes/iteration-log.md. List the 5 weakest points of v1,
ranked by impact on viewer retention. Propose fixes for the top 2 only and wait for my OK.
```
Then say "OK, do fix 1" (or give your own feedback) and ask for a v2 render. Repeat.

Ideas for what to improve, one at a time:
- Hook: does the first sentence stop the scroll? Try a version that starts with the danger.
- Pacing: shorter scenes, more camera movement.
- Voice speed and pauses before the choice.
- Caption style: color of the highlighted word, size, position.
- Vote card: clearer A/B, shorter option text.

---

## Pilot test plan (after v2 or v3 looks good)

- Post the same video on TikTok, Instagram Reels and YouTube Shorts.
- Ask for the vote in the caption AND on the vote card.
- After about 7 days write down for each platform: views, average watch time or retention,
  shares/saves, number of comments with a vote.
- Change one thing for the next episode (hook, length, voice speed) and compare.
- Verify the history facts marked "verify" before Part 2.

---

## Appendix A: Part 1 script (placeholder, rewrite in your own words)

One sentence per line. Mark facts to verify: the volcano knowledge of the Pompeians, and the
timing of the pumice fall.

```
You are a baker in Pompeii. It's the year 79 AD. A normal day.
Just after midday, the ground shakes.
Then a thunderclap rolls down from Mount Vesuvius.
A column of ash and smoke shoots miles into the sky.
It spreads out like a giant tree.
Nobody here knows what this is.
An hour later, small white stones start falling.
Pumice. Light. Almost harmless.
Your neighbors are already running for the harbor.
Your wife is holding your daughter. They're waiting for you to decide.

Inside your house, you're protected from the falling stones.
The walls are thick. The doors are strong.
But the stones keep coming.
They pile up on the roof. Hour after hour.
The ground shakes again. The roof beam above you creaks.

You have to choose. Right now.
Option A: run for the harbor, into the chaos.
Option B: stay inside and wait it out.
Vote in the comments. Part two tomorrow.
```

## Appendix B: 8-scene plan

1. Baker at his oven, calm morning
2. Shaking ground, Vesuvius in the background
3. Ash column, wide shot with slow zoom
4. Neighbors running, pumice dots falling
5. Family at the door, the baker deciding
6. Close-up of the creaking roof beam
7. Split screen with a big A and B
8. Vote card with "Part 2 tomorrow"
