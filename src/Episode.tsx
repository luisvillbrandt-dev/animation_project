// A full episode: reads scenes.json, timing.json, captions.json (and cues.json if present) of one
// episode folder and plays the scenes in sync with voice.wav. Scene timing always comes from
// timing.json: a scene starts with its first line and lasts until the next scene starts.
// Sound: the voice, sound-effect cues from cues.json, and a bleep over every [[word]] (the voice is
// muted there). Optional HUD (DAY X/7, SURVIVAL meter) for the weekly show.
import type { Caption } from "@remotion/captions";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Easing,
  Freeze,
  Html5Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Tony } from "./characters/Tony";
import { Bakery } from "./components/backgrounds/Bakery";
import { CityGate } from "./components/backgrounds/CityGate";
import { RoofDiagram } from "./components/backgrounds/RoofDiagram";
import { Room } from "./components/backgrounds/Room";
import { INK, STAGES, Stage, StreetVesuvius } from "./components/backgrounds/StreetVesuvius";
import { Captions } from "./components/Captions";
import { Cart } from "./components/Cart";
import { Hud } from "./components/Hud";
import { Accessory, Expression, Pose, Stickman } from "./components/Stickman";
import { VoteCard, VoteOption } from "./components/VoteCard";
import { Vote3Option, VoteCard3 } from "./components/VoteCard3";
import { INTRO_FRAMES, Intro } from "./Intro";
import { FPS, HEIGHT, SAFE_TOP, WIDTH } from "./video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const VOTE_HOLD = 3; // default seconds after the last word (the old A/B vote card stays on screen)
const VOICE_TAIL = 0.6; // silence at the end of voice.wav (voice.config.json "tail")
const SFX_VOLUME = 0.7;
const BLEEP_VOLUME = 0.55;

// ---- The shape of scenes.json -------------------------------------------------------------

export type Line = { line: number; text: string; start: number; end: number };

type CharacterSpec = {
  name: "tony" | "wife" | "daughter" | "neighbor";
  pose: Pose;
  expression?: Expression;
  x: number; // 0..1 of the frame width
  toX?: number; // walks/runs to this x during the scene
  y?: number; // feet, in px (default: the floor at 1440)
  scale?: number;
  facing?: "left" | "right";
  extra?: Accessory[]; // e.g. ["pillow"]
  seed?: number;
  changes?: { line: number; pose?: Pose; expression?: Expression }[]; // from this line on
};

type PropSpec = { type: "cart"; x: number; toX?: number; y?: number; scale?: number; facing?: "left" | "right" };

type Effect =
  | { type: "shake"; line: number; strength?: number } // the camera shakes while this line is spoken
  | { type: "eruption"; line: number; to?: number } // the ash column grows from this line (to = final size, default 1)
  | { type: "beamCreak"; line: number } // the roof beam tilts and drops dust
  | { type: "tag" } // "PLACE · YEAR" label fading out (continues the intro's label)
  | { type: "hit"; line: number; x?: number; y?: number } // slapstick hit: comic star + short shake at the line start
  | { type: "tap"; line: number; x?: number; y?: number } // Tony taps the phone glass from inside: ripples
  | { type: "freeze"; line: number } // everything freezes at the line start, blue glitch
  | { type: "redAlert"; line: number }; // red pulsing alarm light from the line start

export type SceneSpec = {
  id: string;
  lines: number[];
  background: "intro" | "street" | "bakery" | "gate" | "room" | "vote" | "diagram" | "vote3";
  stage?: Stage;
  characters?: CharacterSpec[];
  props?: PropSpec[];
  camera?: { zoomFrom?: number; zoomTo?: number; focusX?: number; focusY?: number; rotate?: number };
  effects?: Effect[];
  plume?: number; // street: size of the ash column 0..1
  pumice?: boolean; // street: falling stones on/off
  pile?: number; // room: pumice height outside the window 0..1
  diagram?: { from: number; to: number }; // diagram: how far the pumice layer grows during the scene
  vote?: [VoteOption & { line: number }, VoteOption & { line: number }];
  vote3?: { options: (Vote3Option & { line: number })[]; kickLine?: number; pleadLine?: number };
};

type HudSpec = { day: number; of: number; start: number; survival: { line: number; value: number }[] };

export type EpisodeFile = {
  episode: string;
  place: string;
  year: number;
  introStage: Stage;
  hud?: HudSpec;
  endHold?: number; // seconds after the last word (default 3; the weekly show ends right on the cut-off)
  scenes: SceneSpec[];
};

type Cues = { sfx: { name: string; at: number }[] };
type BleepCaption = Caption & { bleep?: boolean };

export type EpisodeProps = {
  episode: string;
  data: EpisodeFile | null;
  timing: Line[];
  captions: Caption[];
  cues?: Cues;
};

// ---- Loading ------------------------------------------------------------------------------

const load = <T,>(file: string) => fetch(staticFile(file)).then((r) => r.json() as Promise<T>);

export const loadEpisode: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const [data, timing, captions] = await Promise.all([
    load<EpisodeFile>(`${props.episode}/scenes.json`),
    load<Line[]>(`${props.episode}/timing.json`),
    load<Caption[]>(`${props.episode}/captions.json`),
  ]);
  const cues = await load<Cues>(`${props.episode}/cues.json`).catch(() => ({ sfx: [] }));
  const seconds = timing[timing.length - 1].end + (data.endHold === undefined ? VOICE_TAIL + VOTE_HOLD : data.endHold);
  return { props: { ...props, data, timing, captions, cues }, durationInFrames: Math.ceil(seconds * FPS) };
};

// ---- The episode --------------------------------------------------------------------------

export const Episode: React.FC<EpisodeProps> = ({ episode, data, timing, captions, cues }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  if (!data) return null;

  const lineOf = (n: number) => {
    const l = timing.find((t) => t.line === n);
    if (!l) throw new Error(`scenes.json uses line ${n}, but timing.json has no line ${n}`);
    return l;
  };

  // Scene ranges in frames. The scene after the intro starts when the intro is over.
  const starts = data.scenes.map((s, i) => {
    if (i === 0) return 0;
    if (data.scenes[i - 1].background === "intro") return INTRO_FRAMES;
    return Math.round(lineOf(s.lines[0]).start * fps);
  });
  const ranges = starts.map((from, i) => ({ from, to: i + 1 < starts.length ? starts[i + 1] : durationInFrames }));
  const current = ranges.findIndex((r) => frame >= r.from && frame < r.to);
  const currentBg = current === -1 ? null : data.scenes[current].background;
  const showCaptions = currentBg !== null && currentBg !== "vote";

  // Bleeps: the voice is muted while a [[word]] is spoken, a tone plays instead.
  const bleeps = (captions as BleepCaption[])
    .filter((c) => c.bleep)
    .map((c) => ({ from: Math.floor((c.startMs / 1000) * fps), to: Math.ceil((c.endMs / 1000) * fps) }));
  const voiceVolume = (f: number) => (bleeps.some((b) => f >= b.from && f < b.to) ? 0 : 1);

  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Html5Audio src={staticFile(`${episode}/voice/voice.wav`)} volume={voiceVolume} />
      {bleeps.map((b) => (
        <Sequence key={`bleep-${b.from}`} from={b.from} durationInFrames={Math.max(1, b.to - b.from)} layout="none">
          <Html5Audio src={staticFile("_assets/sfx/bleep.wav")} volume={BLEEP_VOLUME} />
        </Sequence>
      ))}
      {(cues?.sfx ?? []).map((c, i) => (
        <Sequence key={`sfx-${i}`} from={Math.round(c.at * fps)} layout="none">
          <Html5Audio src={staticFile(`_assets/sfx/${c.name.toLowerCase().replace(/\s+/g, "-")}.wav`)} volume={SFX_VOLUME} />
        </Sequence>
      ))}

      {data.scenes.map((scene, i) => (
        <Sequence key={scene.id} name={scene.id} from={ranges[i].from} durationInFrames={Math.max(1, ranges[i].to - ranges[i].from)}>
          <SceneView scene={scene} data={data} startFrame={ranges[i].from} frames={ranges[i].to - ranges[i].from} lineOf={lineOf} />
        </Sequence>
      ))}

      {data.hud && currentBg !== "intro" && (
        <Hud day={data.hud.day} of={data.hud.of} survival={survivalAt(data.hud, frame / fps, lineOf)} frame={frame} />
      )}
      {showCaptions && <Captions captions={captions} />}
    </AbsoluteFill>
  );
};

// The SURVIVAL value at time t: each keyframe counts down over half a second from its line on.
const survivalAt = (hud: HudSpec, t: number, lineOf: (n: number) => Line) => {
  let value = hud.start;
  for (const k of hud.survival) {
    const s = lineOf(k.line).start;
    if (t >= s) value = interpolate(t, [s, s + 0.5], [value, k.value], { extrapolateRight: "clamp" });
  }
  return value;
};

// ---- One scene ----------------------------------------------------------------------------

type SceneViewProps = {
  scene: SceneSpec;
  data: EpisodeFile;
  startFrame: number;
  frames: number;
  lineOf: (n: number) => Line;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// An 8-point comic star for slapstick hits.
const STAR = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8;
  const r = i % 2 ? 0.45 : 1;
  return `${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`;
}).join(" ");

const SceneView: React.FC<SceneViewProps> = ({ scene, data, startFrame, frames, lineOf }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (startFrame + frame) / fps; // seconds since the start of the episode
  const since = (n: number) => t - lineOf(n).start;
  const speaking = (n: number) => t >= lineOf(n).start && t < lineOf(n).end;
  const localFrameOf = (n: number) => Math.round(lineOf(n).start * fps) - startFrame;
  const stage = scene.stage ?? "day";
  const effects = scene.effects ?? [];

  if (scene.background === "intro") {
    return <Intro place={data.place} year={data.year} stage={data.introStage} audio={false} captions={false} />;
  }

  if (scene.background === "vote") {
    if (!scene.vote) throw new Error(`Scene ${scene.id} is a vote card but has no "vote" options`);
    const [a, b] = scene.vote;
    const active = speaking(a.line) ? "A" : speaking(b.line) ? "B" : "both";
    return <VoteCard options={[a, b]} active={active} />;
  }

  if (scene.background === "vote3") {
    if (!scene.vote3) throw new Error(`Scene ${scene.id} is a vote3 block but has no "vote3" options`);
    const v = scene.vote3;
    return (
      <VoteCard3
        options={v.options}
        shownAt={v.options.map((o) => localFrameOf(o.line))}
        active={v.options.findIndex((o) => speaking(o.line))}
        kickC={v.kickLine !== undefined && speaking(v.kickLine)}
        pleading={v.pleadLine !== undefined && since(v.pleadLine) >= 0}
      />
    );
  }

  // Camera: slow zoom toward a focus point, optional dutch angle, plus shakes.
  const cam = scene.camera ?? {};
  const zoom = interpolate(frame, [0, Math.max(1, frames)], [cam.zoomFrom ?? 1, cam.zoomTo ?? 1.08], clamp);
  const fx = (cam.focusX ?? 0.45) * WIDTH;
  const fy = (cam.focusY ?? 0.47) * HEIGHT;
  let shake = 0;
  for (const e of effects) {
    if (e.type === "shake" && speaking(e.line)) shake = Math.max(shake, 14 * (e.strength ?? 1));
    if (e.type === "eruption" && since(e.line) >= 0 && since(e.line) < 0.8) shake = Math.max(shake, 22 * (1 - since(e.line) / 0.8));
    if (e.type === "beamCreak" && since(e.line) >= 0 && since(e.line) < 1.2) shake = Math.max(shake, 18 * (1 - since(e.line) / 1.2));
    if (e.type === "hit" && since(e.line) >= 0 && since(e.line) < 0.4) shake = Math.max(shake, 24 * (1 - since(e.line) / 0.4));
  }
  const freeze = effects.find((e) => e.type === "freeze");
  const frozen = freeze !== undefined && since(freeze.line) >= 0;
  const glitchX = frozen && frame % 4 < 2 ? Math.sin(frame * 7.3) * 10 : 0;
  const sx = Math.sin(frame * 2.3) * shake + glitchX;
  const sy = Math.cos(frame * 2.9) * shake * 0.7;
  const camera = `translate(${sx} ${sy}) translate(${fx} ${fy}) rotate(${cam.rotate ?? 0}) scale(${zoom}) translate(${-fx} ${-fy})`;

  // Effect values for the backgrounds.
  const eruption = effects.find((e) => e.type === "eruption");
  const plume = eruption
    ? interpolate(since(eruption.line), [0, 2.5], [0, eruption.to ?? 1], { ...clamp, easing: Easing.out(Easing.cubic) })
    : scene.plume;
  const creak = effects.find((e) => e.type === "beamCreak");
  const creakT = creak ? since(creak.line) : -1;
  const beamTilt = creakT >= 0 ? Math.sin(creakT * 9) * 1.6 * Math.exp(-creakT * 0.7) + Math.min(creakT, 2) * 0.4 : 0;
  const dust = creakT >= 0 ? interpolate(creakT, [0, 0.3, 3], [0, 1, 0.4], clamp) : 0;
  const rim = STAGES[stage].rim;
  const diagramFill = scene.diagram ? interpolate(frame, [0, Math.max(1, frames)], [scene.diagram.from, scene.diagram.to], clamp) : 1;

  const background = {
    street: <StreetVesuvius stage={stage} plume={plume} pumice={scene.pumice} />,
    bakery: <Bakery stage={stage} />,
    gate: <CityGate stage={stage} />,
    room: <Room stage={stage} pile={scene.pile} beamTilt={beamTilt} dust={dust} />,
    diagram: <RoofDiagram fill={diagramFill} />,
  }[scene.background];

  const world = (
    <g>
      {background}
      {(scene.props ?? []).map((p, i) => {
        const x0 = p.x * WIDTH;
        const x = interpolate(frame, [0, Math.max(1, frames)], [p.x, p.toX ?? p.x], clamp) * WIDTH;
        return <Cart key={i} x={x} y={p.y ?? 1440} scale={p.scale ?? 1} facing={p.facing} travelled={Math.abs(x - x0)} />;
      })}
      {(scene.characters ?? []).map((c, i) => (
        <Character key={i} spec={c} frame={frame} frames={frames} t={t} lineOf={lineOf} rim={rim} />
      ))}
    </g>
  );

  const tag = effects.some((e) => e.type === "tag") ? interpolate(frame, [fps * 1.5, fps * 2.2], [1, 0], clamp) : 0;
  const alert = effects.find((e) => e.type === "redAlert");
  const alertOn = alert !== undefined && since(alert.line) >= 0;

  return (
    <AbsoluteFill>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <defs>
          <radialGradient id={`alert-${scene.id}`}>
            <stop offset="0.45" stopColor="#e2483d" stopOpacity={0} />
            <stop offset="1" stopColor="#e2483d" stopOpacity={0.85} />
          </radialGradient>
        </defs>
        <g transform={camera}>{frozen ? <Freeze frame={localFrameOf(freeze.line)}>{world}</Freeze> : world}</g>

        {/* Slapstick stars */}
        {effects.map((e, i) => {
          if (e.type !== "hit") return null;
          const s = since(e.line);
          if (s < 0 || s > 0.35) return null;
          const k = interpolate(s, [0, 0.08, 0.35], [0.3, 1, 0.6], clamp);
          return (
            <g key={i} transform={`translate(${(e.x ?? 0.5) * WIDTH} ${(e.y ?? 0.47) * HEIGHT}) scale(${130 * k}) rotate(${frame * 5})`} opacity={1 - s / 0.35}>
              <polygon points={STAR} fill="#f2c12e" stroke={INK} strokeWidth={0.06} strokeLinejoin="round" />
              <polygon points={STAR} fill="#ffffff" transform="scale(0.45)" />
            </g>
          );
        })}

        {/* Taps on the phone glass: expanding rings */}
        {effects.map((e, i) => {
          if (e.type !== "tap" || !speaking(e.line)) return null;
          // Three quick taps, repeated every 1.4 s while the line is spoken.
          const s = since(e.line) % 1.4;
          return [0, 0.25, 0.5].map((d) => {
            const p = (s - d) / 0.6;
            if (p < 0 || p > 1) return null;
            return (
              <circle key={`${i}-${d}`} cx={(e.x ?? 0.95) * WIDTH} cy={(e.y ?? 0.54) * HEIGHT} r={20 + 110 * p} fill="none" stroke="#ffffff" strokeWidth={10 * (1 - p)} opacity={0.9 * (1 - p)} />
            );
          });
        })}

        {alertOn && <rect width={WIDTH} height={HEIGHT} fill={`url(#alert-${scene.id})`} opacity={0.45 + 0.35 * Math.sin(frame * 0.7)} />}

        {frozen && (
          <g>
            <rect width={WIDTH} height={HEIGHT} fill="#4fc3f7" opacity={0.22} />
            {Array.from({ length: 5 }, (_, i) => {
              const y = ((Math.sin(frame * 1.3 + i * 17.1) + 1) / 2) * HEIGHT;
              return <rect key={i} x={0} y={y} width={WIDTH} height={8 + (i % 3) * 10} fill="#5ee6f0" opacity={0.35} />;
            })}
          </g>
        )}

        {tag > 0 && (
          <g opacity={tag} fontFamily={fontFamily} fontWeight={800} textAnchor="middle">
            <rect x={540 - 250} y={SAFE_TOP + 10} width={500} height={84} rx={42} fill={INK} />
            <text x={540} y={SAFE_TOP + 66} fontSize={44} fill="#fbefd6">
              {`${data.place.toUpperCase()} · ${data.year} AD`}
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// ---- Characters ---------------------------------------------------------------------------

const WIFE_DRESS = "#a8584a";
const GIRL_DRESS = "#f3ead8"; // Roman girls usually wore a long white tunic (see notes/facts)

const DEFAULT_SCALE: Record<CharacterSpec["name"], number> = { tony: 2.8, wife: 2.6, daughter: 1.75, neighbor: 2.3 };

const Character: React.FC<{
  spec: CharacterSpec;
  frame: number;
  frames: number;
  t: number;
  lineOf: (n: number) => Line;
  rim: string;
}> = ({ spec, frame, frames, t, lineOf, rim }) => {
  // Pose and face can change from a given line on.
  let pose = spec.pose;
  let expression = spec.expression;
  for (const c of spec.changes ?? []) {
    if (t >= lineOf(c.line).start) {
      pose = c.pose ?? pose;
      expression = c.expression ?? expression;
    }
  }
  const x = interpolate(frame, [0, Math.max(1, frames)], [spec.x, spec.toX ?? spec.x], clamp) * WIDTH;
  const common = {
    pose,
    expression,
    x,
    y: spec.y ?? 1440,
    scale: spec.scale ?? DEFAULT_SCALE[spec.name],
    facing: spec.facing,
    seed: spec.seed,
    rim,
  };
  const extra = spec.extra ?? [];

  switch (spec.name) {
    case "tony":
      return <Tony {...common} extra={extra} />;
    case "wife":
      return <Stickman {...common} color={INK} accessories={["dress", "bun", ...extra]} accent={WIFE_DRESS} />;
    case "daughter":
      return <Stickman {...common} color={INK} accessories={["dress", ...extra]} accent={GIRL_DRESS} />;
    case "neighbor":
      return <Stickman {...common} color={INK} accessories={extra} />;
  }
};
