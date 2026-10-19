// Background: inside the bakery. A big stone oven with fire in its mouth, round loaves on a shelf,
// a lava-stone mill. Floor line at y 1440 (where the stickmen stand). Render inside a 1080x1920 <svg>.
import { useCurrentFrame } from "remotion";
import { STAGES, Stage } from "./StreetVesuvius";

const FLOOR_Y = 1440;

export const Bakery: React.FC<{ stage?: Stage }> = ({ stage = "day" }) => {
  const frame = useCurrentFrame();
  const p = STAGES[stage];
  const line = { stroke: p.outline, strokeWidth: 7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const flicker = 0.85 + 0.15 * Math.sin(frame * 0.9) * Math.sin(frame * 0.37);

  return (
    <g>
      {/* Back wall with a painted lower band, ceiling beam */}
      <rect x={-10} y={-10} width={1100} height={FLOOR_Y + 10} fill={p.wallAlt} />
      <rect x={-10} y={FLOOR_Y - 150} width={1100} height={150} fill={p.wallBand} {...line} />
      <rect x={-20} y={210} width={1120} height={64} fill={p.wood} {...line} />
      <rect x={-20} y={-20} width={1120} height={230} fill={p.opening} opacity={0.35} />

      {/* Stone oven on a platform: dome with a small arched mouth */}
      <rect x={50} y={1160} width={480} height={FLOOR_Y - 1160} rx={10} fill={p.ovenStone} {...line} />
      <path d="M 80 1160 Q 80 840 290 840 Q 500 840 500 1160 Z" fill={p.ovenStone} {...line} />
      <path d="M 70 1160 L 510 1160" {...line} />
      <path d="M 220 1160 L 220 1100 Q 290 1030 360 1100 L 360 1160 Z" fill={p.opening} {...line} />
      <path d="M 238 1158 L 238 1112 Q 290 1060 342 1112 L 342 1158 Z" fill={p.glow} opacity={flicker} />
      <circle cx={290} cy={1130} r={70 + 10 * flicker} fill={p.glow} opacity={0.18} />

      {/* Shelf with round, scored loaves */}
      <rect x={760} y={990} width={290} height={22} fill={p.wood} {...line} />
      {[800, 868, 936, 1004].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={962} r={28} fill={p.bread} stroke={p.outline} strokeWidth={5} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <path
                key={i}
                d={`M ${cx + Math.cos(a) * 7} ${962 + Math.sin(a) * 7} L ${cx + Math.cos(a) * 22} ${962 + Math.sin(a) * 22}`}
                stroke={p.breadCut}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      ))}

      {/* Lava-stone mill: two cones like an hourglass */}
      <path d="M 860 1440 L 900 1290 L 1000 1290 L 1040 1440 Z" fill="#6f6862" {...line} />
      <path d="M 880 1150 L 1020 1150 L 970 1290 L 930 1290 Z" fill="#7d756e" {...line} />
      <path d="M 1010 1220 L 1080 1200" stroke={p.wood} strokeWidth={14} strokeLinecap="round" />

      {/* Stone floor */}
      <rect x={-10} y={FLOOR_Y} width={1100} height={1920 - FLOOR_Y + 10} fill={p.stone} {...line} />
      {[120, 380, 640, 900].map((x, i) => (
        <path key={x} d={`M ${x} ${FLOOR_Y + 60 + (i % 2) * 70} L ${x + 150} ${FLOOR_Y + 60 + (i % 2) * 70}`} stroke={p.road} strokeWidth={6} strokeLinecap="round" />
      ))}
    </g>
  );
};
