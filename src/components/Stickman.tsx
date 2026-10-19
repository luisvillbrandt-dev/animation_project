// Stickman: a flat, thick-lined figure built from joint angles.
// A pose is a set of angles. The figure only sways and swings over time; it is never drawn
// frame by frame. Render it inside an <svg>; x/y is the point between the feet, in pixels.
import { useCurrentFrame, useVideoConfig } from "remotion";

export const POSES = ["idle", "walking", "running", "pointing", "shocked", "deciding"] as const;
export const EXPRESSIONS = ["neutral", "worried", "scared"] as const;
export type Pose = (typeof POSES)[number];
export type Expression = (typeof EXPRESSIONS)[number];

type Props = {
  pose: Pose;
  expression?: Expression;
  x: number;
  y: number;
  scale?: number;
  color?: string;
  headFill?: string;
  facing?: "left" | "right";
  seed?: number; // shifts the wobble so two stickmen never move in sync
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
  expression = "neutral",
  x,
  y,
  scale = 1,
  color = "#1d2433",
  headFill = "#ffffff",
  facing = "right",
  seed = 0,
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

  return (
    <g transform={`translate(${x} ${y}) rotate(${sway * flip}) scale(${scale * flip} ${scale})`}>
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

// The face sits a little toward the facing side, so he looks where he is going.
const FX = 5;

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
  };

  if (expression === "scared") {
    return (
      <g>
        {[-9, 9].map((ex) => (
          <g key={ex}>
            <circle cx={FX + ex} cy={-3} r={6} fill={fill} stroke={color} strokeWidth={2.5} />
            <circle cx={FX + ex} cy={-3} r={2.4} fill={color} />
          </g>
        ))}
        <path d={`M ${FX - 15} -14 L ${FX - 5} -19`} {...thin} />
        <path d={`M ${FX + 5} -19 L ${FX + 15} -14`} {...thin} />
        <ellipse cx={FX} cy={11} rx={4.5} ry={6} fill={color} />
      </g>
    );
  }

  return (
    <g>
      <circle cx={FX - 9} cy={-3} r={3.2} fill={color} />
      <circle cx={FX + 9} cy={-3} r={3.2} fill={color} />
      {expression === "worried" ? (
        <>
          <path d={`M ${FX - 14} -10 L ${FX - 5} -14`} {...thin} />
          <path d={`M ${FX + 5} -14 L ${FX + 14} -10`} {...thin} />
          <path d={`M ${FX - 7} 12 Q ${FX} 6 ${FX + 7} 12`} {...thin} />
        </>
      ) : (
        <path d={`M ${FX - 6} 10 L ${FX + 6} 10`} {...thin} />
      )}
    </g>
  );
};
