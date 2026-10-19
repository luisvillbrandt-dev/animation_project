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
/notes/iteration-log.md
```

## How voice and timing work
1. Generate the voice per script line (so every line has an exact start and end time).
2. Join the lines with short pauses into voice.wav and write timing.json.
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
- [ ] Facts marked "verify" in the script are listed in /notes/iteration-log.md for me to check.

## Iteration protocol
After every render:
1. Run the checklist and append the result to /notes/iteration-log.md.
2. List the 5 weakest points of the video, ranked.
3. Propose fixes for the top 2 and wait for my OK.
4. Save the new render as the next version (v2, v3). Never overwrite an old version.
Change ONE thing at a time (hook, voice speed, caption style, pacing) so I can see what helped.

## Commands (update this section as the project grows)
- Preview in browser: `npm run dev`
- Render an episode: `npm run render -- <episode-id>`
- Generate voice: `npm run voice -- <episode-id>`
- Generate captions: `npm run captions -- <episode-id>`
- Check the code for type errors: `npm run typecheck`
- Shared video settings (size, fps, safe area): `src/video.ts`
