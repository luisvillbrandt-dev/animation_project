// Checkpoints: named snapshots of the whole project you can always go back to.
//
//   npm run checkpoint -- "short description"   save everything, name it stand-<date>-<time>, upload
//   npm run checkpoints                         list all checkpoints, newest first
//
// A checkpoint is a git commit plus a tag, pushed to GitHub, so it survives even if this computer
// breaks. Not included (too big or regenerated): node_modules, .venv, .whisper, rendered videos in
// out/ and generated audio in episodes/*/voice/ (rerun the voice step to get the audio back).
// Going back never deletes anything: the old state is restored as a new commit on top.
import { spawnSync } from "node:child_process";

const git = (args, { quiet = false } = {}) => {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0 && !quiet) {
    console.error(`git ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
    process.exit(1);
  }
  return (r.stdout || "").trim();
};

if (process.argv[2] === "--list") {
  const list = git(["tag", "--list", "stand-*", "--sort=-creatordate", "--format=%(refname:short)  %(contents:subject)"]);
  console.log(list || "No checkpoints yet. Create one with: npm run checkpoint -- \"description\"");
  process.exit(0);
}

const label = process.argv.slice(2).join(" ").trim() || "Zwischenstand";
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
let tag = `stand-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
if (git(["tag", "--list", tag])) tag += `-${pad(now.getSeconds())}`;

// 1. Commit everything that is not ignored (only if something changed).
git(["add", "-A"]);
const changed = git(["status", "--porcelain"]);
if (changed) {
  git(["commit", "-q", "-m", `Checkpoint: ${label}`]);
  console.log(`Saved changes:\n${changed}`);
} else {
  console.log("No new changes; the checkpoint marks the current state.");
}

// 2. Name it.
git(["tag", "-a", tag, "-m", label]);

// 3. Upload commits and the checkpoint to GitHub.
const push = spawnSync("git", ["push", "--quiet", "--follow-tags"], { encoding: "utf8" });
if (push.status !== 0) {
  console.error(`Checkpoint ${tag} is saved on this computer, but the upload to GitHub failed:\n${push.stderr}`);
  console.error("Try again later with: git push --follow-tags");
  process.exit(1);
}
console.log(`Checkpoint ${tag} saved and uploaded: ${label}`);
