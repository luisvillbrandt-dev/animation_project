// Automated checks for one rendered episode. Usage: node scripts/check-episode.mjs <episode-id> <version>
// Example: node scripts/check-episode.mjs ep01-pompeii-part1 v1
// Prints metrics as JSON plus PASS / FAIL / WARN per check. Plain Node.js, no dependencies.
// Weekly-show episodes (scenes.json has a "hud" block) get 85 s max plus extra checks: beat windows of the
// MSV1 template, fact IDs against notes/library/*.json, bleeps, sound effects, loop text, retention moments.
// Needs ffmpeg on PATH; the render's audio is decoded into out/review/<id>-<version>/ for level checks.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";

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
const weekly = Boolean(scenesFile.hud); // weekly show (MSV1 template): 85 s max, extra checks below
const MAX_SEC = weekly ? 85 : 90;
// Markup in weekly scripts: {f:id} fact tags, [[word]] bleeps, [SFX: name] lines (not spoken).
const isSfxLine = (l) => /^\s*\[SFX:/i.test(l);
const spokenText = (l) => (isSfxLine(l) ? "" : l.replace(/\{f:[^}]*\}/g, "").replace(/\[\[|\]\]/g, "").trim());
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
if (weekly) {
  // voice.wav ends with a silent tail (voice.config.json "tail"); the video may cut inside it.
  check(`last spoken word <= video <= ${MAX_SEC} s`, lastEnd <= videoSec && videoSec <= MAX_SEC ? "PASS" : "FAIL", `last word ends ${r(lastEnd)} s, video ${r(videoSec)} s, voice.wav ${r(voiceSec)} s (silent tail ${r(voiceSec - lastEnd)} s)`);
  check("video length near the 80 s target (75-82 s)", videoSec >= 75 && videoSec <= 82 ? "PASS" : "WARN", `${r(videoSec)} s`);
} else {
  check("voice <= video <= 90 s", voiceSec <= videoSec + 0.01 && videoSec <= 90 ? "PASS" : "FAIL", `voice ${r(voiceSec)} s, video ${r(videoSec)} s`);
}
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
const scriptWordCount = scriptLines.reduce((a, l) => a + words(spokenText(l)).length, 0);
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

// ---- Weekly show (MSV1 template) checks ---------------------------------------------------------
const weeklyInfo = {};
if (weekly) {
  const BEATS = [[0, 4], [4, 9], [9, 13], [13, 18], [18, 23], [23, 29], [29, 35], [35, 40], [40, 45], [45, 52], [52, 58], [58, 65], [65, 69], [69, 74], [74, 77], [77, 80]]; // notes/msv1-template.md
  const ALLOWED_SFX = ["rewind", "angel choir", "buzzer", "record scratch", "portal hum", "warning siren", "slapstick hit"];
  const textLines = scriptLines.map((text, i) => ({ n: i + 1, text }));

  // -- Beat windows: scene ids start with bNN (beat number); the vote block covers beats 14-16.
  const beatTimes = {};
  for (const s of scenes) {
    const m = /^b(\d+)-/.exec(s.id);
    if (!m || s.background === "vote3") continue;
    const ls = s.lines.map(lineOf).filter(Boolean);
    beatTimes[Number(m[1])] = { start: Math.min(...ls.map((l) => l.start)), end: Math.max(...ls.map((l) => l.end)) };
  }
  const vs = scenes.find((s) => s.background === "vote3");
  if (vs) {
    const o = vs.vote3.options;
    beatTimes[14] = { start: lineOf(o[0].line).start, end: lineOf(o[1].line).end };
    beatTimes[15] = { start: lineOf(o[2].line).start, end: lineOf(vs.vote3.kickLine ?? o[2].line).end };
    beatTimes[16] = { start: lineOf(vs.vote3.pleadLine).start, end: lineOf(vs.vote3.pleadLine).end };
  }
  const beatRows = BEATS.map(([a, b], i) => {
    const t = beatTimes[i + 1];
    return t ? { beat: i + 1, window: `${a}-${b}`, spoken: `${r(t.start, 1)}-${r(t.end, 1)}`, dStart: r(t.start - a, 1), dEnd: r(t.end - b, 1) } : { beat: i + 1, window: `${a}-${b}`, spoken: "no scene" };
  });
  const missingBeats = beatRows.filter((x) => x.spoken === "no scene").map((x) => x.beat);
  const offBeats = beatRows.filter((x) => x.dStart !== undefined && (Math.abs(x.dStart) > 2 || Math.abs(x.dEnd) > 2));
  check("all 16 beats present", missingBeats.length ? "FAIL" : "PASS", missingBeats.length ? `beats without a scene: [${missingBeats}]` : "16 of 16");
  check("each beat inside its template window (+-2 s)", offBeats.length ? "WARN" : "PASS", offBeats.map((x) => `beat ${x.beat} window ${x.window} spoken ${x.spoken}`).join("; ") || "all within 2 s");

  // -- Fact IDs against the library
  const libDir = "notes/library";
  const facts = {};
  for (const f of existsSync(libDir) ? readdirSync(libDir).filter((x) => x.endsWith(".json")) : []) for (const x of json(`${libDir}/${f}`).facts ?? []) facts[x.id] = x;
  const used = [];
  const unknownIds = [];
  const untaggedFacts = [];
  const NUMBER_WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|percent)\b|\d/i;
  for (const { n, text } of textLines) {
    if (isSfxLine(text)) continue;
    const tags = [...text.matchAll(/\{f:([^}]*)\}/g)].map((m) => m[1].trim());
    for (const id of tags) (facts[id] ? used : unknownIds).push(id);
    const body = spokenText(text);
    if (body && !tags.length && NUMBER_WORDS.test(body)) untaggedFacts.push(`line ${n}: "${body}"`);
  }
  const usedUnique = [...new Set(used)];
  check("every fact tag exists in the library", unknownIds.length ? "FAIL" : "PASS", unknownIds.length ? `unknown IDs: ${unknownIds}` : `${usedUnique.length} IDs used: ${usedUnique.map((id) => `${id} (${facts[id].confidence})`).join(", ")}`);
  check("no number in a line without a fact tag", untaggedFacts.length ? "FAIL" : "PASS", untaggedFacts.join("; ") || "none");
  const weakFacts = usedUnique.filter((id) => facts[id].confidence === "disputed");
  check("disputed facts need a hedge", weakFacts.length ? "WARN" : "PASS", weakFacts.length ? `disputed IDs used: ${weakFacts}` : "no disputed fact used");
  weeklyInfo.factsUsed = usedUnique;

  // -- Bleeps: markup vs captions vs timing
  const bleepWords = textLines.flatMap(({ n, text }) => (isSfxLine(text) ? [] : [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => ({ n, word: m[1] }))));
  const bleepCaps = captions.filter((c) => c.bleep);
  const unmasked = bleepCaps.filter((c) => !/\*/.test(c.text) || /[a-z]/i.test(c.text.trim().replace(/^[^a-z]*[a-z]/i, "")));
  const leaked = bleepWords.filter((b) => captions.some((c) => !c.bleep && c.text.trim().replace(/[^a-z]/gi, "").toLowerCase() === b.word.toLowerCase()));
  check("bleep markers == bleeped captions", bleepWords.length === bleepCaps.length ? "PASS" : "FAIL", `[[ ]] in script: ${bleepWords.length}, captions with bleep:true: ${bleepCaps.length}`);
  check("bleeped captions are masked (no letters after the first)", unmasked.length || leaked.length ? "FAIL" : "PASS", unmasked.length ? `not masked: ${unmasked.map((c) => c.text)}` : leaked.length ? `plain word still in captions: ${leaked.map((b) => b.word)}` : bleepCaps.map((c) => c.text.trim()).join(", "));
  const BAD = /\b(fuck\w*|bitch\w*|cunt\w*|dick\w*|bastard\w*|motherf\w*|whore\w*|slut\w*|piss\w*|cock\w*)\b/i;
  const spokenOutside = textLines.filter(({ text }) => !isSfxLine(text) && BAD.test(text.replace(/\[\[[^\]]*\]\]/g, "").replace(/\{f:[^}]*\}/g, "")));
  check("strong words only inside [[ ]]", spokenOutside.length ? "FAIL" : "PASS", spokenOutside.map((x) => `line ${x.n}: ${x.text}`).join("; ") || "none outside brackets (word list only: fuck, bitch, cunt, dick, bastard, whore, slut, piss, cock; slurs: read the script yourself)");

  // Decode the render and voice.wav to 16 kHz mono so levels can be compared.
  const sr = 16000;
  const tmp = `out/review/${episode}-${version}`;
  mkdirSync(tmp, { recursive: true });
  const decode = (src, dst) => {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-ac", "1", "-ar", String(sr), "-c:a", "pcm_s16le", dst]);
    const b = readFileSync(dst);
    const a = new Float32Array((b.length - 44) / 2);
    for (let i = 0; i < a.length; i++) a[i] = b.readInt16LE(44 + 2 * i) / 32768;
    return a;
  };
  const R = decode(video, `${tmp}/render-audio.wav`);
  const V = decode(`${dir}/voice/voice.wav`, `${tmp}/voice-16k.wav`);
  const rmsDb = (a, s, e) => {
    s = Math.max(0, Math.round(s * sr));
    e = Math.min(a.length, Math.round(e * sr));
    let t = 0;
    for (let i = s; i < e; i++) t += a[i] * a[i];
    return 20 * Math.log10(Math.sqrt(t / Math.max(1, e - s)) + 1e-9);
  };
  // Does each bleep sit inside its own line, and does the voice before it (in the same line) stay audible?
  const bleepRows = bleepCaps.map((c) => {
    const s = c.startMs / 1000, e = c.endMs / 1000;
    const line = timing.find((t) => s >= t.start - 0.05 && s <= t.end);
    const leakDb = line && s - line.start > 0.03 ? rmsDb(V, line.start, s) : null;
    return { word: c.text.trim(), start: r(s, 3), end: r(e, 3), length: r(e - s), line: line?.line, secondsBeforeBleepInLine: line ? r(s - line.start, 2) : null, voiceBeforeBleepDb: leakDb === null ? null : r(leakDb, 1), voiceInsideBleepDb: r(rmsDb(V, s, e), 1), renderInsideBleepDb: r(rmsDb(R, s, e), 1) };
  });
  const outside = bleepRows.filter((b) => !b.line);
  check("bleep sits inside a spoken line, 0.25 s or longer", outside.length || bleepRows.some((b) => b.length < 0.25) ? "WARN" : "PASS", bleepRows.map((b) => `${b.word} ${b.start}-${b.end} (${b.length} s, line ${b.line})`).join("; "));
  const leaks = bleepRows.filter((b) => b.voiceBeforeBleepDb !== null && b.voiceBeforeBleepDb > -35);
  check("no unmuted voice before a bleep starts (start of the word leaks)", leaks.length ? "WARN" : "PASS", leaks.map((b) => `${b.word}: the ${b.secondsBeforeBleepInLine} s of the line before the bleep carry voice at ${b.voiceBeforeBleepDb} dB (speech is about -25 dB)`).join("; ") || "voice before each bleep is silent or below -35 dB");
  weeklyInfo.bleeps = bleepRows;

  // -- Sound effects
  const scriptSfx = textLines.filter(({ text }) => isSfxLine(text)).map(({ n, text }) => ({ n, name: /\[SFX:\s*([^\]]+)\]/i.exec(text)[1].trim().toLowerCase() }));
  const cues = existsSync(`${dir}/cues.json`) ? json(`${dir}/cues.json`).sfx : [];
  const sameList = scriptSfx.length === cues.length && scriptSfx.every((s, i) => s.name === cues[i].name.toLowerCase());
  check("cues.json matches the [SFX:] lines in script.txt (order and names)", sameList ? "PASS" : "FAIL", `script: ${scriptSfx.length} SFX lines, cues.json: ${cues.length} cues`);
  const notAllowed = [...new Set(cues.map((c) => c.name.toLowerCase()).filter((n) => !ALLOWED_SFX.includes(n)))];
  check("sound effects only from the MSV1 list", notAllowed.length ? "FAIL" : "PASS", notAllowed.length ? `not in the list: ${notAllowed}` : `used: ${[...new Set(cues.map((c) => c.name))].join(", ")}`);
  const licenses = existsSync("notes/sfx-licenses.md") ? readFileSync("notes/sfx-licenses.md", "utf8") : "";
  const sfxFile = (n) => `${n.toLowerCase().replace(/\s+/g, "-")}.wav`;
  const noFile = [...new Set(cues.map((c) => sfxFile(c.name)).concat("bleep.wav"))].filter((f) => !existsSync(`episodes/_assets/sfx/${f}`) || !licenses.includes(f));
  check("every effect file exists and is listed in notes/sfx-licenses.md", noFile.length ? "FAIL" : "PASS", noFile.length ? `missing file or license line: ${noFile}` : "all listed (self-made)");
  const srcText = readFileSync("src/Episode.tsx", "utf8");
  const sfxVol = Number(/SFX_VOLUME\s*=\s*([\d.]+)/.exec(srcText)?.[1] ?? NaN);
  const bleepVol = Number(/BLEEP_VOLUME\s*=\s*([\d.]+)/.exec(srcText)?.[1] ?? NaN);
  const dur = (f) => parseFloat(probe(["-show_entries", "format=duration", "-of", "default=nw=1:nk=1", `episodes/_assets/sfx/${f}`]));
  const cueRows = cues.map((c) => {
    const d = dur(sfxFile(c.name));
    const over = timing.filter((t) => t.start < c.at + d && t.end > c.at).map((t) => ({ line: t.line, overlap: r(Math.min(t.end, c.at + d) - Math.max(t.start, c.at)) })).filter((x) => x.overlap > 0.05);
    const nextLine = timing.find((t) => t.start >= c.at - 0.01);
    const prevLine = [...timing].reverse().find((t) => t.end <= c.at + 0.01);
    return { name: c.name, at: c.at, length: r(d), endsAt: r(c.at + d), overVoiceOfLines: over, secondsBeforeNextLine: nextLine ? r(nextLine.start - c.at) : null, secondsAfterPrevLine: prevLine ? r(c.at - prevLine.end) : null };
  });
  const loose = cueRows.filter((c) => !((c.secondsBeforeNextLine !== null && c.secondsBeforeNextLine <= 0.6) || (c.secondsAfterPrevLine !== null && c.secondsAfterPrevLine <= 0.2)));
  check("each effect sits next to a spoken line (<= 0.6 s before / 0.2 s after)", loose.length ? "WARN" : "PASS", loose.map((c) => `${c.name} at ${c.at}`).join("; ") || "all cues are tied to a line");
  // Level per spoken line: render level minus voice-only level, minus the usual offset of the whole mix.
  const deltas = timing.map((t) => ({ line: t.line, d: rmsDb(R, t.start, t.end) - rmsDb(V, t.start, t.end) }));
  const sorted = deltas.map((x) => x.d).sort((a, b) => a - b);
  const base = sorted[Math.floor(sorted.length / 2)];
  const bleepLines = new Set(bleepRows.map((b) => b.line));
  const loud = deltas.filter((x) => !bleepLines.has(x.line) && x.d - base >= 3).map((x) => ({ line: x.line, text: timing.find((t) => t.line === x.line).text, aboveVoiceDb: r(x.d - base, 1) }));
  check("effects do not drown the voice (line level in render vs voice.wav < +3 dB)", loud.length ? "WARN" : "PASS", loud.map((x) => `line ${x.line} +${x.aboveVoiceDb} dB: "${x.text}"`).join("; ") || "no line is raised by 3 dB or more");
  weeklyInfo.sfx = { sfxVolume: sfxVol, bleepVolume: bleepVol, cues: cueRows, voiceOffsetInRenderDb: r(base, 1) };

  // -- Loop: the first line must continue the last one
  const spoken = timing.map((t) => t.text);
  const first = spoken[0], last = spoken[spoken.length - 1];
  const loopOk = /^[a-z]/.test(first) && /[—-]$/.test(last.trim());
  check("loop: last line cut off (em dash), first line starts lower-case", loopOk ? "PASS" : "FAIL", `"${last}" -> "${first}" ${spoken[1]}`);
  const lastCap = captions[captions.length - 1].text.trim();
  check("loop: video ends within 0.6 s of the last word", videoSec - lastEnd <= 0.6 && videoSec - lastEnd >= 0 ? "PASS" : "WARN", `${r(videoSec - lastEnd)} s after "${lastCap}"; first word starts ${r(captions[0].startMs / 1000)} s after loop start`);

  // -- Retention moments
  const at = (t) => {
    const l = timing.find((x) => t >= x.start && t <= x.end) ?? null;
    const near = ranges.map((x) => x.from).filter((s) => Math.abs(s - t) <= 1.5);
    const sfxNear = cues.filter((c) => Math.abs(c.at - t) <= 1.5).map((c) => c.name);
    return { t, speaking: l ? `line ${l.line}: "${l.text}"` : "pause", sceneChangeWithin1_5s: near.map((x) => r(x, 1)), sfxWithin1_5s: sfxNear };
  };
  weeklyInfo.retention = [3, 20, 40, 65].map(at);
  const dead = weeklyInfo.retention.filter((x) => !x.sceneChangeWithin1_5s.length && !x.sfxWithin1_5s.length);
  check("a scene change or effect near each retention moment (3, 20, 40, 65 s)", dead.length ? "WARN" : "PASS", dead.map((x) => `${x.t} s: nothing within 1.5 s`).join("; ") || "all four have a change within 1.5 s");

  // -- HUD stays under the top 10 %
  const hudSrc = existsSync("src/components/Hud.tsx") ? readFileSync("src/components/Hud.tsx", "utf8") : "";
  const hudTop = /top:\s*SAFE_TOP\s*\+\s*(\d+)/.exec(hudSrc);
  check("HUD starts below the top 10 % (SAFE_TOP)", hudTop && Number(hudTop[1]) >= 0 ? "PASS" : "WARN", hudTop ? `top = SAFE_TOP + ${hudTop[1]} px = ${192 + Number(hudTop[1])} px` : "could not read Hud.tsx");
  weeklyInfo.beats = beatRows;
}

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
  weekly: weekly ? weeklyInfo : undefined,
  pausesBeforeLines: Object.fromEntries((weekly ? timing.map((t) => t.line) : [4, 19, 28, 29, 30]).map((n) => [n, pauseBefore(n)])),
};
console.log(JSON.stringify(metrics, null, 2));
console.log("");
for (const c of results) console.log(`${c.status.padEnd(4)}  ${c.name} -- ${c.detail}`);
const failed = results.filter((c) => c.status === "FAIL").length;
console.log(`\n${results.length - failed} of ${results.length} checks without FAIL (${results.filter((c) => c.status === "WARN").length} warnings)`);
process.exit(failed ? 1 : 0);
