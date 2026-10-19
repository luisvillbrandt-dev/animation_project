// Character test: Tony big in frame, waving and smiling at the viewer,
// with the episode's destination blurred behind him (intro shot).
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill } from "remotion";
import { INK, StreetVesuvius } from "./components/backgrounds/StreetVesuvius";
import { Accessory, Stickman } from "./components/Stickman";
import { HEIGHT, SAFE_TOP, WIDTH } from "./video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

export type TonyVariant = "a" | "b" | "c" | "d" | "e" | "f";

export const TONY_VARIANTS: Record<
  TonyVariant,
  { label: string; accessories: Accessory[]; accent: string; accent2?: string }
> = {
  a: { label: "A · Goggles + red scarf", accessories: ["goggles", "scarf"], accent: "#e2483d" },
  b: { label: "B · Orange cap + time backpack", accessories: ["cap", "backpack"], accent: "#f28b2c" },
  c: { label: "C · Hair curl + glowing watch", accessories: ["curl", "watch"], accent: "#e2483d" },
  d: { label: "D · Backwards cap + headphones", accessories: ["capBack", "headphones"], accent: "#2f8fd1", accent2: "#f28b2c" },
  e: { label: "E · Bucket hat + time satchel", accessories: ["bucketHat", "satchel"], accent: "#f2c12e", accent2: "#8a5432" },
  f: { label: "F · Beanie + time backpack", accessories: ["beanie", "backpack"], accent: "#e2483d", accent2: "#2e4a6b" },
};

export const TonyTest: React.FC<{ variant: TonyVariant }> = ({ variant }) => {
  const v = TONY_VARIANTS[variant];
  return (
    <AbsoluteFill style={{ backgroundColor: "#d6ccb4" }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <defs>
          <filter id="intro-blur" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={16} />
          </filter>
        </defs>
        <g filter="url(#intro-blur)">
          <StreetVesuvius stage="ash" />
        </g>
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#fbefd6" opacity={0.18} />

        <Stickman pose="waving" x={540} y={1780} scale={4.2} color={INK} accessories={v.accessories} accent={v.accent} accent2={v.accent2} />

        <g fontFamily={fontFamily} fontWeight={800} textAnchor="middle">
          <text x={WIDTH / 2} y={SAFE_TOP + 40} fontSize={34} fill={INK}>
            {v.label}
          </text>
          <text x={WIDTH / 2} y={560} fontSize={104} fill="#ffffff" stroke={INK} strokeWidth={18} strokeLinejoin="round" paintOrder="stroke">
            THIS IS TONY.
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
