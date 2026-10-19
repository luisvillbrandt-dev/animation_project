// Test sheet: all stickman poses side by side. Every 2 seconds the faces switch:
// first each pose with its own face, then all worried, then all scared.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Expression, POSES, Stickman } from "./components/Stickman";

const FACE_ROUNDS: (Expression | undefined)[] = [undefined, "worried", "scared"];
import { HEIGHT, SAFE_TOP, WIDTH } from "./video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const INK = "#1d2433";
const ACCENT = "#c8553d";
const PAPER = "#f3ead8";

const COLUMNS = [300, 780];
const FIRST_ROW = 360;
const ROW_HEIGHT = 390;

export const StickmanTest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const expression = FACE_ROUNDS[Math.floor(frame / (2 * fps)) % FACE_ROUNDS.length];

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <g fontFamily={fontFamily} fontWeight={800} textAnchor="middle">
          <text x={WIDTH / 2} y={SAFE_TOP + 70} fontSize={56} fill={INK}>
            STICKMAN TEST
          </text>
          <text x={WIDTH / 2} y={SAFE_TOP + 126} fontSize={40} fill={ACCENT}>
            expression: {expression ?? "each pose's own"}
          </text>

          {POSES.map((pose, i) => {
            const x = COLUMNS[i % 2];
            const rowTop = FIRST_ROW + Math.floor(i / 2) * ROW_HEIGHT;
            const feet = rowTop + 300;
            return (
              <g key={pose}>
                <line
                  x1={x - 120}
                  x2={x + 120}
                  y1={feet}
                  y2={feet}
                  stroke={INK}
                  strokeOpacity={0.2}
                  strokeWidth={8}
                  strokeLinecap="round"
                />
                <Stickman
                  pose={pose}
                  expression={expression}
                  x={x}
                  y={feet}
                  scale={1.35}
                  color={INK}
                  seed={i * 0.37}
                />
                <text x={x} y={rowTop + 362} fontSize={40} fill={INK}>
                  {pose}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
