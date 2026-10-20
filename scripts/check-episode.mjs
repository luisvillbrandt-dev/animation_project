// Automated checks for one rendered episode. Usage: node scripts/check-episode.mjs <episode-id> <version>
// Example: node scripts/check-episode.mjs ep01-pompeii-part1 v1
// Prints metrics as JSON plus PASS / FAIL / WARN per check. Plain Node.js, no dependencies.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const [episode, version = "v1"] = process.argv.slice(2);
if (!episode) {
  console.error("Usage: node scripts/check-episode.mjs <episode-id> <version>");
  process.exit(2);
}
const dir = `episodes/${episode}`;
const video = `out/${episode}-${version}.mp4`;
const INTRO_END = 6.5; // seconds; src/Intro.tsx INTRO_FRAMES
const FPS = 30;
const json = (f) => JSON.parse(readFileSync(f, "utf8"));
const r = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

const results = [];
const check = (name, status, detail) => results.push({ name, status, detail });

// ---- Files -----------------------------------------------------------------------------------
const timing = json(`${dir}/timing.json`);
const captions = json(`${dir}/captions.json`);
const scenesFile = json(`${dir}/scenes.json`);
const scriptLines = readFileSync(`${dir}/script.txt`, "utf8").split(/\r?\n/);
if (!existsSync(video)) {
  console.error(`Render not found: ${video}`);
  process.exit(2);
}

// ---- 1. Voice vs video, render format --------------------------------------------------------
const probe = (args) => execFileSync("ffprobe", ["-v", "error", ...args], { encoding: "utf8" });
const vInfo = JSON.parse(probe(["-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,duration,nb_frames", "-of", "json", video])).streams[0];
const aInfo = JSON.parse(probe(["-select_streams", "a", "-show_entries", "stream=codec_name,duration", "-of", "json", video])).streams;
const voiceSec = parseFloat(probe(["-show_entries", "format=duration", "-of", "default=nw=1:nk=1", `${dir}/voice/voice.wav`]));
const videoSec = parseFloat(vInfo.duration);
const lastEnd = timing[timing.length - 1].end;
check("voice <= video <= 90 s", voiceSec <= videoSec + 0.01 && videoSec <= 90 ? "PASS" : "FAIL", `voice ${r(voiceSec)} s, video ${r(videoSec)} s`);
const [num, den] = vInfo.r_frame_rate.split("/").map(Number);
check("render 1080x1920, 30 fps, audio track", vInfo.width === 1080 && vInfo.height === 1920 && num / den === FPS && aInfo.length > 0 ? "PASS" : "FAIL", `${vInfo.width}x${vInfo.height}, ${r(num / den)} fps, audio streams: ${aInfo.length} (${aInfo[0]?.codec_name})`);
check("last spoken line ends before video ends", lastEnd < videoSec ? "PASS" : "FAIL", `last line ends ${r(lastEnd)} s, tail after voice ${r(videoSec - lastEnd)} s`);

// ---- 2. Scenes: coverage and contiguity ------------------------------------------------------
const lineOf = (n) => timing.find((t) => t.line === n);
const scenes = scenesFile.scenes;
const starts = scenes.map((s, i) => {
  if (i === 0) return 0;
  if (scenes[i - 1].background === "intro") return INTRO_END;
  return lineOf(s.lines[0]).start;
});
const ranges = scenes.map((s, i) => ({ id: s.id, background: s.background, from: starts[i], to: i + 1 < scenes.length ? starts[i + 1] : videoSec }));
const timedLines = timing.map((t) => t.line);
const usage = {};
for (const s of scenes) for (const n of s.lines) usage[n] = (usage[n] || 0) + 1;
const uncovered = timedLines.filter((n) => !usage[n]);
const doubled = Object.keys(usage).filter((n) => usage[n] > 1);
const unknown = Object.keys(usage).filter((n) => !lineOf(Number(n)));
check("every timed script line in exactly one scene", !uncovered.length && !doubled.length && !unknown.length ? "PASS" : "FAIL", `uncovered: [${uncovered}], used twice: [${doubled}], not in timing.json: [${unknown}]`);
const gaps = ranges.slice(1).map((x, i) => r(x.from - ranges[i].to));
check("scenes contiguous (no gap/overlap > 0.2 s)", gaps.every((g) => Math.abs(g) <= 0.2) ? "PASS" : "FAIL", `gaps between scene ranges: [${gaps}] (scenes are built back to back from timing.json)`);
// A scene's lines should be spoken inside its time range. Lines that start earlier are shown over the previous scene.
const early = [];
scenes.forEach((s, i) => {
  if (s.background === "intro") return;
  for (const n of s.lines) {
    const l = lineOf(n);
    if (l && l.start < ranges[i].from - 0.05) early.push(`line ${n} starts ${r(l.start)} s, scene ${s.id} starts ${r(ranges[i].from)} s`);
    if (l && l.end > ranges[i].to + 0.05) early.push(`line ${n} ends ${r(l.end)} s, scene ${s.id} ends ${r(ranges[i].to)} s`);
  }
});
check("lines spoken inside their own scene", early.length ? "WARN" : "PASS", early.join("; ") || "all lines inside their scene");
const durs = ranges.map((x) => x.to - x.from);
const long = ranges.filter((x, i) => durs[i] > 8).map((x) => `${x.id} ${r(x.to - x.from, 1)} s`);
const contentDurs = ranges.filter((x) => x.background !== "intro" && x.background !== "vote").map((x) => x.to - x.from);
check("no scene over 8 s", long.length ? "WARN" : "PASS", long.join(", ") || "none");

// ---- 3. Speaking rate and sentences ---------------------------------------------------------
const words = (t) => t.trim().split(/\s+/).filter(Boolean);
const rates = timing.map((t) => ({ line: t.line, wps: r(words(t.text).length / (t.end - t.start)) }));
const totalWords = timing.reduce((a, t) => a + words(t.text).length, 0);
const speakingSec = timing.reduce((a, t) => a + (t.end - t.start), 0);
const outRate = rates.filter((x) => x.wps < 1.9 || x.wps > 3.2);
check("average speaking rate 1.9-3.2 words/s", totalWords / speakingSec >= 1.9 && totalWords / speakingSec <= 3.2 ? "PASS" : "FAIL", `${r(totalWords / speakingSec)} words/s over ${r(speakingSec, 1)} s of speech (${totalWords} words)`);
check("lines outside 1.9-3.2 words/s", outRate.length ? "WARN" : "PASS", outRate.map((x) => `line ${x.line}: ${x.wps}`).join(", ") || "none");
const sentences = timing.flatMap((t) => t.text.split(/(?<=[.!?])\s+/).map((s) => ({ line: t.line, text: s, words: words(s).length })));
const longest = sentences.reduce((a, b) => (b.words > a.words ? b : a));
check("longest sentence <= 18 words", longest.words <= 18 ? "PASS" : "WARN", `${longest.words} words (line ${longest.line}): "${longest.text}"`);

// ---- 4. Captions ------------------------------------------------------------------------------
const scriptWordCount = scriptLines.reduce((a, l) => a + words(l).length, 0);
const capEnd = Math.max(...captions.map((c) => c.endMs)) / 1000;
const capStart = Math.min(...captions.map((c) => c.startMs)) / 1000;
check("captions inside audio length", capStart >= 0 && capEnd <= voiceSec ? "PASS" : "FAIL", `first word ${r(capStart)} s, last word ends ${r(capEnd)} s, voice ${r(voiceSec)} s`);
const diff = Math.abs(captions.length - scriptWordCount) / scriptWordCount;
check("caption word count within 5% of script", diff <= 0.05 ? "PASS" : "FAIL", `${captions.length} caption words vs ${scriptWordCount} script words (${r(diff * 100, 1)} %)`);
// Planned pauses: a gap that sits at a line boundary where the script has an empty line (or any line boundary > 0.2 s is normal, only > 1 s counts).
const emptyAfter = new Set();
scriptLines.forEach((l, i) => {
  if (l.trim() === "") {
    let p = i - 1;
    while (p >= 0 && scriptLines[p].trim() === "") p--;
    if (p >= 0) emptyAfter.add(p + 1); // line number before the empty block
  }
});
const unplanned = [];
const planned = [];
for (let i = 1; i < captions.length; i++) {
  const gap = (captions[i].startMs - captions[i - 1].endMs) / 1000;
  if (gap > 1) {
    const t = captions[i - 1].endMs / 1000;
    const before = [...timing].reverse().find((x) => x.end <= t + 0.05);
    const isPlanned = before && emptyAfter.has(before.line);
    (isPlanned ? planned : unplanned).push(`${r(t)}-${r(captions[i].startMs / 1000)} s (${r(gap)} s gap after "${captions[i - 1].text.trim()}")`);
  }
}
check("no caption gap > 1 s except planned pauses", unplanned.length ? "FAIL" : "PASS", `unplanned: [${unplanned.join("; ")}]; planned: [${planned.join("; ")}]`);
// Gap between the spoken lines (pause before the choice and similar).
const pauseBefore = (n) => {
  const i = timing.findIndex((t) => t.line === n);
  return i > 0 ? r(timing[i].start - timing[i - 1].end) : null;
};

// ---- Output ----------------------------------------------------------------------------------
const metrics = {
  episode,
  version,
  videoSeconds: r(videoSec),
  voiceSeconds: r(voiceSec),
  frames: Number(vInfo.nb_frames),
  sceneCount: scenes.length,
  sceneSeconds: { min: r(Math.min(...durs)), avg: r(durs.reduce((a, b) => a + b, 0) / durs.length), max: r(Math.max(...durs)), contentOnlyMax: r(Math.max(...contentDurs)) },
  scenes: ranges.map((x) => ({ id: x.id, from: r(x.from), to: r(x.to), seconds: r(x.to - x.from) })),
  wordsPerSecond: { average: r(totalWords / speakingSec), perLine: rates },
  words: { script: scriptWordCount, captions: captions.length },
  pausesBeforeLines: Object.fromEntries([4, 19, 28, 29, 30].map((n) => [n, pauseBefore(n)])),
};
console.log(JSON.stringify(metrics, null, 2));
console.log("");
for (const c of results) console.log(`${c.status.padEnd(4)}  ${c.name} -- ${c.detail}`);
const failed = results.filter((c) => c.status === "FAIL").length;
console.log(`\n${results.length - failed} of ${results.length} checks without FAIL (${results.filter((c) => c.status === "WARN").length} warnings)`);
process.exit(failed ? 1 : 0);
