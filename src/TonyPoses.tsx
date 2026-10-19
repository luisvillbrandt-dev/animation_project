// Test sheet: Tony in several poses, to check that his hat and bag work in motion.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill } from "remotion";
import { Tony } from "./characters/Tony";
import { INK } from "./components/backgrounds/StreetVesuvius";
import { Pose } from "./components/Stickman";
import { HEIGHT, WIDTH } from "./video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const SHEET: { pose: Pose; x: number; y: number }[] = [
  { pose: "waving", x: 290, y: 880 },
  { pose: "walking", x: 790, y: 880 },
  { pose: "running", x: 290, y: 1460 },
  { pose: "shocked", x: 790, y: 1460 },
];

export const TonyPoses: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#f3ead8" }}>
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
      {SHEET.map((s) => (
        <g key={s.pose}>
          <line x1={s.x - 150} x2={s.x + 150} y1={s.y} y2={s.y} stroke={INK} strokeOpacity={0.2} strokeWidth={8} strokeLinecap="round" />
          <Tony pose={s.pose} x={s.x} y={s.y} scale={1.9} />
          <text x={s.x} y={s.y + 70} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={40} fill={INK}>
            {s.pose}
          </text>
        </g>
      ))}
    </svg>
  </AbsoluteFill>
);
