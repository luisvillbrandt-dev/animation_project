// A full episode: reads scenes.json, timing.json and captions.json of one episode folder and plays
// the scenes in sync with voice.wav. Scene timing always comes from timing.json:
// a scene starts with its first line and lasts until the next scene starts.
import type { Caption } from "@remotion/captions";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Easing,
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
import { Room } from "./components/backgrounds/Room";
import { INK, STAGES, Stage, StreetVesuvius } from "./components/backgrounds/StreetVesuvius";
import { Captions } from "./components/Captions";
import { Accessory, Expression, Pose, Stickman } from "./components/Stickman";
import { VoteCard, VoteOption } from "./components/VoteCard";
import { INTRO_FRAMES, Intro } from "./Intro";
import { FPS, HEIGHT, SAFE_TOP, WIDTH } from "./video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const VOTE_HOLD = 3; // seconds the vote card stays after the last word
const VOICE_TAIL = 0.6; // silence at the end of voice.wav (voice.config.json "tail")

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

type Effect =
  | { type: "shake"; line: number; strength?: number } // the camera shakes while this line is spoken
  | { type: "eruption"; line: number } // the ash column grows from the start of this line
  | { type: "beamCreak"; line: number } // the roof beam tilts and drops dust
  | { type: "tag" }; // "PLACE · YEAR" label fading out (continues the intro's label)

export type SceneSpec = {
  id: string;
  lines: number[];
  background: "intro" | "street" | "bakery" | "gate" | "room" | "vote";
  stage?: Stage;
  characters?: CharacterSpec[];
  camera?: { zoomFrom?: number; zoomTo?: number; focusX?: number; focusY?: number };
  effects?: Effect[];
  plume?: number; // street: size of the ash column 0..1
  pumice?: boolean; // street: falling stones on/off
  pile?: number; // room: pumice height outside the window 0..1
  vote?: [VoteOption & { line: number }, VoteOption & { line: number }];
};

export type EpisodeFile = { episode: string; place: string; year: number; introStage: Stage; scenes: SceneSpec[] };

export type EpisodeProps = { episode: string; data: EpisodeFile | null; timing: Line[]; captions: Caption[] };

// ---- Loading ------------------------------------------------------------------------------

const load = <T,>(file: string) => fetch(staticFile(file)).then((r) => r.json() as Promise<T>);

export const loadEpisode: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const [data, timing, captions] = await Promise.all([
    load<EpisodeFile>(`${props.episode}/scenes.json`),
    load<Line[]>(`${props.episode}/timing.json`),
    load<Caption[]>(`${props.episode}/captions.json`),
  ]);
  const seconds = timing[timing.length - 1].end + VOICE_TAIL + VOTE_HOLD;
  return { props: { ...props, data, timing, captions }, durationInFrames: Math.ceil(seconds * FPS) };
};

// ---- The episode --------------------------------------------------------------------------

export const Episode: React.FC<EpisodeProps> = ({ episode, data, timing, captions }) => {
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
  const showCaptions = current !== -1 && data.scenes[current].background !== "vote";

  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Html5Audio src={staticFile(`${episode}/voice/voice.wav`)} />
      {data.scenes.map((scene, i) => (
        <Sequence key={scene.id} name={scene.id} from={ranges[i].from} durationInFrames={Math.max(1, ranges[i].to - ranges[i].from)}>
          <SceneView scene={scene} data={data} startFrame={ranges[i].from} frames={ranges[i].to - ranges[i].from} lineOf={lineOf} />
        </Sequence>
      ))}
      {showCaptions && <Captions captions={captions} />}
    </AbsoluteFill>
  );
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

const SceneView: React.FC<SceneViewProps> = ({ scene, data, startFrame, frames, lineOf }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (startFrame + frame) / fps; // seconds since the start of the episode
  const since = (n: number) => t - lineOf(n).start;
  const speaking = (n: number) => t >= lineOf(n).start && t < lineOf(n).end;
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

  // Camera: slow zoom toward a focus point, plus shakes.
  const cam = scene.camera ?? {};
  const zoom = interpolate(frame, [0, Math.max(1, frames)], [cam.zoomFrom ?? 1, cam.zoomTo ?? 1.08], clamp);
  const fx = (cam.focusX ?? 0.45) * WIDTH;
  const fy = (cam.focusY ?? 0.47) * HEIGHT;
  let shake = 0;
  for (const e of effects) {
    if (e.type === "shake" && speaking(e.line)) shake = Math.max(shake, 14 * (e.strength ?? 1));
    if (e.type === "eruption" && since(e.line) >= 0 && since(e.line) < 0.8) shake = Math.max(shake, 22 * (1 - since(e.line) / 0.8));
    if (e.type === "beamCreak" && since(e.line) >= 0 && since(e.line) < 1.2) shake = Math.max(shake, 18 * (1 - since(e.line) / 1.2));
  }
  const sx = Math.sin(frame * 2.3) * shake;
  const sy = Math.cos(frame * 2.9) * shake * 0.7;
  const camera = `translate(${sx} ${sy}) translate(${fx} ${fy}) scale(${zoom}) translate(${-fx} ${-fy})`;

  // Effect values for the backgrounds.
  const eruption = effects.find((e) => e.type === "eruption");
  const plume = eruption
    ? interpolate(since(eruption.line), [0, 2.5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
    : scene.plume;
  const creak = effects.find((e) => e.type === "beamCreak");
  const creakT = creak ? since(creak.line) : -1;
  const beamTilt = creakT >= 0 ? Math.sin(creakT * 9) * 1.6 * Math.exp(-creakT * 0.7) + Math.min(creakT, 2) * 0.4 : 0;
  const dust = creakT >= 0 ? interpolate(creakT, [0, 0.3, 3], [0, 1, 0.4], clamp) : 0;
  const rim = STAGES[stage].rim;

  const background = {
    street: <StreetVesuvius stage={stage} plume={plume} pumice={scene.pumice} />,
    bakery: <Bakery stage={stage} />,
    gate: <CityGate stage={stage} />,
    room: <Room stage={stage} pile={scene.pile} beamTilt={beamTilt} dust={dust} />,
  }[scene.background];

  const tag = effects.some((e) => e.type === "tag") ? interpolate(frame, [fps * 1.5, fps * 2.2], [1, 0], clamp) : 0;

  return (
    <AbsoluteFill>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <g transform={camera}>
          {background}
          {(scene.characters ?? []).map((c, i) => (
            <Character key={i} spec={c} frame={frame} frames={frames} t={t} lineOf={lineOf} rim={rim} />
          ))}
        </g>
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
