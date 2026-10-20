# Show concept: time-travelling observer (working title TBD)

Read this file together with CLAUDE.md. Where they conflict, THIS FILE WINS (see section 12).
Do not build pipeline code yet. Section 13 lists the first tasks.

## 1. Pitch
A recurring non-human character travels through time to real historical events and witnesses them
up close, passively. A narrator tells the story. One event per week: a new video every day,
Monday to Sunday, and one week of story time passes. After every video the community votes (2-3
options). The AI counts the votes and builds the next video with the winner. Funny, fast, a bit of
swearing (strong words are bleeped), and strictly true facts.

## 2. Status of each decision
**Decided by Luis**
- Recurring, recognizable character who time-travels. It does not have to be human.
- A narrator carries the story and talks in the manner of Rick from Rick and Morty (manner of
  speaking only, not the voice).
- One video per day, Monday to Sunday. The same event and era all week; one week passes in the story.
- Length: 80 seconds per video.
- Tone: funny. Mild swearing is fine. Anything stronger than "shit" is covered by a bleep.
- After each video the audience chooses between 2-3 options (community vote).
- Goal: the AI evaluates the vote itself and creates the next video with the winner, autonomously.
- A library of 60 historical events already exists. Facts will come from a trusted source that Luis
  will name later.
- Presentation may be exaggerated at most a little, but NO false information.
- Visual style: roughly stickman-like; the exact style is decided later.
- A master script of the narrative style must exist so that the AI can write a story for any event
  by following it.
- Platforms: TikTok, Instagram Reels, YouTube Shorts. Language: English. Free tools first.

**Proposed by Claude, not yet confirmed (use as defaults, ask before treating as final)**
- Character: a tardigrade (water bear), silent and expressive. Unkillable, so it can plausibly
  survive and watch any disaster. Simple shapes, easy to build as SVG. No lip sync needed.
  Alternatives: a mosquito, a pocket watch with a face.
- Votes never change history (see rule 1 below).
- Building-block episodes (section 4).
- The bleep is the only non-voice sound. No music, no other sound effects.
- Hard maximum length 85 s (80 s is the target).
- Staged autonomy (section 9).

**Open**
- Library format and fields; name of the trusted fact source.
- Final visual style and character confirmation.
- Narrator voice and delivery (see risk in section 6).
- Channel name and accounts.

## 3. Golden rules
1. **History is fixed.** The observer never changes events. Votes only steer what is free:
   - perspective ("through whose eyes do we watch tomorrow?")
   - the bet ("what happens next?"), answered by real history in the next video
   - small gags by the character that explicitly change nothing in history
   - on Sundays: which of three library events is next week's event
2. **Exaggerate the tone, never the facts.** Numbers, dates, causes, names and quotes come only
   from the library. Exaggeration means opinion, comparison and hyperbole that is obviously a joke
   from the narrator.
3. **Closed-book writing.** The writer may only use facts from the library entry of the event.
   Every line containing a fact carries a fact ID. A check blocks rendering if a number, date or
   name in the script has no ID.
4. **Respect rule.** Jokes aim at rulers, systems, stupidity and absurdity, never at victims.
   Each library event gets a tone tier: `comic`, `respectful` (light touch, no jokes about the
   dead), or `excluded` (Holocaust, genocides, terror attacks and similar are not used).
5. **No slurs, ever,** not even bleeped. No jokes against groups of people.
6. **Swearing in tiers.** Allowed sparingly: hell, damn, ass, shit. Everything stronger gets a
   bleep. Never in titles, thumbnails or descriptions.
7. **No AI-generated images or video.** All visuals are built by hand (SVG / React in Remotion).
8. **Free tools only** (carried over from CLAUDE.md).
9. **No misleading content.** The channel does not claim to be live footage. Mark AI voice with the
   platform's AI label where available.

## 4. Episode structure: 80 s, building blocks
| Time | Block | Notes |
|---|---|---|
| 0-4 s | Hook | the funniest or most shocking line, already a moving image |
| 4-16 s | Payoff of yesterday's vote | 2-3 pre-made variants, one per option, picked automatically |
| 16-66 s | Today's beat of the real chronology | two halves; an open loop around second 40 ("it gets worse") |
| 66-80 s | Today's vote and teaser | question, 2-3 options, hint for tomorrow |

- Script length: about 190-210 words at a fast narrator tempo (about 2.6 words per second).
- A new piece of information or a gag about every 6-8 s (roughly 9-11 punchlines per video).
- A visual change or camera move every 3-5 s. Captions word by word, always on.
- The vote block ends with a clear call to comment A, B or C.
- Because the payoff block is the only part that depends on the vote, the other blocks of the whole
  week can be produced ahead of time. The daily job only picks the matching payoff variant,
  renders and uploads.

## 5. Weekly arc (default, adapt to the real chronology)
- Monday: arrival, setting, stakes, what is about to happen.
- Tuesday-Thursday: escalation, one documented turning point per day.
- Friday-Saturday: peak of the event.
- Sunday: aftermath, "what really happened" recap, plus the vote for next week's event.
Never stretch facts to fill seven days. Each library event needs a documented 7-day chronology
(at least 5-7 distinct beats). Single-day events get a run-up and an aftermath.

## 6. Character and narrator
- Character (default: tardigrade): silent, big expressive eyes, 8 stubby legs, a tiny time-travel
  gadget. It reacts in exaggerated ways, the narrator mocks it. A fixed set of poses and
  expressions, reused every episode. Poses are swapped, moved and wobbled; no frame-by-frame drawing.
- Narrator in the manner of Rick: cynical genius, fast, interrupts himself, stutters ("I-I mean"),
  talks straight to the viewer, nerdy asides, nihilistic one-liners, mixes real facts with
  sarcasm. Burps appear only as caption text. Do NOT copy catchphrases, names or lines from the
  show, and never use the name "Morty".
- Risk: comedic timing with a neutral text-to-speech voice is hard. The joke must sit in the
  writing. Try several Kokoro voices and tempos in the pilot week and decide afterwards whether
  Luis records the narrator himself.
- Bleep: the script marks a strong word as `[[word]]`. The pipeline replaces the audio at the
  word's Whisper timestamp with a bleep tone and masks it in the captions (`s***`).

## 7. Facts: library and tags
Suggested entry (adapt after seeing Luis's real library):
```json
{
  "id": "event-slug",
  "name": "...",
  "date_range": "...",
  "location": "...",
  "tone_tier": "comic | respectful | excluded",
  "chronology": [
    { "day": 1, "beat": "...", "fact_ids": ["event-slug-001"] }
  ],
  "facts": [
    { "id": "event-slug-001", "text": "...", "source": "...", "confidence": "confirmed | likely | disputed" }
  ],
  "vote_hooks": [ { "type": "perspective | bet | gag", "options": ["...", "..."] } ]
}
```
Script lines that contain a fact are tagged, for example `{f:event-slug-001}`. Disputed facts may
only be used with a hedge ("historians argue").

## 8. Voting
- Vote types: perspective, bet, gag, and the Sunday event vote.
- Counting: comments that start with the option letter; one valid vote per account (the first one
  counts); ties go to a fixed default rule decided in advance.
- Sources: YouTube and Instagram comments through their APIs. TikTok votes are added by hand or
  ignored until a reliable way exists.
- Every vote option must have a prepared payoff variant, so any winner can be rendered.

## 9. Pipeline and autonomy
Tools carried over: Remotion, Kokoro TTS (local), Whisper.cpp for word timing, ffmpeg.
Per episode: script (with fact IDs and bleep markers) -> checks -> voice -> word timing ->
bleep and captions -> render -> upload.
Autonomy in stages:
1. Luis approves every video (about 30 seconds a day).
2. Weekly batch of the fixed blocks; the daily vote pick and render run automatically; upload is
   semi-automatic.
3. Fully automatic only where the platform interfaces allow it cleanly, with a kill switch and a
   weekly report.
Upload and platform facts so far (secondary sources, verify before relying on them):
- Instagram: Reels can be published through the API with a professional account and a Meta app
  (limit 100 API posts per 24 h per the docs).
- TikTok: posts from an app that has not passed TikTok's audit are all forced to private; the audit
  takes weeks and needs a product demo. Interim option: send the video to the TikTok inbox and
  publish with one tap.
- YouTube: the official upload documentation says unverified projects are not restricted to
  private; test with one upload. YouTube's "inauthentic content" monetization policy (since July
  2025) targets mass-produced, repetitive content, so every episode needs real, distinct content.
- TikTok Creator Rewards needs videos longer than one minute (older secondary source; follower and
  view thresholds apply).
- YouTube allows strong profanity in the first 7 seconds with full ads (Aug 2025), but frequent
  profanity or profanity in the title can limit ads. How bleeped words are rated is unknown.

## 10. Master script (to be written, Phase 0)
File `master-script.md` with: world rules; character sheet; narrator guide (sliders, taboos,
stutter patterns, swear tiers, bleep markers); episode template with the time budget above and
joke density; weekly arc template; exaggeration and fact contract; vote rules and how winners map
to payoff variants; JSON output format (lines, fact IDs, bleep markers, scene tags, durations);
quality gates (anti-slop list, fact check, length check, profanity check); and 2-3 golden
episodes that Luis approves, used as examples for every future episode.

## 11. Agents (existing, to be adapted)
- history-fact-checker: becomes the gate. Every number, date and name must map to a library fact ID.
- story-writer: writes strictly from master-script.md and the library entry; closed-book.
  Drafts only; Luis approves. (Its current second-person POV format and 170-200 word limit are outdated.)
- episode-reviewer: additionally checks length (80 s target, 85 s max), fact IDs, bleep markers,
  joke density, tone tier.
- episode-improver: unchanged in role.
Counting votes, bleeping and uploading are small scripts, not agents.

## 12. What this file overrides in CLAUDE.md
- Episode format: the second-person POV baker/Pompeii pilot and its A/B ending are replaced by the
  recurring character, narrator and weekly arc above.
- Length: 80 s target, 85 s max (not 80-90 s).
- Voice: fast narrator tempo instead of "slightly slower than normal".
- Audio: the bleep is allowed as the single non-voice sound.
- Final scene: a vote block as in section 4, not a fixed "A/B + Part 2 tomorrow" card.
- Everything else (free tools, no AI imagery, Remotion/Kokoro/Whisper, beginner-friendly working
  style, iteration loop, versioning) stays.

## 13. Phases and first tasks
- Phase 0: decisions, master-script v0, library review, one golden episode.
- Phase 1: pilot week, 7 episodes through the pipeline, Luis posts by hand, collect retention data
  (3 s, 15 s, 40 s, 70 s).
- Phase 2: vote counter, payoff variants and weekly batch.
- Phase 3: upload automation (YouTube and Instagram first, TikTok via inbox or audit).
- Phase 4: staged autonomy, kill switch, weekly report, roll through the 60 events.

First tasks for Claude Code (do not write pipeline code yet):
1. Update CLAUDE.md and the four agent files to match this file. Show Luis the changes first.
2. Ask Luis for the library file; read it and propose how it maps to the schema in section 7.
3. Draft the skeleton of master-script.md with the sections in section 10.
4. After Luis confirms the character, draft one 80 s golden episode (about 200 words) with fact IDs
   and bleep markers, for Luis to rewrite and approve.
