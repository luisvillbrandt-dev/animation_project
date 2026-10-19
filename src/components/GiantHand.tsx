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
