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
const words = fs.existsSync(script)
  ? fs.readFileSync(script, "utf8").split(/\s+/).filter((w) => normalize(w) !== "")
  : [];
const aligned = words.length ? alignToScript(heard, words) : { captions: heard, fixed: 0 };
const { fixed } = aligned;

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

function normalize(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Walks through the lines of timing.json and clamps each line's words to that line's start and end.
function fitToLines(captions, timing) {
  let k = 0;
  for (const line of timing) {
    const n = line.text.split(/\s+/).filter((w) => normalize(w) !== "").length;
    const startMs = Math.round(line.start * 1000);
    const endMs = Math.round(line.end * 1000);
    for (const c of captions.slice(k, k + n)) {
      c.startMs = Math.min(Math.max(c.startMs, startMs), endMs);
      c.endMs = Math.max(Math.min(c.endMs, endMs), c.startMs);
      c.timestampMs = c.startMs;
    }
    k += n;
  }
  return captions;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Classic edit-distance alignment between what Whisper heard and the script words.
// Matched and substituted words get the script's spelling; words Whisper invented are dropped;
// script words Whisper missed are glued onto the previous word so nothing is lost.
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
  const pending = []; // script words with no Whisper word, waiting for a neighbour
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      const c = heard[i - 1];
      const text = [words[j - 1], ...pending.splice(0)].join(" ");
      if (normalize(c.text) !== normalize(text) || c.text.trim() !== text) fixed++;
      out.unshift({ ...c, text: ` ${text}` });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || d[i][j] === d[i][j - 1] + 1)) {
      pending.unshift(words[j - 1]);
      j--;
    } else {
      i--; // a word Whisper heard that is not in the script
    }
  }
  if (pending.length && out.length) out[0].text = ` ${pending.join(" ")}${out[0].text}`;
  return { captions: out, fixed };
}
