// Makes the allowed sound effects ourselves with ffmpeg's tone generator (no recordings, no
// licenses needed). Writes episodes/_assets/sfx/<name>.wav; names match the [SFX: name] cues with
// spaces turned into dashes ("slapstick hit" -> slapstick-hit.wav).
// Usage: node scripts/make-sfx.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join("episodes", "_assets", "sfx");
fs.mkdirSync(OUT, { recursive: true });

// Each effect: a formula for the sound wave over time t (seconds) and its length d.
// ffmpeg formulas use lt(a,b) / gte(a,b) instead of < and >=.
const EFFECTS = {
  bleep: { expr: "0.35*sin(2*PI*1000*t)", d: 1.5 },
  "slapstick-hit": {
    expr: "0.9*sin(2*PI*(150-90*t)*t)*exp(-14*t)+0.5*(random(0)*2-1)*exp(-30*t)",
    d: 0.35,
  },
  buzzer: { expr: "0.3*(sgn(sin(2*PI*130*t))+sgn(sin(2*PI*137*t)))*lt(t,0.75)", d: 0.8 },
  "angel-choir": {
    expr: "0.12*(sin(2*PI*523.25*t)+sin(2*PI*659.25*t)+sin(2*PI*783.99*t)+0.6*sin(2*PI*1046.5*t))*(1+0.15*sin(2*PI*5*t))*min(1,t/0.35)*min(1,(2.2-t)/0.6)",
    d: 2.2,
  },
  "record-scratch": {
    expr: "0.6*sin(2*PI*(900*t-1400*t*t))*lt(t,0.18)+0.6*sin(2*PI*(300*t+2600*(t-0.18)*(t-0.18)))*gte(t,0.18)*lt(t,0.42)+0.25*(random(0)*2-1)*lt(t,0.42)",
    d: 0.45,
  },
  "portal-hum": {
    expr: "0.3*(sin(2*PI*60*t)+0.6*sin(2*PI*120*t)+0.4*sin(2*PI*183*t))*(1+0.3*sin(2*PI*7*t))*min(1,t/0.3)*min(1,(2.6-t)/0.5)",
    d: 2.6,
  },
  "warning-siren": { expr: "0.28*sin(2*PI*900*t-(300/1.5)*cos(2*PI*1.5*t))*min(1,(2.0-t)/0.3)", d: 2.0 },
  rewind: { expr: "0.35*sin(2*PI*(1800*t-700*t*t))*(1+0.5*sin(2*PI*28*t))*min(1,(1.0-t)/0.2)", d: 1.0 },
};

for (const [name, { expr, d }] of Object.entries(EFFECTS)) {
  const file = path.join(OUT, `${name}.wav`);
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `aevalsrc=exprs='${expr}':s=44100:d=${d}`, "-af", "alimiter=limit=0.9", file],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(`${name}: ffmpeg failed\n${r.stderr}`);
    process.exit(1);
  }
  console.log(`made ${file}`);
}
