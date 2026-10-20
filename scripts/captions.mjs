// Caption step: word-level timestamps for episodes/<id>/voice/voice.wav, using Whisper.cpp.
//
// Usage (from the project folder):
//   npm run captions -- <episode-id>                    needs the model to be downloaded already
//   npm run captions -- <episode-id> --download-model   first time only: downloads the model
//   npm run captions -- <episode-id> --model tiny.en    use another model
//
// Whisper only provides the timing. The words themselves are taken from script.txt (matched word
// by word), so names like "Pompeii" or "Vesuvius" are always spelled right.
// Writes episodes/<id>/captions.json: [{ text, startMs, endMs, timestampMs, confidence }, ...]
import whisper from "@remotion/install-whisper-cpp";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe } = whisper;
const getModelPath = (folder, model) => path.join(folder, `ggml-${model}.bin`); // same rule as the package

const WHISPER_DIR = path.resolve(".whisper"); // program and model live here (not in git)
const WHISPER_VERSION = "1.5.5";
const DEFAULT_MODEL = "base.en"; // small, English-only, good timing
const MODEL_SIZES = { "tiny.en": "75 MB", "base.en": "142 MB", "small.en": "466 MB", "medium.en": "1.5 GB" };

const args = process.argv.slice(2);
const episode = args.find((a) => !a.startsWith("--"));
const model = args.includes("--model") ? args[args.indexOf("--model") + 1] : DEFAULT_MODEL;
const allowDownload = args.includes("--download-model");

if (!episode) fail("Usage: npm run captions -- <episode-id>");
const dir = path.resolve("episodes", episode);
const voice = path.join(dir, "voice", "voice.wav");
const script = path.join(dir, "script.txt");
if (!fs.existsSync(voice)) fail(`Not found: ${voice}\nRun the voice step first: npm run voice -- ${episode}`);

// 1. Whisper.cpp program (a few MB, downloaded once).
await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: false });

// 2. The model: only downloaded when asked for, because it is big.
if (!fs.existsSync(getModelPath(WHISPER_DIR, model))) {
  if (!allowDownload) {
    fail(
      `The Whisper model "${model}" (${MODEL_SIZES[model] ?? "large"}) is not downloaded yet.\n` +
        `Download it once with: npm run captions -- ${episode} --download-model`,
    );
  }
  console.log(`Downloading Whisper model ${model} (${MODEL_SIZES[model] ?? "?"}) ...`);
  await downloadWhisperModel({ model, folder: WHISPER_DIR, printOutput: false });
}

// 3. Whisper needs 16 kHz mono audio.
const wav16 = path.join(dir, "voice", "voice-16k.wav");
const ff = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", voice, "-ar", "16000", "-ac", "1", wav16], { stdio: "inherit" });
if (ff.status !== 0) fail("ffmpeg could not convert the audio. Is ffmpeg installed?");

// 4. Transcribe with a timestamp for every word.
console.log(`Transcribing ${episode} with ${model} ...`);
const output = await transcribe({
  inputPath: wav16,
  whisperPath: WHISPER_DIR,
  whisperCppVersion: WHISPER_VERSION,
  model,
  modelFolder: WHISPER_DIR,
  tokenLevelTimestamps: true,
  language: "en",
  splitOnWord: true,
  printOutput: false,
});
const heard = toCaptions({ whisperCppOutput: output }).captions.filter((c) => normalize(c.text) !== "");

// 5. Put the script's own words onto Whisper's timing.
const scriptWords = fs.existsSync(script) ? readScriptWords(fs.readFileSync(script, "utf8")) : [];
const words = scriptWords.map((w) => w.text);
const aligned = words.length ? alignToScript(heard, words) : { captions: heard, fixed: 0 };
const { fixed } = aligned;

// Words written as [[word]] are bleeped in the video: mark them and mask them in the captions.
for (const c of aligned.captions) {
  if (c._word !== undefined && scriptWords[c._word]?.bleep) {
    c.bleep = true;
    c.text = c.text.replace(/[A-Za-z]+/, (w) => w[0] + "*".repeat(w.length - 1));
  }
  delete c._word;
}

// 6. Whisper stretches each word up to the start of the next one, also across pauses.
// timing.json knows exactly when every line starts and ends, so keep each word inside its line.
const timingFile = path.join(dir, "timing.json");
const captions = fs.existsSync(timingFile)
  ? fitToLines(aligned.captions, JSON.parse(fs.readFileSync(timingFile, "utf8")))
  : aligned.captions;

fs.writeFileSync(path.join(dir, "captions.json"), JSON.stringify(captions, null, 2) + "\n");
console.log(`Captions: ${captions.length} words (Whisper heard ${heard.length}, script has ${words.length}).`);
console.log(`Words taken from the script instead of Whisper's spelling: ${fixed}`);
console.log(`Written: episodes/${episode}/captions.json`);

// The spoken words of script.txt: [SFX: ...] lines and {f:id} fact tags are skipped, [[word]] is
// kept as the word and flagged for the bleep (same rules as scripts/voice.py).
function readScriptWords(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\[SFX:[^\]]*\]$/i.test(line)) continue;
    for (const token of line.replace(/\{f:[^}]*\}/g, " ").split(/\s+/)) {
      const bleep = /\[\[[^\]]*\]\]/.test(token);
      const word = token.replace(/\[\[|\]\]/g, "");
      if (normalize(word) !== "") out.push({ text: word, bleep });
    }
  }
  return out;
}

function normalize(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Walks through the lines of timing.json and fixes each line's word times:
// - The TTS voice speaks evenly, so a word's start can be estimated from its position in the line
//   (by letters). If Whisper is more than 0.3 s off that estimate, the estimate is used instead.
// - Every word lies inside its line, starts after the previous word and lasts at least 80 ms;
//   it ends where the next word starts (the last one at the end of the line).
function fitToLines(captions, timing) {
  const TRUST_MS = 300;
  const MIN_MS = 80;
  let k = 0;
  for (const line of timing) {
    const n = line.text.split(/\s+/).filter((w) => normalize(w) !== "").length;
    const words = captions.slice(k, k + n);
    k += n;
    const lineStart = Math.round(line.start * 1000);
    const lineEnd = Math.round(line.end * 1000);
    const weights = words.map((c) => normalize(c.text).length + 2);
    const total = weights.reduce((a, b) => a + b, 0);
    let before = 0;
    let previousStart = lineStart - MIN_MS;
    words.forEach((c, i) => {
      const estimate = lineStart + (before / total) * (lineEnd - lineStart);
      before += weights[i];
      const trusted = Number.isFinite(c.startMs) && Math.abs(c.startMs - estimate) <= TRUST_MS;
      let start = trusted ? c.startMs : Math.round(estimate);
      start = Math.min(Math.max(start, lineStart, previousStart + MIN_MS), lineEnd - MIN_MS);
      c.startMs = start;
      previousStart = start;
    });
    words.forEach((c, i) => {
      c.endMs = i + 1 < words.length ? words[i + 1].startMs : lineEnd;
      c.timestampMs = c.startMs;
    });
  }
  return captions;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Classic edit-distance alignment between what Whisper heard and the script words.
// Matched and substituted words get the script's spelling; words Whisper invented are dropped;
// script words Whisper missed stay as their own word (time estimated later), so nothing is lost.
function alignToScript(heard, words) {
  const a = heard.map((c) => normalize(c.text));
  const b = words.map(normalize);
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  const out = [];
  let fixed = 0;
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      const c = heard[i - 1];
      if (c.text.trim() !== words[j - 1]) fixed++;
      out.unshift({ ...c, text: ` ${words[j - 1]}`, _word: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || d[i][j] === d[i][j - 1] + 1)) {
      // A script word Whisper did not hear: keep it as its own word; fitToLines estimates its time.
      out.unshift({ text: ` ${words[j - 1]}`, startMs: NaN, endMs: NaN, timestampMs: NaN, confidence: 0, _word: j - 1 });
      fixed++;
      j--;
    } else {
      i--; // a word Whisper heard that is not in the script
    }
  }
  return { captions: out, fixed };
}
