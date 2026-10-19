// Style comparison: the same street scene with the baker, in one of the candidate styles.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { STYLES, StreetVesuvius, StyleName } from "./components/backgrounds/StreetVesuvius";
import { Stickman } from "./components/Stickman";
import { HEIGHT, SAFE_TOP, WIDTH } from "./video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

export const StyleTest: React.FC<{ style: StyleName }> = ({ style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = STYLES[style];
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06]); // slow camera push-in

  return (
    <AbsoluteFill style={{ backgroundColor: p.skyTop }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <g transform={`translate(540 1300) scale(${zoom}) translate(-540 -1300)`}>
          <StreetVesuvius style={style} />
          <Stickman pose="idle" x={470} y={1530} scale={2.1} color={p.stickman} headFill={p.headFill} />
        </g>
        <text
          x={WIDTH / 2}
          y={SAFE_TOP + 60}
          textAnchor="middle"
          fontFamily={fontFamily}
          fontWeight={800}
          fontSize={48}
          fill={style === "dusk" ? "#2d1b25" : "#1d2433"}
        >
          {p.label}
        </text>
      </svg>
    </AbsoluteFill>
  );
};
