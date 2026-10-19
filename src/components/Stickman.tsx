// Stickman: a flat, thick-lined figure built from joint angles.
// A pose is a set of angles. The figure only sways and swings over time; it is never drawn
// frame by frame. Render it inside an <svg>; x/y is the point between the feet, in pixels.
import { useCurrentFrame, useVideoConfig } from "remotion";

export const POSES = ["idle", "walking", "running", "pointing", "shocked", "deciding"] as const;
export const EXPRESSIONS = [
  "neutral",
  "worried",
  "scared",
  "strained",
  "eager",
  "shocked",
  "asking",
] as const;
export type Pose = (typeof POSES)[number];
export type Expression = (typeof EXPRESSIONS)[number];

// The face each pose gets when no expression is given.
export const POSE_FACE: Record<Pose, Expression> = {
  idle: "neutral",
  walking: "neutral",
  running: "strained",
  pointing: "eager",
  shocked: "shocked",
  deciding: "asking",
};

type Props = {
  pose: Pose;
  expression?: Expression; // leave out to use the pose's own face (POSE_FACE)
  x: number;
  y: number;
  scale?: number;
  color?: string;
  headFill?: string;
  facing?: "left" | "right";
  seed?: number; // shifts the wobble so two stickmen never move in sync
  rim?: string; // light edge around the figure so he stays visible on dark backgrounds
};

// Body measurements in stickman units (about 206 units tall at scale 1).
const HEAD_R = 26;
const TORSO = 62;
const SHOULDER = 54; // shoulder height on the torso, measured from the hip
const UPPER_ARM = 34;
const FOREARM = 32;
const THIGH = 44;
const SHIN = 46;
const STROKE = 8;
const RIM = 3.5; // width of the light edge on each side of a line

// Angles in degrees: 0 = straight down, +90 = toward the facing direction, 180 = straight up.
// A limb has two angles: upper segment, lower segment.
type Limb = [number, number];
type Angles = {
  lean: number; // torso tilt toward the facing direction
  head: number; // extra head tilt
  backArm: Limb;
  frontArm: Limb;
  backLeg: Limb;
  frontLeg: Limb;
};

const wave = (t: number, hz: number) => Math.sin(t * 2 * Math.PI * hz);

const POSE_ANGLES: Record<Pose, (t: number) => Angles> = {
  idle: (t) => {
    const b = 2 * wave(t, 0.4);
    return {
      lean: 0,
      head: 0,
      backArm: [-24 + b, -14 + b],
      frontArm: [24 - b, 14 - b],
      backLeg: [-9, -6],
      frontLeg: [9, 6],
    };
  },
  walking: (t) => {
    const s = wave(t, 1);
    return {
      lean: 4,
      head: 0,
      backArm: [-28 * s, -28 * s + 18],
      frontArm: [28 * s, 28 * s + 18],
      backLeg: [28 * s, 28 * s - 30 * Math.max(0, -s)],
      frontLeg: [-28 * s, -28 * s - 30 * Math.max(0, s)],
    };
  },
  running: (t) => {
    const s = wave(t, 1.6);
    // Forearm points up when the arm swings forward, down when it swings back.
    const arm = (u: number): Limb => [u, 1.5 * u + 60];
    return {
      lean: 14,
      head: -4,
      backArm: arm(-50 * s),
      frontArm: arm(50 * s),
      backLeg: [50 * s, 50 * s - 20 - 60 * Math.max(0, -s)],
      frontLeg: [-50 * s, -50 * s - 20 - 60 * Math.max(0, s)],
    };
  },
  pointing: (t) => {
    const w = 1.5 * wave(t, 0.5);
    return {
      lean: -2,
      head: 0,
      backArm: [-24, -14],
      frontArm: [86 + w, 90 + w],
      backLeg: [-10, -6],
      frontLeg: [10, 8],
    };
  },
  shocked: (t) => {
    const w = 3 * wave(t, 3); // trembling
    return {
      lean: -8,
      head: -6,
      backArm: [-120 + w, -140 + w],
      frontArm: [120 - w, 140 - w],
      backLeg: [-18, -12],
      frontLeg: [16, 10],
    };
  },
  deciding: (t) => {
    const w = 6 * wave(t, 0.7); // hands go up and down like a scale
    return {
      lean: 0,
      head: 0,
      backArm: [-100 + w, -175 + w],
      frontArm: [100 + w, 175 + w],
      backLeg: [-9, -6],
      frontLeg: [9, 6],
    };
  },
};

type Point = { x: number; y: number };

const along = (p: Point, deg: number, len: number): Point => {
  const r = (deg * Math.PI) / 180;
  return { x: p.x + Math.sin(r) * len, y: p.y + Math.cos(r) * len };
};

const limb = (start: Point, [a, b]: Limb, l1: number, l2: number): Point[] => {
  const mid = along(start, a, l1);
  return [start, mid, along(mid, b, l2)];
};

const toPoints = (pts: Point[], dy: number) =>
  pts.map((p) => `${p.x.toFixed(2)},${(p.y + dy).toFixed(2)}`).join(" ");

export const Stickman: React.FC<Props> = ({
  pose,
  expression = POSE_FACE[pose],
  x,
  y,
  scale = 1,
  color = "#1d2433",
  headFill = "#ffffff",
  facing = "right",
  seed = 0,
  rim = "none",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps + seed;
  const a = POSE_ANGLES[pose](t);

  const hip = { x: 0, y: -(THIGH + SHIN) };
  const torsoAngle = 180 - a.lean;
  const neck = along(hip, torsoAngle, TORSO);
  const shoulder = along(hip, torsoAngle, SHOULDER);
  const head = along(neck, torsoAngle - a.head, HEAD_R + 2);

  const backLeg = limb(hip, a.backLeg, THIGH, SHIN);
  const frontLeg = limb(hip, a.frontLeg, THIGH, SHIN);
  const backArm = limb(shoulder, a.backArm, UPPER_ARM, FOREARM);
  const frontArm = limb(shoulder, a.frontArm, UPPER_ARM, FOREARM);

  // Keep the lowest foot on the ground, so bent legs do not make him float.
  const dy = -Math.max(backLeg[2].y, frontLeg[2].y);

  const sway = 1.2 * Math.sin(t * 1.7);
  const flip = facing === "left" ? -1 : 1;

  const line = {
    fill: "none",
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  // The rim is a filter: it grows the figure's shape a little and paints that in the rim color
  // behind it, so every part (also "?" or shock lines) gets the light edge.
  const rimId = `stickman-rim-${rim.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${sway * flip}) scale(${scale * flip} ${scale})`}
      filter={rim === "none" ? undefined : `url(#${rimId})`}
    >
      {rim !== "none" && (
        <defs>
          <filter id={rimId} x="-50%" y="-50%" width="200%" height="200%">
            <feMorphology in="SourceAlpha" operator="dilate" radius={RIM} result="grown" />
            <feFlood floodColor={rim} />
            <feComposite in2="grown" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <polyline points={toPoints(backLeg, dy)} {...line} />
      <polyline points={toPoints(frontLeg, dy)} {...line} />
      <polyline points={toPoints([hip, neck], dy)} {...line} />
      <g transform={`translate(${head.x} ${head.y + dy}) rotate(${a.lean + a.head})`}>
        <circle r={HEAD_R} fill={headFill} stroke={color} strokeWidth={STROKE} />
        <Face expression={expression} color={color} fill={headFill} />
      </g>
      <polyline points={toPoints(backArm, dy)} {...line} />
      <polyline points={toPoints(frontArm, dy)} {...line} />
    </g>
  );
};

// Face coordinates are relative to the head center. Everything inside the head stays within
// about 19 units of the center, so the thick head outline never covers it.
// The face sits a little toward the facing side, so he looks where he is going.
const FX = 3;
const EYE = 8; // horizontal distance of each eye from the face center
const SWEAT = "#7cc4e8";

const Face: React.FC<{ expression: Expression; color: string; fill: string }> = ({
  expression,
  color,
  fill,
}) => {
  const thin = {
    fill: "none",
    stroke: color,
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const L = FX - EYE;
  const R = FX + EYE;

  const dotEyes = (r = 3.2) => (
    <>
      <circle cx={L} cy={-3} r={r} fill={color} />
      <circle cx={R} cy={-3} r={r} fill={color} />
    </>
  );
  // Big white eyes with a small pupil: the smaller the pupil, the bigger the fright.
  const wideEyes = (r: number, pupil: number) =>
    [L, R].map((ex) => (
      <g key={ex}>
        <circle cx={ex} cy={-2} r={r} fill={fill} stroke={color} strokeWidth={2.5} />
        <circle cx={ex} cy={-2} r={pupil} fill={color} />
      </g>
    ));

  switch (expression) {
    case "neutral":
      return (
        <g>
          {dotEyes()}
          <path d={`M ${FX - 6} 10 L ${FX + 6} 10`} {...thin} />
        </g>
      );

    case "worried":
      return (
        <g>
          {dotEyes()}
          <path d={`M ${L - 5} -10 L ${L + 4} -14`} {...thin} />
          <path d={`M ${R - 4} -14 L ${R + 5} -10`} {...thin} />
          <path d={`M ${FX - 7} 12 Q ${FX} 6 ${FX + 7} 12`} {...thin} />
        </g>
      );

    case "scared":
      // Brows pulled up in the middle, trembling mouth.
      return (
        <g>
          {wideEyes(5.5, 2)}
          <path d={`M ${L - 5} -10 L ${L + 4} -15`} {...thin} />
          <path d={`M ${R - 4} -15 L ${R + 5} -10`} {...thin} />
          <path d={`M ${FX - 8} 12 q 2 -3 4 0 t 4 0 t 4 0 t 4 0`} {...thin} />
        </g>
      );

    case "strained":
      // Squeezed eyes, gritted teeth, a drop of sweat behind the head.
      return (
        <g>
          <path d={`M ${L - 4} -7 L ${L + 2} -3.5 L ${L - 4} 0`} {...thin} />
          <path d={`M ${R + 4} -7 L ${R - 2} -3.5 L ${R + 4} 0`} {...thin} />
          <path d={`M ${L - 5} -12 L ${L + 3} -9`} {...thin} />
          <path d={`M ${R - 3} -9 L ${R + 5} -12`} {...thin} />
          <rect x={FX - 8} y={6} width={16} height={9} rx={3} fill={fill} stroke={color} strokeWidth={2.5} />
          <path d={`M ${FX - 8} 10.5 L ${FX + 8} 10.5 M ${FX - 3} 6 L ${FX - 3} 15 M ${FX + 3} 6 L ${FX + 3} 15`} stroke={color} strokeWidth={1.8} />
          <path
            d="M -36 -24 C -32 -18 -30 -14 -30 -12 A 6 6 0 0 1 -42 -12 C -42 -14 -40 -18 -36 -24 Z"
            fill={SWEAT}
            stroke={color}
            strokeWidth={2}
          />
        </g>
      );

    case "eager":
      // Friendly "look, over there!": raised round brows and an open smile.
      return (
        <g>
          {dotEyes(3.4)}
          <path d={`M ${L - 4} -12 Q ${L} -16 ${L + 4} -12`} {...thin} />
          <path d={`M ${R - 4} -12 Q ${R} -16 ${R + 4} -12`} {...thin} />
          <path d={`M ${FX - 7} 7 Q ${FX} 17 ${FX + 7} 7 Z`} fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
        </g>
      );

    case "shocked":
      // Huge eyes, tiny pupils, high brows, open mouth, shock lines above the head.
      return (
        <g>
          {wideEyes(6, 1.8)}
          <path d={`M ${L - 5} -13 Q ${L} -19 ${L + 5} -13`} {...thin} />
          <path d={`M ${R - 5} -13 Q ${R} -19 ${R + 5} -13`} {...thin} />
          <ellipse cx={FX} cy={12} rx={5} ry={6.5} fill={color} />
          {[-40, 0, 40].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return (
              <path
                key={deg}
                d={`M ${34 * Math.sin(r)} ${-34 * Math.cos(r)} L ${46 * Math.sin(r)} ${-46 * Math.cos(r)}`}
                {...thin}
                strokeWidth={4}
              />
            );
          })}
        </g>
      );

    case "asking":
      // One brow raised, a doubtful mouth and a question mark next to the head.
      return (
        <g>
          {dotEyes()}
          <path d={`M ${L - 4} -10 L ${L + 4} -10`} {...thin} />
          <path d={`M ${R - 5} -13 Q ${R} -19 ${R + 5} -13`} {...thin} />
          <path d={`M ${FX - 5} 12 L ${FX + 5} 9`} {...thin} />
          <g transform="translate(42 -40)">
            <path d="M -6 -6 Q -6 -14 1 -14 Q 8 -14 8 -7 Q 8 -2 2 1 L 2 5" {...thin} strokeWidth={4.5} />
            <circle cx={2} cy={12} r={2.8} fill={color} />
          </g>
        </g>
      );
  }
};
