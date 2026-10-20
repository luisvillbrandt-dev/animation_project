// Background: a calm cutaway diagram of a Pompeii house roof with the pumice layer growing on it and a
// ruler marking 40 and 60 cm (pompeii-010: most roofs collapsed under about 40 to 60 cm).
// Deliberately without people. `fill` (0..1) is how high the layer has grown. Render inside 1080x1920.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { INK } from "./StreetVesuvius";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const PAPER = "#f3ead8";
const WALL = "#e0975c";
const ROOF = "#b24f36";
const PUMICE = "#ebe4d6";
const LINE = { stroke: INK, strokeWidth: 8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// Roof top line and the ruler scale: 0 cm at the roof, 60 cm = 300 px above it.
const ROOF_Y = 1080;
const PX_PER_CM = 5;

export const RoofDiagram: React.FC<{ fill?: number }> = ({ fill = 1 }) => {
  const layer = 60 * PX_PER_CM * fill;
  return (
    <g>
      <rect x={-10} y={-10} width={1100} height={1940} fill={PAPER} />
      {/* House cutaway: the house front with a door, the roof beam, the tile roof */}
      <rect x={200} y={ROOF_Y + 40} width={520} height={440} fill={WALL} {...LINE} />
      <rect x={200} y={ROOF_Y + 340} width={520} height={140} fill="#c0613f" {...LINE} />
      <rect x={400} y={ROOF_Y + 250} width={120} height={230} fill="#6d4636" {...LINE} />
      <rect x={260} y={ROOF_Y + 120} width={70} height={80} rx={6} fill="#6d4636" {...LINE} />
      <rect x={590} y={ROOF_Y + 120} width={70} height={80} rx={6} fill="#6d4636" {...LINE} />
      <rect x={170} y={ROOF_Y + 10} width={580} height={44} fill="#7a4a2e" {...LINE} />
      <rect x={150} y={ROOF_Y - 20} width={620} height={34} fill={ROOF} {...LINE} />
      {/* The pumice layer, with a few stones drawn in */}
      <rect x={150} y={ROOF_Y - 20 - layer} width={620} height={layer} fill={PUMICE} {...LINE} />
      {Array.from({ length: Math.floor(28 * fill) }, (_, i) => (
        <circle key={i} cx={175 + ((i * 97) % 570)} cy={ROOF_Y - 32 - ((i * 53) % Math.max(1, layer - 20))} r={6 + (i % 3) * 2} fill="#d8cfbf" stroke={INK} strokeWidth={3} />
      ))}
      {/* Ruler with the 40-60 cm band */}
      <rect x={820} y={ROOF_Y - 20 - 60 * PX_PER_CM - 30} width={70} height={60 * PX_PER_CM + 30} fill="#fbefd6" {...LINE} />
      <rect x={820} y={ROOF_Y - 20 - 60 * PX_PER_CM} width={70} height={20 * PX_PER_CM} fill="#e2483d" opacity={0.35} />
      {[0, 20, 40, 60].map((cm) => (
        <g key={cm}>
          <path d={`M 820 ${ROOF_Y - 20 - cm * PX_PER_CM} L 860 ${ROOF_Y - 20 - cm * PX_PER_CM}`} stroke={INK} strokeWidth={5} />
          <text x={900} y={ROOF_Y - 8 - cm * PX_PER_CM} fontFamily={fontFamily} fontWeight={800} fontSize={34} fill={INK}>
            {cm} cm
          </text>
        </g>
      ))}
      <path d={`M 150 ${ROOF_Y + 480} L 770 ${ROOF_Y + 480}`} {...LINE} />
    </g>
  );
};
