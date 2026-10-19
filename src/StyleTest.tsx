// Style test: the baker in front of his shop, in one of the three mood stages.
// Includes a caption mock-up to check that captions fit above the stickman.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { INK, STAGES, Stage, StreetVesuvius } from "./components/backgrounds/StreetVesuvius";
import { Pose, Stickman } from "./components/Stickman";
import { HEIGHT, SAFE_TOP, WIDTH } from "./video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const BAKER = { x: 460, y: 1440, scale: 2.8 };
const HEAD_Y = 850; // roughly where his head is; the camera zooms in toward it

const SHOT: Record<Stage, { pose: Pose; caption: string[]; pillow?: boolean }> = {
  day: { pose: "idle", caption: ["A NORMAL DAY."] },
  ash: { pose: "shocked", caption: ["PUMICE.", "LIGHT."] },
  dark: { pose: "deciding", caption: ["YOU HAVE TO", "CHOOSE."], pillow: true },
};

export const StyleTest: React.FC<{ stage: Stage }> = ({ stage }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = STAGES[stage];
  const shot = SHOT[stage];
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06]); // slow push-in

  return (
    <AbsoluteFill style={{ backgroundColor: p.skyTop }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <g transform={`translate(${BAKER.x} ${HEAD_Y}) scale(${zoom}) translate(${-BAKER.x} ${-HEAD_Y})`}>
          <StreetVesuvius stage={stage} />
          <Stickman
            pose={shot.pose}
            x={BAKER.x}
            y={BAKER.y}
            scale={BAKER.scale}
            color={INK}
            rim={p.rim}
            accessories={shot.pillow ? ["pillow"] : []}
          />
        </g>

        <g fontFamily={fontFamily} fontWeight={800} textAnchor="middle">
          <text x={WIDTH / 2} y={SAFE_TOP + 40} fontSize={34} fill={stage === "dark" ? "#f3e6d3" : INK}>
            {p.label}
          </text>
          {/* Caption mock-up: band between y 480 and 760, max 2 lines */}
          {shot.caption.map((text, i) => (
            <text
              key={text}
              x={WIDTH / 2}
              y={shot.caption.length === 1 ? 650 : 600 + i * 104}
              fontSize={92}
              fill="#ffffff"
              stroke={INK}
              strokeWidth={16}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {text}
            </text>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
