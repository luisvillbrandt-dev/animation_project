"""Voice step: turns episodes/<id>/script.txt into spoken audio with Kokoro TTS.

Usage (from the project folder):
  npm run voice -- <episode-id>                         use the settings in voice.config.json
  npm run voice -- <episode-id> --voice bm_george       try another voice once
  npm run voice -- <episode-id> --speed 0.85            try another speed once
  npm run voice -- <episode-id> --samples am_michael,am_adam,bm_george
                                                        one comparison file per voice and speed,
                                                        e.g. voice/samples/am_adam_speed0.9.wav

Writes:
  episodes/<id>/voice/line-NN.wav   one file per script line (NN = line number in script.txt)
  episodes/<id>/voice/voice.wav     all lines joined with pauses
  episodes/<id>/timing.json         [{"line": 1, "text": "...", "start": 0.15, "end": 3.2}, ...]

  episodes/<id>/cues.json           {"sfx": [{"name": "buzzer", "at": 40.1}, ...]} sound effects in seconds

script.txt: one sentence per line. An empty line means a longer pause; two empty lines a pause twice
as long (used after the hook, while the intro travels through time). Line numbers are the line
numbers you see in the editor; empty lines and [SFX] lines get no entry in timing.json.
Markup from the story-writer is understood: {f:id} fact tags are dropped, [[word]] is spoken (and
bleeped later in the video), and a line "[SFX: name]" becomes a sound-effect cue instead of speech.

Voices (the first letter is the accent: a = American, b = British; the second: m = male, f = female):
  am_michael, am_adam, am_eric, am_liam, am_onyx, am_fenrir, am_puck, am_echo
  bm_george, bm_lewis, bm_daniel, bm_fable
  af_heart, af_bella, af_nicole, af_sarah, bf_emma, bf_isabella
Blend two voices with "+", e.g. am_michael+am_onyx (works in voice.config.json too).
Force the accent with a prefix: "b:am_michael" speaks Michael's voice with British pronunciation.
"""

import argparse
import json
import re
import sys
import warnings
from pathlib import Path

import numpy as np
import soundfile as sf

warnings.filterwarnings("ignore")  # torch prints harmless deprecation warnings

ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = ROOT / "voice.config.json"
SAMPLE_RATE = 24000  # Kokoro always speaks at 24 kHz
SILENCE_LEVEL = 0.002  # quieter than this counts as silence when trimming each line
TRIM_PADDING = 0.03  # seconds of silence kept at both ends of a line
MAX_SECONDS = 90


FACT_TAG = re.compile(r"\s*\{f:[^}]*\}")  # {f:pompeii-003} fact IDs, only for the fact check
BLEEP = re.compile(r"\[\[([^\]]+)\]\]")  # [[word]] is spoken, then bleeped in the video
SFX_LINE = re.compile(r"^\[SFX:\s*([^\]]+)\]$", re.IGNORECASE)  # [SFX: buzzer] on its own line


def spoken(text):
    """The words the narrator actually says: no fact IDs, bleep brackets removed."""
    return BLEEP.sub(r"\1", FACT_TAG.sub("", text)).strip()


def read_script(path):
    """Returns (lines, cues).
    lines: (line_number, spoken_text, empty_lines_before) for every spoken line.
    cues: sound effects. An [SFX] line right after a spoken line plays when that line ends; after an
    empty line it plays just before the next spoken line starts."""
    lines = []
    cues = []
    empty_before = 0
    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        text = raw.strip()
        sfx = SFX_LINE.match(text)
        if sfx:
            if lines and empty_before == 0:
                cues.append({"name": sfx.group(1).strip(), "after_line": lines[-1][0]})
            else:
                cues.append({"name": sfx.group(1).strip(), "before_index": len(lines)})
            continue
        if not text:
            if lines:  # empty lines at the very top are ignored
                empty_before += 1
            continue
        lines.append((number, spoken(text), empty_before))
        empty_before = 0
    return lines, cues


def place_cues(cues, lines, timing):
    """Turns the cues into seconds on the voice timeline."""
    by_line = {t["line"]: t for t in timing}
    placed = []
    for c in cues:
        if "after_line" in c:
            at = by_line[c["after_line"]]["end"] + 0.05
        elif c["before_index"] < len(timing):
            at = max(0.0, timing[c["before_index"]]["start"] - 0.25)
        else:
            at = timing[-1]["end"] + 0.05
        placed.append({"name": c["name"], "at": round(at, 3)})
    return placed


def trim(audio):
    loud = np.flatnonzero(np.abs(audio) > SILENCE_LEVEL)
    if loud.size == 0:
        return audio
    pad = int(TRIM_PADDING * SAMPLE_RATE)
    return audio[max(0, loud[0] - pad) : min(len(audio), loud[-1] + pad + 1)]


def silence(seconds):
    return np.zeros(int(round(seconds * SAMPLE_RATE)), dtype=np.float32)


class Speaker:
    def __init__(self):
        from kokoro import KPipeline

        self._pipeline_class = KPipeline
        self._pipelines = {}

    def say(self, text, voice, speed):
        # The accent comes from the first letter of the voice ("a" = American, "b" = British),
        # unless it is given in front: "b:am_michael" = Michael's voice with British pronunciation.
        lang, _, voice = voice.rpartition(":")
        lang = lang or voice[0]
        if lang not in self._pipelines:
            self._pipelines[lang] = self._pipeline_class(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
        # "am_michael+am_onyx" blends voices; Kokoro averages comma-separated voices.
        parts = [
            result.audio.cpu().numpy()
            for result in self._pipelines[lang](text, voice=voice.replace("+", ","), speed=speed)
            if result.audio is not None
        ]
        if not parts:
            raise RuntimeError(f"Kokoro produced no audio for: {text}")
        return trim(np.concatenate(parts).astype(np.float32))


def join(clips, lines, config):
    """Joins line clips with pauses. Returns the audio and the timing list."""
    pieces = [silence(config["leadIn"])]
    position = config["leadIn"]
    timing = []
    for index, ((number, text, empty_before), clip) in enumerate(zip(lines, clips)):
        if index > 0:
            # Each empty line adds one long pause: two empty lines = twice as long.
            pause = config["pauseAtEmptyLine"] * empty_before if empty_before else config["pauseBetweenLines"]
            pieces.append(silence(pause))
            position += pause
        start = position
        pieces.append(clip)
        position += len(clip) / SAMPLE_RATE
        timing.append({"line": number, "text": text, "start": round(start, 3), "end": round(position, 3)})
    pieces.append(silence(config["tail"]))
    return np.concatenate(pieces), timing


def main():
    parser = argparse.ArgumentParser(description="Generate the voiceover for one episode.")
    parser.add_argument("episode", help="episode folder name, e.g. ep01-pompeii-part1")
    parser.add_argument("--voice", help="override the voice from voice.config.json")
    parser.add_argument("--speed", type=float, help="override the speed (1.0 = normal)")
    parser.add_argument("--samples", help="comma-separated voices to compare; writes voice/samples/")
    args = parser.parse_args()

    episode = ROOT / "episodes" / args.episode
    config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    # An episode can override single settings (e.g. shorter pauses) in its own voice.config.json.
    episode_config = episode / "voice.config.json"
    if episode_config.exists():
        config.update(json.loads(episode_config.read_text(encoding="utf-8")))
    voice = args.voice or config["voice"]
    speed = args.speed or config["speed"]
    script = episode / "script.txt"
    if not script.exists():
        sys.exit(f"Not found: {script}")
    lines, cues = read_script(script)
    if not lines:
        sys.exit(f"{script} has no text.")

    speaker = Speaker()
    voice_dir = episode / "voice"
    voice_dir.mkdir(exist_ok=True)

    if args.samples:
        samples_dir = voice_dir / "samples"
        samples_dir.mkdir(exist_ok=True)
        for sample_voice in [v.strip() for v in args.samples.split(",") if v.strip()]:
            clips = [speaker.say(text, sample_voice, speed) for _, text, _ in lines]
            audio, _ = join(clips, lines, config)
            out = samples_dir / f"{sample_voice.replace(':', '-')}_speed{speed}.wav"  # ":" is not allowed in file names
            sf.write(out, audio, SAMPLE_RATE)
            print(f"{sample_voice:<12} {len(audio) / SAMPLE_RATE:5.1f} s  -> {out.relative_to(ROOT)}")
        return

    print(f"Voice: {voice}, speed: {speed}")
    clips = []
    for number, text, _ in lines:
        clip = speaker.say(text, voice, speed)
        sf.write(voice_dir / f"line-{number:02d}.wav", clip, SAMPLE_RATE)
        clips.append(clip)

    audio, timing = join(clips, lines, config)
    sf.write(voice_dir / "voice.wav", audio, SAMPLE_RATE)
    (episode / "timing.json").write_text(json.dumps(timing, indent=2) + "\n", encoding="utf-8")
    placed = place_cues(cues, lines, timing)
    (episode / "cues.json").write_text(json.dumps({"sfx": placed}, indent=2) + "\n", encoding="utf-8")

    for entry in timing:
        print(f"  line {entry['line']:>2}  {entry['start']:6.2f} - {entry['end']:6.2f} s  {entry['text']}")
    for c in placed:
        print(f"  sfx {c['name']:<16} at {c['at']:6.2f} s")
    total = len(audio) / SAMPLE_RATE
    print(f"Total voice length: {total:.1f} s")
    if total > MAX_SECONDS:
        print(f"WARNING: longer than {MAX_SECONDS} s. Shorten the script or raise the speed.")


if __name__ == "__main__":
    main()
