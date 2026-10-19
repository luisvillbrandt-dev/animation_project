// The final scene of every episode: big A and B, the two options, "Part 2 tomorrow".
// The option that is being read out lights up.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Tony } from "../characters/Tony";
import { INK } from "./backgrounds/StreetVesuvius";
import { Pose } from "./Stickman";
import { SAFE_BOTTOM, SAFE_TOP } from "../video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const YELLOW = "#f2c12e";
const CREAM = "#fbefd6";
const PANEL = "#2a3550";

export type VoteOption = { letter: "A" | "B"; title: string; detail: string; pose: Pose };

type Props = {
  options: [VoteOption, VoteOption];
  active: "A" | "B" | "both";
};

export const VoteCard: React.FC<Props> = ({ options, active }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 160 } });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(#14203a, #1f4656)`, fontFamily, fontWeight: 800 }}>
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP + 40,
          bottom: SAFE_BOTTOM + 10,
          left: 70,
          right: 70,
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        <div style={{ textAlign: "center", fontSize: 118, color: YELLOW, WebkitTextStroke: `16px ${INK}`, paintOrder: "stroke fill", transform: `scale(${enter(0)})` }}>
          YOU DECIDE!
        </div>

        {options.map((o, i) => {
          const isActive = active === "both" || active === o.letter;
          const slide = enter(4 + i * 4);
          return (
            <div
              key={o.letter}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 30,
                padding: "0 34px",
                borderRadius: 40,
                background: PANEL,
                border: `10px solid ${isActive ? YELLOW : "rgba(251,239,214,0.25)"}`,
                opacity: isActive ? 1 : 0.55,
                transform: `translateX(${(1 - slide) * (i === 0 ? -900 : 900)}px) scale(${isActive && active !== "both" ? 1.03 : 1})`,
              }}
            >
              <div
                style={{
                  width: 190,
                  height: 190,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: isActive ? YELLOW : CREAM,
                  color: INK,
                  fontSize: 140,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {o.letter}
              </div>
              <div style={{ flex: 1, color: CREAM }}>
                <div style={{ fontSize: 66, lineHeight: 1.05 }}>{o.title}</div>
                <div style={{ fontSize: 36, lineHeight: 1.2, marginTop: 14, opacity: 0.75 }}>{o.detail}</div>
              </div>
              <svg width={170} height={300} viewBox="0 0 170 300" style={{ flexShrink: 0 }}>
                <Tony pose={o.pose} x={85} y={290} scale={1.12} facing={i === 0 ? "left" : "right"} rim="#fbefd6" />
              </svg>
            </div>
          );
        })}

        <div style={{ textAlign: "center", color: CREAM, fontSize: 56, transform: `scale(${enter(14)})` }}>
          COMMENT <span style={{ color: YELLOW }}>A</span> OR <span style={{ color: YELLOW }}>B</span>
          <div style={{ display: "inline-block", marginTop: 18, padding: "10px 34px", borderRadius: 40, background: YELLOW, color: INK, fontSize: 44 }}>
            PART 2 TOMORROW
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
