// Background: a city gate in Pompeii's wall, Vesuvius behind the wall on the right with the ash
// column. People run left, away from the mountain, through the gate. Road at y 1440.
// Render inside a 1080x1920 <svg>.
import { useCurrentFrame } from "remotion";
import { STAGES, Stage } from "./StreetVesuvius";

const ROAD_Y = 1440;
const WALL_TOP = 860;

export const CityGate: React.FC<{ stage?: Stage }> = ({ stage = "ash" }) => {
  const frame = useCurrentFrame();
  const p = STAGES[stage];
  const line = { stroke: p.outline, strokeWidth: 7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const id = `gate-sky-${stage}`;

  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>
      </defs>
      <rect x={-10} y={-10} width={1100} height={ROAD_Y + 10} fill={`url(#${id})`} />

      {/* Vesuvius on the right with the ash column */}
      <g>
        <path d="M 820 560 C 830 420 815 300 790 200 L 900 200 C 880 300 870 420 880 560 Z" fill={p.smoke} {...line} strokeWidth={6} />
        {[
          [640, 190, 80],
          [760, 140, 100],
          [890, 130, 100],
          [1010, 170, 85],
        ].map(([cx, cy, r]) => (
          <circle key={cx} cx={cx} cy={cy} r={r} fill={p.smoke} stroke={p.outline} strokeWidth={6} />
        ))}
        {[640, 760, 890, 1010].map((cx, i) => (
          <circle key={`f${cx}`} cx={cx} cy={[190, 140, 130, 170][i]} r={[80, 100, 100, 85][i] - 4} fill={p.smoke} />
        ))}
        <path d="M 560 1000 L 790 600 Q 820 560 850 556 L 880 556 Q 910 560 940 600 L 1160 1000 Z" fill={p.volcano} {...line} />
      </g>

      {/* The wall with stone blocks */}
      <rect x={-10} y={WALL_TOP} width={1100} height={ROAD_Y - WALL_TOP} fill={p.ovenStone} {...line} />
      {Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const x = col * 150 + (row % 2) * 75 - 40;
          const y = WALL_TOP + 20 + row * 95;
          return <rect key={`${row}-${col}`} x={x} y={y} width={130} height={75} rx={8} fill="none" stroke={p.outline} strokeWidth={3} opacity={0.35} />;
        }),
      )}
      {/* Gate towers and the arched opening (looking out of the city) */}
      <rect x={90} y={WALL_TOP - 140} width={110} height={ROAD_Y - WALL_TOP + 140} fill={p.ovenStone} {...line} />
      <rect x={470} y={WALL_TOP - 140} width={110} height={ROAD_Y - WALL_TOP + 140} fill={p.ovenStone} {...line} />
      <path d={`M 200 ${ROAD_Y} L 200 1060 Q 200 940 335 940 Q 470 940 470 1060 L 470 ${ROAD_Y} Z`} fill={p.skyBottom} {...line} />
      <path d={`M 250 ${ROAD_Y} L 300 1150 L 370 1150 L 420 ${ROAD_Y} Z`} fill={p.road} opacity={0.6} />

      {/* Paved road */}
      <rect x={-10} y={ROAD_Y} width={1100} height={1920 - ROAD_Y + 10} fill={p.road} {...line} />
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={((i * 157) % 1080) - 40} y={ROAD_Y + 40 + (i % 4) * 100} width={130} height={60} rx={20} fill={p.stone} />
      ))}

      {/* Falling pumice */}
      {p.pumice !== "none" &&
        Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={(i * 263) % 1080} cy={((i * 431) % 1920 + frame * (10 + (i % 5))) % 1920} r={4 + (i % 4)} fill={p.pumice} />
        ))}
    </g>
  );
};
