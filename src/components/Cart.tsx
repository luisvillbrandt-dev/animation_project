// A simple Roman handcart for slapstick: wooden box on two wheels. x/y = point between the wheels on
// the ground. The wheels turn as it moves (pass the distance travelled in px).
import { INK } from "./backgrounds/StreetVesuvius";

const WOOD = "#9a6234";
const WOOD_DARK = "#6e4224";

export const Cart: React.FC<{ x: number; y: number; scale?: number; travelled?: number; facing?: "left" | "right" }> = ({
  x,
  y,
  scale = 1,
  travelled = 0,
  facing = "left",
}) => {
  const spin = (travelled / (2 * Math.PI * 46)) * 360 * (facing === "left" ? -1 : 1);
  const line = { stroke: INK, strokeWidth: 7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <g transform={`translate(${x} ${y}) scale(${facing === "left" ? scale : -scale} ${scale})`}>
      <path d="M 60 -120 L 190 -170" {...line} stroke={WOOD_DARK} strokeWidth={14} />
      <rect x={-120} y={-200} width={190} height={110} rx={10} fill={WOOD} {...line} />
      <path d="M -120 -160 L 70 -160 M -120 -125 L 70 -125" stroke={WOOD_DARK} strokeWidth={5} />
      {[-70, 30].map((wx) => (
        <g key={wx} transform={`translate(${wx} -46) rotate(${spin})`}>
          <circle r={46} fill={WOOD_DARK} {...line} />
          <path d="M -40 0 L 40 0 M 0 -40 L 0 40" stroke={INK} strokeWidth={6} />
        </g>
      ))}
    </g>
  );
};
