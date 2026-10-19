// Render step: renders an episode to out/<episode-id>-vN.mp4, always with the next free N,
// so an older version is never overwritten.
// Usage: npm run render -- <episode-id>
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const episode = process.argv[2];
if (!episode) {
  console.error("Usage: npm run render -- <episode-id>");
  process.exit(1);
}
for (const file of ["scenes.json", "timing.json", "captions.json", "voice/voice.wav"]) {
  if (!fs.existsSync(path.join("episodes", episode, file))) {
    console.error(`Missing episodes/${episode}/${file}. Run the voice and caption steps first.`);
    process.exit(1);
  }
}

fs.mkdirSync("out", { recursive: true });
const versions = fs
  .readdirSync("out")
  .map((f) => f.match(new RegExp(`^${episode}-v(\\d+)\\.mp4$`)))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const next = (versions.length ? Math.max(...versions) : 0) + 1;
const output = path.join("out", `${episode}-v${next}.mp4`);

// Props go through a small file, so no quoting problems on Windows.
const propsFile = path.join(os.tmpdir(), `remotion-props-${episode}.json`);
fs.writeFileSync(propsFile, JSON.stringify({ episode }));

console.log(`Rendering ${episode} -> ${output}`);
const result = spawnSync("npx", ["remotion", "render", "Episode", output, `--props=${propsFile}`], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
