// The weekly show's vote block (MSV1 beats 14-16): options A, B and C pop up one after the other
// as they are read, the one being read lights up. Tony stands next to the cards: he kicks C (the
// narrator's troll bait) and at the end points at A while his bag overloads blue.
// Cards sit below the caption band, so the word-by-word captions stay on.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Tony } from "../characters/Tony";
import { INK } from "./backgrounds/StreetVesuvius";
import { Pose } from "./Stickman";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const YELLOW = "#f2c12e";
const CREAM = "#fbefd6";
const PANEL = "#2a3550";
const GLOW = "#5ee6f0";

export type Vote3Option = { letter: "A" | "B" | "C"; title: string };

type Props = {
  options: Vote3Option[];
  shownAt: number[]; // local frame at which each option pops up
  active: number; // index of the option being read, -1 = none
  kickC: boolean; // Tony kicks the C card
  pleading: boolean; // the final beat: Tony points at A, the bag overloads
};

export const VoteCard3: React.FC<Props> = ({ options, shownAt, active, kickC, pleading }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pose: Pose = kickC ? "running" : pleading ? "pointing" : "idle";
  const kickWobble = kickC ? Math.sin(frame * 1.7) * 6 : 0;

  return (
    <AbsoluteFill style={{ background: "linear-gradient(#14203a, #1f4656)", fontFamily, fontWeight: 800 }}>
      <div style={{ position: "absolute", top: 330, width: "100%", textAlign: "center", fontSize: 96, color: YELLOW, WebkitTextStroke: `14px ${INK}`, paintOrder: "stroke fill" }}>
        YOU DECIDE!
      </div>
      <div style={{ position: "absolute", top: 800, left: 60, width: 660, display: "flex", flexDirection: "column", gap: 24 }}>
        {options.map((o, i) => {
          const pop = spring({ frame: frame - shownAt[i], fps, config: { damping: 12, stiffness: 200 } });
          const isActive = active === i;
          const isC = o.letter === "C";
          return (
            <div
              key={o.letter}
              style={{
                height: 200,
                display: "flex",
                alignItems: "center",
                gap: 26,
                padding: "0 28px",
                borderRadius: 34,
                background: isC ? "#4a2433" : PANEL,
                border: `9px solid ${isActive ? YELLOW : "rgba(251,239,214,0.25)"}`,
                opacity: frame < shownAt[i] ? 0 : 1,
                transform: `scale(${pop}) rotate(${isC ? kickWobble : 0}deg) translateX(${isC && kickC ? Math.abs(kickWobble) * -3 : 0}px)`,
              }}
            >
              <div style={{ width: 140, height: 140, flexShrink: 0, borderRadius: "50%", background: isActive ? YELLOW : CREAM, color: INK, fontSize: 104, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {o.letter}
              </div>
              <div style={{ color: CREAM, fontSize: 52, lineHeight: 1.05 }}>{o.title}</div>
            </div>
          );
        })}
      </div>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        {pleading && <circle cx={850} cy={1300} r={90 + 20 * Math.sin(frame * 0.8)} fill={GLOW} opacity={0.45} />}
        <Tony pose={pose} expression={kickC ? "strained" : pleading ? "worried" : "neutral"} x={880} y={1480} scale={1.55} facing="left" rim={CREAM} />
      </svg>
    </AbsoluteFill>
  );
};
