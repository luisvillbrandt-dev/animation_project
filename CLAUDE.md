# Project: History's Impossible Decisions (stickman shorts)

## What this is
A series of ~90-second vertical stickman videos for TikTok, Instagram Reels and YouTube Shorts.
Each episode is a first-person (POV) disaster or decision moment from history and ends with an
A/B choice the audience votes on in the comments. The next part plays out the winning choice and
then reveals what really happened.

Pilot episode: Pompeii, 79 AD (baker, run to the harbor vs. shelter inside).
Video language: English.

## Working with me (I am a coding beginner)
- Work in ONE small step at a time. Before changing anything, say in 1-2 sentences what you will do and why.
- After each step, tell me exactly how to check it (a command to run, or what I should see on screen).
- Plain language. Explain any technical term in one line the first time.
- Ask before: downloads over 200 MB, installing anything globally, anything paid, deleting files.
- Do not touch files that are unrelated to the current step.
- If something fails: explain the error in plain words, propose a fix, and ask if you are unsure.
- Detect my operating system yourself (Windows or Mac) and use the right commands.
- If git is set up, commit after each working step with a clear message.
- Checkpoints: after every finished step, and always BEFORE a risky change (big refactor, script
  change, deleting or moving files), save a checkpoint with `npm run checkpoint -- "<what>"`.
  It commits everything, tags it stand-<date>-<time> and uploads it to GitHub. Tell me the name.
- Going back: when I say "zurück auf <checkpoint>", restore that state as a NEW commit
  (`git restore --source=<tag> --staged --worktree .`, then commit), never with reset or force
  push, so nothing in between gets lost. Save a checkpoint of the current state first.

## Hard constraints
- 100% free tools. No paid APIs, no API keys, no subscriptions.
- No AI-generated images or video. All visuals are hand-built SVG / React components.
- Audio is the voiceover ONLY. No music, no sound effects.
- Output: 1080x1920 (9:16), 30 fps, MP4. Target 80-90 s, hard maximum 90 s.
- All on-screen text is English.

## Tech stack
- Video: Remotion (TypeScript + React).
- Voice: Kokoro TTS (open source, runs locally, Python). Use a Python virtual environment.
  It may need extra system packages (e.g. espeak-ng). Check and tell me what is missing.
- Word timing for captions: Whisper.cpp via @remotion/install-whisper-cpp.
  Ask me before the model download (it can be large).
- Captions: @remotion/captions (TikTok-style, word-by-word highlight).
- Fonts: Google Fonts only.

## Folder layout
```
/episodes/<episode-id>/
    script.txt        one sentence per line; an empty line = longer pause
    scenes.json       scene plan (see below)
    voice/            generated audio, one file per line + voice.wav (all lines joined)
    timing.json       generated: start/end second of every script line
    captions.json     generated: word-level timestamps
/src/
    components/       Stickman, Scene, Captions, Backgrounds
    Episode.tsx       reads scenes.json + timing.json + captions.json
/scripts/             voice generation, caption generation
/out/                 rendered MP4s, named <episode-id>-v1.mp4, -v2.mp4 ...
/out/review/          still frames the reviewer renders for inspection
/episodes/<episode-id>/drafts/   script drafts from the story-writer (part1-draft-1.md, ...)
/notes/iteration-log.md
/notes/facts/         fact-check notes and research briefs, one file per episode
/notes/pitches.md     episode ideas from the story-writer
/.backup/             copies of files the improver made before it edited them
/.claude/agents/      episode-reviewer.md, episode-improver.md, history-fact-checker.md, story-writer.md
```

## How voice and timing work
1. Generate the voice per script line (so every line has an exact start and end time).
2. Join the lines with short pauses into voice.wav and write timing.json, a list in seconds like
   `[{ "line": 1, "text": "...", "start": 0.0, "end": 3.2 }]`.
3. Run Whisper on voice.wav only for word-level caption timing.
4. Scene durations come from timing.json, never from guesses.

## scenes.json format
```json
{
  "episode": "ep01-pompeii-part1",
  "scenes": [
    {
      "id": "s1",
      "lines": [1, 2],
      "background": "bakery-morning",
      "characters": [{ "name": "baker", "pose": "idle", "x": 0.5 }],
      "camera": { "zoomFrom": 1.0, "zoomTo": 1.15 },
      "effects": []
    }
  ]
}
```
`lines` refers to line numbers in script.txt. A scene lasts from the start of its first line to the
end of its last line.

## Visual style
- Flat look, 2-3 main colors per scene, thick consistent stroke width, round line caps.
- Stickman: circle head, simple expressions (eyes + mouth variants), 6+ poses
  (idle, walking, running, pointing, shocked, deciding with hands up). Poses are swapped, moved
  and slightly wobbled; no frame-by-frame drawing.
- Camera: slow zooms and pans, scene changes every 4-8 seconds so the screen never sits still.
- Captions: large, bold, high contrast, current word highlighted, max 2 lines on screen.
- Keep text and key action in the central area. Leave roughly the bottom 20% and the top 10%
  free for the platform's own interface.
- The final scene is always a vote card: big "A" and "B", the two options, and "Part 2 tomorrow".

## Quality checklist (run it before saying "done")
- [ ] Video length is 90 s or less and matches the voice length.
- [ ] Every caption word is in sync with the audio (spot-check 3 places).
- [ ] No text outside the safe area; nothing cut off at the edges.
- [ ] Every script line is covered by exactly one scene.
- [ ] The first 3 seconds contain the hook and a moving image.
- [ ] The A/B question is clear and both options sound reasonable.
- [ ] It renders without warnings or errors.
- [ ] Every factual claim was checked by history-fact-checker (notes/facts/<episode-id>.md), or is
      listed there as open for me to check.

## Agents (project subagents in .claude/agents/)
- **episode-reviewer**: the controller. Runs the checks and the checklist above, looks at still
  frames, reads script and timing, ranks the 5 weakest points and proposes fixes. It never edits
  episode files.
- **episode-improver**: the implementer. Applies only approved fixes, one at a time, and renders a
  new version (v2, v3 ...). It never overwrites older versions and never grades its own work.
- **history-fact-checker**: the historian. Checks every factual claim in the script against reliable
  web sources, rates it (confirmed / likely / disputed / legend / unsupported), suggests safe
  wording, and can write a research brief for a new episode. It never edits the script; it only
  writes notes/facts/<episode-id>.md.
- **story-writer**: the storyteller. Pitches episode ideas, drafts hooks and Part 1 / Part 2
  scripts, or polishes my own draft. Takes facts only from notes/facts/<episode-id>.md, never
  invents history, and never edits script.txt. It only writes episodes/<episode-id>/drafts/
  (numbered, never overwritten) and appends to notes/pitches.md.
Subagents cannot ask me questions. If they need a decision they return it as NEEDS DECISION, and the
main session asks me.

### Loop (default: manual)
1. After EVERY render, run episode-reviewer without asking me.
2. Show me a short summary: verdict, top 2 problems, proposed fixes. The full report goes to
   /notes/iteration-log.md. If the reviewer lists claims under VERIFY, or before I record a new
   script, also run history-fact-checker and show me what it would change (keep / reword / cut).
   Script wording only changes with my OK.
3. I answer e.g. "OK 1", "OK both", or give my own change.
4. Run episode-improver with ONLY the approved items. One change = one new version.
5. Run episode-reviewer on the new version and compare it with the previous one. Tell me plainly
   whether it got better, worse or stayed the same, and why.
Change ONE thing at a time (hook, voice speed, caption style, pacing) so I can see what helped.

### Writing a new script (before any voice is recorded)
1. New topic: history-fact-checker in BRIEF mode writes notes/facts/<episode-id>.md.
2. story-writer in PITCH mode (ideas) or DRAFT mode (script) works from those notes.
3. I choose and rewrite. My wording decides; drafts are raw material.
4. history-fact-checker in CHECK mode on the chosen draft; I approve each reword.
5. Only then the draft becomes script.txt and the voice step runs.

### Auto mode (only when I say so, e.g. "auto, 3 rounds")
Repeat the loop for the number of rounds I named (max 3), taking the reviewer's top fix each time
without asking me. Allowed: pacing, camera, scene order, stickman poses and expressions, caption
style, voice speed. NOT allowed: rewriting script text, new downloads, anything paid, anything that
breaks the hard constraints. Stop early if a round makes the video worse (go back to the better
version) or if an agent returns NEEDS DECISION. history-fact-checker may run in auto mode, but its
findings only come to me and never change the script by themselves. At the end give me a short
summary: what changed per version and which version I should post.

## Commands (update this section as the project grows)
- Preview in browser: `npm run dev`
- Render an episode: `npm run render -- <episode-id>` (writes out/<episode-id>-vN.mp4 with the next
  free N; composition `Episode` in src/Episode.tsx)
  - scenes.json extends the format above with: top-level `place`, `year`, `introStage`;
    per scene `background` (intro | street | bakery | gate | room | vote), `stage` (day | ash | dark),
    characters `name` (tony | wife | daughter | neighbor), optional `toX`, `facing`, `extra`,
    `changes` [{ line, pose, expression }]; `effects` shake / eruption / beamCreak / tag;
    street `plume`, `pumice`; room `pile`; vote card `vote` [A, B] with the line that reads each option.
    The full list of fields is the SceneSpec type at the top of src/Episode.tsx.
  - Two empty lines in script.txt = a pause twice as long (after the hook, while the intro plays).
- Generate voice: `npm run voice -- <episode-id>`
  - Voice, speed (1.0 = normal) and pauses: `voice.config.json` (the one place to change them)
  - Try a voice or speed once: `npm run voice -- <episode-id> --voice bm_george --speed 0.85`
  - Compare voices: `npm run voice -- <episode-id> --samples am_michael,bm_george`
    (writes episodes/<id>/voice/samples/<voice>.wav; voice list at the top of scripts/voice.py)
  - Python runs from `.venv` (Python 3.12, Kokoro). Recreate it with
    `py -3.12 -m venv .venv` and `.venv\Scripts\python.exe -m pip install -r scripts/requirements.txt`
  - Line numbers in timing.json are the line numbers in script.txt; empty lines are skipped.
  - Generated audio (episodes/*/voice/) is not stored in git; rerun the voice step to get it back.
- Generate captions: `npm run captions -- <episode-id>`
  - Whisper.cpp 1.5.5 and the model base.en live in `.whisper/` (not in git). First time on a new
    computer: `npm run captions -- <episode-id> --download-model` (142 MB).
  - Whisper gives only the timing; the words come from script.txt, and every word is kept inside
    its line's start/end from timing.json.
  - Remotion's public folder is `episodes/`, so `staticFile("<episode-id>/voice/voice.wav")` works.
  - Caption style: `src/components/Captions.tsx`; test view: composition `CaptionsTest`.
- Check the code for type errors: `npm run typecheck`
- Save a checkpoint: `npm run checkpoint -- "<description>"` · list them: `npm run checkpoints`
- Shared video settings (size, fps, safe area): `src/video.ts`
