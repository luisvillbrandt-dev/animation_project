// Background: inside the family's house. A heavy roof beam across the top, an oil lamp hanging
// from it, a window where the pumice piles up outside, the door on the left. Floor at y 1440.
// Render inside a 1080x1920 <svg>.
import { useCurrentFrame } from "remotion";
import { STAGES, Stage } from "./StreetVesuvius";

const FLOOR_Y = 1440;
const BEAM_Y = 330;
const WINDOW = { x: 720, y: 640, w: 240, h: 280 };

type Props = {
  stage?: Stage;
  pile?: number; // 0..1, how high the pumice stands outside the window
  beamTilt?: number; // degrees, for the creaking beam
  dust?: number; // 0..1, dust falling from the beam
};

export const Room: React.FC<Props> = ({ stage = "dark", pile = 0.3, beamTilt = 0, dust = 0 }) => {
  const frame = useCurrentFrame();
  const p = STAGES[stage];
  const line = { stroke: p.outline, strokeWidth: 7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const flicker = 0.9 + 0.1 * Math.sin(frame * 0.8) * Math.sin(frame * 0.29);
  const lamp = { x: 300, y: 660 };
  const pileH = pile * WINDOW.h;

  return (
    <g>
      <defs>
        <radialGradient id={`room-lamp-${stage}`}>
          <stop offset="0" stopColor="#ffc46b" stopOpacity={0.55} />
          <stop offset="1" stopColor="#ffc46b" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`room-sky-${stage}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>
        <clipPath id={`room-window-${stage}`}>
          <rect x={WINDOW.x} y={WINDOW.y} width={WINDOW.w} height={WINDOW.h} />
        </clipPath>
      </defs>

      {/* Walls and ceiling */}
      <rect x={-10} y={-10} width={1100} height={FLOOR_Y + 10} fill={p.wall} />
      <rect x={-10} y={FLOOR_Y - 140} width={1100} height={140} fill={p.wallBand} {...line} />
      <rect x={-10} y={-10} width={1100} height={BEAM_Y + 10} fill={p.wood} opacity={0.75} />
      {[90, 330, 570, 810, 1050].map((x) => (
        <path key={x} d={`M ${x} -10 L ${x} ${BEAM_Y}`} stroke={p.outline} strokeWidth={5} opacity={0.5} />
      ))}

      {/* Window: outside, the stones pile up */}
      <g clipPath={`url(#room-window-${stage})`}>
        <rect x={WINDOW.x} y={WINDOW.y} width={WINDOW.w} height={WINDOW.h} fill={`url(#room-sky-${stage})`} />
        {p.pumice !== "none" &&
          Array.from({ length: 14 }, (_, i) => (
            <circle
              key={i}
              cx={WINDOW.x + ((i * 53) % WINDOW.w)}
              cy={WINDOW.y + (((i * 97) % WINDOW.h) + frame * (8 + (i % 4))) % WINDOW.h}
              r={4 + (i % 3)}
              fill={p.pumice}
            />
          ))}
        <path
          d={`M ${WINDOW.x} ${WINDOW.y + WINDOW.h} L ${WINDOW.x} ${WINDOW.y + WINDOW.h - pileH} Q ${WINDOW.x + WINDOW.w / 2} ${WINDOW.y + WINDOW.h - pileH - 30} ${WINDOW.x + WINDOW.w} ${WINDOW.y + WINDOW.h - pileH} L ${WINDOW.x + WINDOW.w} ${WINDOW.y + WINDOW.h} Z`}
          fill={p.pumice === "none" ? "#d8d0c3" : p.pumice}
        />
      </g>
      <rect x={WINDOW.x} y={WINDOW.y} width={WINDOW.w} height={WINDOW.h} fill="none" {...line} strokeWidth={10} />
      <path d={`M ${WINDOW.x + WINDOW.w / 2} ${WINDOW.y} L ${WINDOW.x + WINDOW.w / 2} ${WINDOW.y + WINDOW.h}`} stroke={p.wood} strokeWidth={12} />

      {/* Door on the left: narrow, flat top */}
      <rect x={70} y={980} width={190} height={FLOOR_Y - 980} fill={p.wood} {...line} />
      <path d="M 165 990 L 165 1430" stroke={p.outline} strokeWidth={4} opacity={0.5} />

      {/* Floor */}
      <rect x={-10} y={FLOOR_Y} width={1100} height={1920 - FLOOR_Y + 10} fill={p.sidewalk} {...line} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M -10 ${FLOOR_Y + 90 + i * 110} L 1090 ${FLOOR_Y + 90 + i * 110}`} stroke={p.outline} strokeWidth={4} opacity={0.3} />
      ))}

      {/* Lamp light, the hanging oil lamp */}
      <circle cx={lamp.x} cy={lamp.y} r={460 * flicker} fill={`url(#room-lamp-${stage})`} />
      <path d={`M ${lamp.x} ${BEAM_Y + 30} L ${lamp.x} ${lamp.y - 20}`} stroke={p.outline} strokeWidth={4} strokeDasharray="10 8" />
      <path d={`M ${lamp.x - 34} ${lamp.y} Q ${lamp.x - 34} ${lamp.y - 22} ${lamp.x - 4} ${lamp.y - 22} L ${lamp.x + 30} ${lamp.y - 14} L ${lamp.x + 40} ${lamp.y - 6} L ${lamp.x + 24} ${lamp.y + 2} Z`} fill="#a8683a" {...line} strokeWidth={5} />
      <path d={`M ${lamp.x + 36} ${lamp.y - 8} Q ${lamp.x + 26} ${lamp.y - 26} ${lamp.x + 38} ${lamp.y - 44} Q ${lamp.x + 50} ${lamp.y - 26} ${lamp.x + 40} ${lamp.y - 8} Z`} fill="#ffd36b" opacity={flicker} />

      {/* The roof beam, which can tilt and drop dust */}
      <g transform={`rotate(${beamTilt} 540 ${BEAM_Y + 35})`}>
        <rect x={-30} y={BEAM_Y} width={1140} height={70} fill={p.wood} {...line} strokeWidth={9} />
        <path d={`M 120 ${BEAM_Y + 24} L 260 ${BEAM_Y + 30} M 600 ${BEAM_Y + 40} L 820 ${BEAM_Y + 34}`} stroke={p.outline} strokeWidth={4} opacity={0.5} />
      </g>
      {dust > 0 &&
        Array.from({ length: 24 }, (_, i) => {
          const x = 200 + ((i * 131) % 700);
          const fall = ((frame * (6 + (i % 5)) + i * 40) % 500) * dust;
          return <circle key={i} cx={x + Math.sin(frame * 0.2 + i) * 6} cy={BEAM_Y + 72 + fall} r={3 + (i % 3)} fill="#d8cbb4" opacity={dust * (1 - fall / 520)} />;
        })}
    </g>
  );
};
