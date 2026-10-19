// Style test: the same street scene with the baker, in one style or mood stage.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { INK, STYLES, StreetVesuvius, StyleName } from "./components/backgrounds/StreetVesuvius";
import { Pose, Stickman } from "./components/Stickman";
import { HEIGHT, SAFE_TOP, WIDTH } from "./video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const POSE_FOR: Record<StyleName, Pose> = {
  warm: "idle",
  ash: "shocked",
  dark: "deciding",
  dusk: "idle",
  line: "idle",
};

export const StyleTest: React.FC<{ style: StyleName }> = ({ style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = STYLES[style];
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06]); // slow camera push-in
  const darkSky = style === "dark";

  return (
    <AbsoluteFill style={{ backgroundColor: p.skyTop }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <g transform={`translate(540 1300) scale(${zoom}) translate(-540 -1300)`}>
          <StreetVesuvius style={style} />
          <Stickman pose={POSE_FOR[style]} x={470} y={1530} scale={2.1} color={INK} rim={p.rim} />
        </g>
        <text
          x={WIDTH / 2}
          y={SAFE_TOP + 60}
          textAnchor="middle"
          fontFamily={fontFamily}
          fontWeight={800}
          fontSize={48}
          fill={darkSky ? "#f3e6d3" : INK}
        >
          {p.label}
        </text>
      </svg>
    </AbsoluteFill>
  );
};
