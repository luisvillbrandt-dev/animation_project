// Stickman: a flat, thick-lined figure built from joint angles.
// A pose is a set of angles. The figure only sways and swings over time; it is never drawn
// frame by frame. Render it inside an <svg>; x/y is the point between the feet, in pixels.
import { useCurrentFrame, useVideoConfig } from "remotion";

export const POSES = ["idle", "walking", "running", "pointing", "shocked", "deciding", "waving"] as const;
export const EXPRESSIONS = [
  "neutral",
  "worried",
  "scared",
  "strained",
  "eager",
  "shocked",
  "asking",
  "happy",
] as const;
export type Pose = (typeof POSES)[number];
export type Expression = (typeof EXPRESSIONS)[number];

// Things a stickman can wear or carry. Tony's signature items come from this list.
export type Accessory =
  | "pillow"
  | "goggles"
  | "scarf"
  | "cap"
  | "capBack"
  | "bucketHat"
  | "beanie"
  | "headphones"
  | "backpack"
  | "satchel"
  | "curl"
  | "watch";

// The face each pose gets when no expression is given.
export const POSE_FACE: Record<Pose, Expression> = {
  idle: "neutral",
  walking: "neutral",
  running: "strained",
  pointing: "eager",
  shocked: "shocked",
  deciding: "asking",
  waving: "happy",
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
  accessories?: Accessory[];
  accent?: string; // color of headwear and scarf
  accent2?: string; // color of bags and headphones
};

// Body measurements in stickman units (about 222 units tall at scale 1).
// The head is big on purpose, so faces still read on a phone.
const HEAD_R = 34;
const FACE_SCALE = HEAD_R / 26; // the face was drawn for a head of radius 26
const TORSO = 62;
const SHOULDER = 54; // shoulder height on the torso, measured from the hip
const UPPER_ARM = 38;
const FOREARM = 36;
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
      backArm: [-112 + w, -140 + w],
      frontArm: [112 - w, 140 - w],
      backLeg: [-18, -12],
      frontLeg: [16, 10],
    };
  },
  deciding: (t) => {
    const w = 6 * wave(t, 0.7); // hands go up and down like a scale
    return {
      lean: 0,
      head: 0,
      backArm: [-96 + w, -168 + w],
      frontArm: [96 + w, 168 + w],
      backLeg: [-9, -6],
      frontLeg: [9, 6],
    };
  },
  waving: (t) => {
    const b = 2 * wave(t, 0.4);
    return {
      lean: 0,
      head: 4 * wave(t, 0.5),
      backArm: [-24 + b, -14 + b],
      // Elbow out to the side so the hand waves next to the head, not across the face.
      frontArm: [110, 150 + 14 * wave(t, 2.2)],
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
  accessories = [],
  accent = "#e2483d",
  accent2 = "#3f8f8a",
}) => {
  const has = (item: Accessory) => accessories.includes(item);
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
      {has("backpack") && <Backpack shoulder={{ x: shoulder.x, y: shoulder.y + dy }} t={t} color={color} fill={accent2} />}
      <polyline points={toPoints(backLeg, dy)} {...line} />
      <polyline points={toPoints(frontLeg, dy)} {...line} />
      <polyline points={toPoints([hip, neck], dy)} {...line} />
      {has("scarf") && <Scarf neck={{ x: neck.x, y: neck.y + dy }} t={t} color={color} accent={accent} />}
      {has("headphones") && (
        // Resting around the neck: the band hangs under the chin, round ear cups on the collarbones.
        <g stroke={color} strokeLinejoin="round">
          <path d={`M ${neck.x - 26} ${neck.y + dy + 12} Q ${neck.x} ${neck.y + dy + 40} ${neck.x + 26} ${neck.y + dy + 12}`} fill="none" strokeWidth={7} />
          {[-26, 26].map((dx) => (
            <g key={dx}>
              <circle cx={neck.x + dx} cy={neck.y + dy + 12} r={13} fill={accent2} strokeWidth={5} />
              <circle cx={neck.x + dx} cy={neck.y + dy + 12} r={5} fill={color} stroke="none" />
            </g>
          ))}
        </g>
      )}
      <g transform={`translate(${head.x} ${head.y + dy}) rotate(${a.lean + a.head})`}>
        <circle r={HEAD_R} fill={headFill} stroke={color} strokeWidth={STROKE} />
        <g transform={`scale(${FACE_SCALE})`}>
          <Face expression={expression} color={color} fill={headFill} />
        </g>
        {has("curl") && (
          <path d="M -2 -38 C -8 -60 16 -66 20 -52 C 23 -42 8 -42 10 -50" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
        )}
        {has("cap") && (
          <g stroke={color} strokeLinejoin="round" strokeLinecap="round">
            <path d="M -33 -14 Q -33 -48 0 -48 Q 33 -48 33 -14 Z" fill={accent} strokeWidth={6} />
            <path d="M 20 -15 L 58 -9" strokeWidth={10} />
            <circle cx={0} cy={-48} r={4} fill={accent} strokeWidth={3} />
          </g>
        )}
        {has("capBack") && (
          <g stroke={color} strokeLinejoin="round" strokeLinecap="round">
            <path d="M -20 -15 L -58 -9" strokeWidth={10} />
            <path d="M -33 -14 Q -33 -48 0 -48 Q 33 -48 33 -14 Z" fill={accent} strokeWidth={6} />
            <circle cx={0} cy={-48} r={4} fill={accent} strokeWidth={3} />
          </g>
        )}
        {has("bucketHat") && (
          <g stroke={color} strokeLinejoin="round">
            <ellipse cx={0} cy={-24} rx={50} ry={11} fill={accent} strokeWidth={6} />
            <path d="M -27 -26 Q -27 -54 0 -54 Q 27 -54 27 -26 Z" fill={accent} strokeWidth={6} />
            <path d="M -26 -32 L 26 -32" stroke={accent2} strokeWidth={6} />
            {/* A few woven lines so it reads as straw */}
            <path d="M -14 -40 L -6 -46 M 6 -42 L 14 -48 M -38 -22 L -30 -26 M 30 -26 L 38 -22" stroke={STRAW_LINE} strokeWidth={2.5} strokeLinecap="round" />
          </g>
        )}
        {has("beanie") && (
          <g stroke={color} strokeLinejoin="round">
            <path d="M -33 -18 Q -33 -56 0 -56 Q 33 -56 33 -18 Z" fill={accent} strokeWidth={6} />
            <rect x={-37} y={-28} width={74} height={14} rx={6} fill={accent} strokeWidth={5} />
            <circle cx={0} cy={-60} r={10} fill={POMPOM} strokeWidth={4} />
          </g>
        )}
        {has("goggles") && (
          <g stroke={color} strokeLinecap="round">
            <path d="M -37 -16 Q 0 -32 37 -16" fill="none" stroke={STRAP} strokeWidth={7} />
            <path d="M -3 -31 L 3 -31" strokeWidth={5} />
            {[-14, 14].map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy={-31} r={11} fill={LENS} strokeWidth={5} />
                <circle cx={cx - 4} cy={-35} r={2.8} fill="#ffffff" stroke="none" />
              </g>
            ))}
          </g>
        )}
        {has("pillow") && (
          <g transform={`translate(-6 ${-HEAD_R - 14}) rotate(-6)`}>
            <rect x={-46} y={-15} width={92} height={30} rx={14} fill={PILLOW} stroke={color} strokeWidth={5} />
            <path d="M -30 0 L 30 0" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 8" />
          </g>
        )}
      </g>
      <polyline points={toPoints(backArm, dy)} {...line} />
      {/* The bag hangs in front of the back arm, so its glowing clasp stays visible */}
      {has("satchel") && (
        <Satchel shoulder={{ x: shoulder.x, y: shoulder.y + dy }} hip={{ x: hip.x, y: hip.y + dy }} t={t} color={color} fill={accent2} />
      )}
      <polyline points={toPoints(frontArm, dy)} {...line} />
      {has("watch") && <Watch arm={frontArm.map((p) => ({ x: p.x, y: p.y + dy }))} t={t} color={color} />}
    </g>
  );
};

const STRAP = "#6b4a2b";
const LENS = "#9fd8ef";
const DEVICE_GLOW = "#5ee6f0"; // the light of Tony's time machine
const POMPOM = "#fff4e0";
const STRAW_LINE = "#c4931c";

// A scarf wrapped around the neck, two ends fluttering behind him.
const Scarf: React.FC<{ neck: Point; t: number; color: string; accent: string }> = ({ neck, t, color, accent }) => {
  const f = Math.sin(t * 2 * Math.PI * 1.4);
  const tails = [
    `M ${neck.x - 6} ${neck.y + 10} q -28 ${10 + 6 * f} -58 ${6 + 12 * f}`,
    `M ${neck.x - 4} ${neck.y + 12} q -20 ${18 + 4 * f} -40 ${22 + 8 * f}`,
  ];
  return (
    <g strokeLinecap="round" fill="none">
      {tails.map((d) => (
        <path key={d} d={d} stroke={color} strokeWidth={17} />
      ))}
      {tails.map((d) => (
        <path key={d} d={d} stroke={accent} strokeWidth={10} />
      ))}
      <ellipse cx={neck.x} cy={neck.y + 6} rx={22} ry={9} fill={accent} stroke={color} strokeWidth={5} />
    </g>
  );
};

// A small backpack with an antenna that glows: the time machine.
const Backpack: React.FC<{ shoulder: Point; t: number; color: string; fill: string }> = ({ shoulder, t, color, fill }) => {
  const pulse = 0.55 + 0.45 * Math.sin(t * 2 * Math.PI * 1.2);
  const x = shoulder.x - 48;
  const y = shoulder.y + 2;
  return (
    <g stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M ${x + 8} ${y} L ${x - 8} ${y - 34}`} strokeWidth={5} />
      <circle cx={x - 10} cy={y - 38} r={14} fill={DEVICE_GLOW} opacity={0.35 * pulse} stroke="none" />
      <circle cx={x - 10} cy={y - 38} r={6} fill={DEVICE_GLOW} strokeWidth={3} />
      <rect x={x} y={y} width={30} height={52} rx={8} fill={fill} strokeWidth={5} />
      <path d={`M ${x + 6} ${y + 18} L ${x + 24} ${y + 18}`} strokeWidth={3} />
    </g>
  );
};

// A messenger bag hanging from the shoulder, resting against the hip.
// The strap runs down on the bag's own side in a soft curve; a strap across the chest would read
// like an extra limb on a stick figure. The glowing clasp on the flap is Tony's time device.
const Satchel: React.FC<{ shoulder: Point; hip: Point; t: number; color: string; fill: string }> = ({
  shoulder,
  hip,
  t,
  color,
  fill,
}) => {
  const pulse = 0.55 + 0.45 * Math.sin(t * 2 * Math.PI * 1.2);
  const w = 46;
  const h = 36;
  const bx = hip.x - 38; // overlaps the body line, so it hangs on him instead of next to him
  const by = hip.y - 20;
  const swing = 4 * Math.sin(t * 2 * Math.PI * 0.6);
  const strap = `M ${shoulder.x - 2} ${shoulder.y - 2} Q ${shoulder.x - 12} ${(shoulder.y + by) / 2} ${bx + 12} ${by + 3}`;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d={strap} fill="none" stroke={color} strokeWidth={11} />
      <path d={strap} fill="none" stroke={fill} strokeWidth={5} />
      <g stroke={color} transform={`rotate(${swing} ${bx + 8} ${by})`}>
        <rect x={bx} y={by} width={w} height={h} rx={9} fill={fill} strokeWidth={5} />
        <path d={`M ${bx} ${by + 3} L ${bx + w} ${by + 3} L ${bx + w} ${by + 17} Q ${bx + w / 2} ${by + 27} ${bx} ${by + 17} Z`} fill={fill} strokeWidth={5} />
        <circle cx={bx + w / 2} cy={by + 20} r={13} fill={DEVICE_GLOW} opacity={0.45 * pulse} stroke="none" />
        <circle cx={bx + w / 2} cy={by + 20} r={6} fill={DEVICE_GLOW} strokeWidth={3.5} />
      </g>
    </g>
  );
};

// A big glowing wristwatch near the hand: the time machine.
const Watch: React.FC<{ arm: Point[]; t: number; color: string }> = ({ arm, t, color }) => {
  const [, elbow, hand] = arm;
  const at = { x: elbow.x + (hand.x - elbow.x) * 0.78, y: elbow.y + (hand.y - elbow.y) * 0.78 };
  const pulse = 0.55 + 0.45 * Math.sin(t * 2 * Math.PI * 1.2);
  return (
    <g>
      <circle cx={at.x} cy={at.y} r={18} fill={DEVICE_GLOW} opacity={0.4 * pulse} />
      <circle cx={at.x} cy={at.y} r={9} fill="#ffd34d" stroke={color} strokeWidth={4} />
      <circle cx={at.x} cy={at.y} r={3} fill={DEVICE_GLOW} />
    </g>
  );
};

// Face coordinates are relative to the head center. Everything inside the head stays within
// about 19 units of the center, so the thick head outline never covers it.
// The face sits a little toward the facing side, so he looks where he is going.
const FX = 3;
const EYE = 8; // horizontal distance of each eye from the face center
const SWEAT = "#7cc4e8";
const PILLOW = "#efe4cf";
const CHEEK = "#f4a3a0";

const Face: React.FC<{ expression: Expression; color: string; fill: string }> = ({
  expression,
  color,
  fill,
}) => {
  const thin = {
    fill: "none",
    stroke: color,
    strokeWidth: 3.5,
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
        <circle cx={ex} cy={-2} r={r} fill={fill} stroke={color} strokeWidth={3} />
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
          <rect x={FX - 8} y={6} width={16} height={9} rx={3} fill={fill} stroke={color} strokeWidth={3} />
          <path d={`M ${FX - 8} 10.5 L ${FX + 8} 10.5`} stroke={color} strokeWidth={2.5} />
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

    case "happy":
      // Smiling eyes, a big open smile and rosy cheeks: Tony greeting the viewer.
      return (
        <g>
          <path d={`M ${L - 4} -2 Q ${L} -9 ${L + 4} -2`} {...thin} />
          <path d={`M ${R - 4} -2 Q ${R} -9 ${R + 4} -2`} {...thin} />
          <circle cx={L - 3} cy={5} r={3.2} fill={CHEEK} />
          <circle cx={R + 3} cy={5} r={3.2} fill={CHEEK} />
          <path d={`M ${FX - 9} 6 Q ${FX} 21 ${FX + 9} 6 Z`} fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
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
