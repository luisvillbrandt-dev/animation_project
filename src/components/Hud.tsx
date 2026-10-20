// The on-screen UI of the weekly show: "DAY X/7" on the left, the SURVIVAL meter on the right.
// SURVIVAL is a joke meter, not a fact. Below 15 % it blinks red. Sits just under the top 10 %.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill } from "remotion";
import { INK } from "./backgrounds/StreetVesuvius";
import { SAFE_TOP } from "../video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const meterColor = (v: number) => (v > 60 ? "#5bbf6a" : v > 30 ? "#f2c12e" : "#e2483d");

export const Hud: React.FC<{ day: number; of: number; survival: number; frame: number }> = ({ day, of, survival, frame }) => {
  const critical = survival <= 15;
  const blink = critical && Math.floor(frame / 6) % 2 === 0;
  const pill = { background: INK, borderRadius: 30, padding: "10px 24px", color: "#fbefd6", fontSize: 38 } as const;
  return (
    <AbsoluteFill style={{ fontFamily, fontWeight: 800, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: SAFE_TOP + 14, left: 60, right: 60, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={pill}>DAY {day}/{of}</div>
        <div style={{ ...pill, display: "flex", alignItems: "center", gap: 16, background: blink ? "#e2483d" : INK }}>
          <span>SURVIVAL</span>
          <div style={{ width: 220, height: 30, borderRadius: 15, background: "rgba(251,239,214,0.25)", overflow: "hidden" }}>
            <div style={{ width: `${survival}%`, height: "100%", background: blink ? "#fbefd6" : meterColor(survival) }} />
          </div>
          <span style={{ minWidth: 92, textAlign: "right" }}>{Math.round(survival)}%</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
