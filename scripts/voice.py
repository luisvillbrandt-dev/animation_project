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

script.txt: one sentence per line. An empty line means a longer pause. Line numbers are the line
numbers you see in the editor; empty lines get no entry in timing.json.

Voices (the first letter is the accent: a = American, b = British; the second: m = male, f = female):
  am_michael, am_adam, am_eric, am_liam, am_onyx, am_fenrir, am_puck, am_echo
  bm_george, bm_lewis, bm_daniel, bm_fable
  af_heart, af_bella, af_nicole, af_sarah, bf_emma, bf_isabella
Blend two voices with "+", e.g. am_michael+am_onyx (works in voice.config.json too).
"""

import argparse
import json
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


def read_script(path):
    """Returns a list of (line_number, text, pause_before) for every spoken line."""
    lines = []
    empty_before = False
    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        text = raw.strip()
        if not text:
            empty_before = bool(lines)  # an empty line at the very top is ignored
            continue
        lines.append((number, text, empty_before))
        empty_before = False
    return lines


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
        lang = voice[0]  # "a" = American English, "b" = British English
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
            pause = config["pauseAtEmptyLine"] if empty_before else config["pauseBetweenLines"]
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

    config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    voice = args.voice or config["voice"]
    speed = args.speed or config["speed"]

    episode = ROOT / "episodes" / args.episode
    script = episode / "script.txt"
    if not script.exists():
        sys.exit(f"Not found: {script}")
    lines = read_script(script)
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
            out = samples_dir / f"{sample_voice}_speed{speed}.wav"
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

    for entry in timing:
        print(f"  line {entry['line']:>2}  {entry['start']:6.2f} - {entry['end']:6.2f} s  {entry['text']}")
    total = len(audio) / SAMPLE_RATE
    print(f"Total voice length: {total:.1f} s")
    if total > MAX_SECONDS:
        print(f"WARNING: longer than {MAX_SECONDS} s. Shorten the script or raise the speed.")


if __name__ == "__main__":
    main()
