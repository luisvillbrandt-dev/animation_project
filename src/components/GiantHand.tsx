// A giant cartoon hand coming in from the right, fingers pointing left, as if the viewer's
// (or the narrator's) hand reaches into the picture. Flat style with one thick outer outline.
// x/y is the middle of the palm's front edge (where the fingers start); size 1 = about 260 px tall.
import { INK } from "./backgrounds/StreetVesuvius";

const SKIN = "#f2c29a";
const SLEEVE = "#3f6fb0";
const CUFF = "#fbefd6";

// Palm, fingers and thumb as simple rounded shapes (local units, fingers point to -x).
const PALM = { x: -10, y: -95, w: 170, h: 190, r: 60 };
const FINGERS: { y: number; len: number }[] = [
  { y: -72, len: 150 },
  { y: -24, len: 168 },
  { y: 24, len: 152 },
  { y: 70, len: 118 },
];
const FINGER_H = 44;

// The fist: knuckles point left. x/y is the middle of the knuckles' back line.
const FIST_BODY = { x: -60, y: -86, w: 170, h: 172, r: 50 };
const CURLED: number[] = [-64, -22, 20, 62]; // centers of the four curled fingers
const CURLED_W = 110;
const CURLED_H = 44;

export const GiantFist: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={INK} strokeLinejoin="round" strokeLinecap="round">
    <rect x={FIST_BODY.x} y={FIST_BODY.y} width={FIST_BODY.w} height={FIST_BODY.h} rx={FIST_BODY.r} fill={SKIN} strokeWidth={9} />
    {/* Four curled fingers, each with its own outline so the knuckles read clearly */}
    {CURLED.map((cy) => (
      <rect key={cy} x={-92} y={cy - CURLED_H / 2} width={CURLED_W} height={CURLED_H} rx={CURLED_H / 2} fill={SKIN} strokeWidth={8} />
    ))}
    {/* Thumb folded over the lower fingers */}
    <path d="M -40 58 Q -48 30 -14 26 L 52 20 Q 72 22 70 44 Q 68 62 48 64 L -18 72 Q -36 74 -40 58 Z" fill={SKIN} strokeWidth={8} />
    <rect x={100} y={-96} width={60} height={192} rx={14} fill={CUFF} strokeWidth={8} />
    <rect x={156} y={-104} width={700} height={208} rx={18} fill={SLEEVE} strokeWidth={8} />
  </g>
);

export const GiantHand: React.FC<{ x: number; y: number; scale?: number; spread?: number }> = ({
  x,
  y,
  scale = 1,
  spread = 0, // 0 = fingers together, 1 = spread a little (open, ready to push)
}) => {
  const shapes = (fill: string, stroke: string, width: number) => (
    <g fill={fill} stroke={stroke} strokeWidth={width} strokeLinejoin="round">
      <rect x={PALM.x} y={PALM.y} width={PALM.w} height={PALM.h} rx={PALM.r} />
      {FINGERS.map((f, i) => (
        <rect
          key={i}
          x={30 - f.len}
          y={f.y * (1 + 0.12 * spread) - FINGER_H / 2}
          width={f.len}
          height={FINGER_H}
          rx={FINGER_H / 2}
          transform={`rotate(${(i - 1.5) * 5 * spread} 30 ${f.y})`}
        />
      ))}
      {/* Thumb, angled up and forward */}
      <rect x={-110} y={-25} width={130} height={50} rx={25} transform="translate(80 -80) rotate(35)" />
    </g>
  );

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {shapes(INK, INK, 16)}
      {shapes(SKIN, "none", 0)}
      {/* Knuckle hints where the fingers meet the palm */}
      {[-48, 0, 47].map((ky) => (
        <path key={ky} d={`M 6 ${ky} L 34 ${ky}`} stroke={INK} strokeWidth={5} strokeLinecap="round" opacity={0.5} />
      ))}
      {/* Cuff and sleeve, running off to the right */}
      <rect x={140} y={-104} width={60} height={208} rx={14} fill={CUFF} stroke={INK} strokeWidth={8} />
      <rect x={196} y={-112} width={700} height={224} rx={18} fill={SLEEVE} stroke={INK} strokeWidth={8} />
    </g>
  );
};
