// Episode intro (~6.5 s):
// 1. Hook: Tony big in frame, waving at the viewer, the destination blurred behind him.
// 2. Jump: he cheers and jumps, his time device flashes.
// 3. Timeline: he lands on a timeline and runs into the past while the year counts down.
// 4. Portal: at the target year a portal opens, he dives in, it widens into the first scene.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill, Easing, Html5Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Tony } from "./characters/Tony";
import { INK, Stage, StreetVesuvius } from "./components/backgrounds/StreetVesuvius";
import { Expression, Pose } from "./components/Stickman";
import { FPS, HEIGHT, SAFE_TOP, WIDTH } from "./video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const F = (seconds: number) => Math.round(seconds * FPS);
export const INTRO_FRAMES = F(6.5);

// When each part happens (in frames).
const T = {
  jump: F(1.9),
  timeline: F(2.4),
  scrollStart: F(2.75),
  scrollEnd: F(4.2),
  portalOpen: F(4.25),
  dive: F(4.4),
  irisStart: F(4.6),
  irisEnd: F(5.15),
  land: F(5.0),
  tag: F(5.3),
};

const NOW = 2026;
const LINE_Y = 1330; // height of the timeline
const PX_PER_YEAR = 2.2;
const GLOW = "#5ee6f0"; // same light as Tony's time device
const CREAM = "#fbefd6";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Hook caption mock-up, timed to the spoken line. Short chunks so nothing runs off the screen;
// real word-timed captions come later from the caption step.
const CAPTIONS: { from: number; to: number; text: string }[] = [
  { from: 0, to: F(1.25), text: "THIS IS TONY." },
  { from: F(1.25), to: F(1.8), text: "TODAY," },
  { from: F(1.8), to: F(2.45), text: "HE TRAVELS" },
  { from: F(2.45), to: F(3.0), text: "TO ANCIENT" },
  { from: F(3.0), to: F(3.8), text: "POMPEII." },
];

type Props = { place: string; year: number; stage: Stage };

export const Intro: React.FC<Props> = ({ place, year, stage }) => {
  const frame = useCurrentFrame();
  const caption = CAPTIONS.find((c) => frame >= c.from && frame < c.to);
  const irisR =
    frame < T.irisStart
      ? interpolate(frame, [T.portalOpen, T.portalOpen + F(0.25)], [0, 80], { ...clamp, easing: Easing.out(Easing.back(2)) })
      : interpolate(frame, [T.irisStart, T.irisEnd], [80, 1450], { ...clamp, easing: Easing.in(Easing.cubic) });

  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Html5Audio src={staticFile("intro-test-voice.wav")} />
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <defs>
          <filter id="intro-blur" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={16} />
          </filter>
          <radialGradient id="intro-glow">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.35" stopColor={GLOW} />
            <stop offset="1" stopColor={GLOW} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="intro-void" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14203a" />
            <stop offset="1" stopColor="#1f4656" />
          </linearGradient>
          <clipPath id="intro-iris">
            <circle cx={540} cy={LINE_Y} r={irisR} />
          </clipPath>
        </defs>

        {frame < T.timeline ? <HookShot frame={frame} stage={stage} /> : <TimelineShot frame={frame} year={year} />}

        {/* The destination, revealed through the portal */}
        {frame >= T.portalOpen && (
          <g clipPath="url(#intro-iris)">
            <ArrivalShot frame={frame} place={place} year={year} />
          </g>
        )}
        {frame >= T.portalOpen && frame < T.irisEnd && (
          <circle cx={540} cy={LINE_Y} r={irisR} fill="none" stroke={GLOW} strokeWidth={18} opacity={0.9} />
        )}

        {/* Flash when he jumps */}
        <rect
          width={WIDTH}
          height={HEIGHT}
          fill="#eafcff"
          opacity={interpolate(frame, [T.timeline - F(0.12), T.timeline, T.timeline + F(0.3)], [0, 1, 0], clamp)}
        />

        {caption && <Caption text={caption.text} />}
      </svg>
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ text: string }> = ({ text }) => (
  <text
    x={WIDTH / 2}
    y={600}
    textAnchor="middle"
    fontFamily={fontFamily}
    fontWeight={800}
    fontSize={96}
    fill="#ffffff"
    stroke={INK}
    strokeWidth={18}
    strokeLinejoin="round"
    paintOrder="stroke"
  >
    {text}
  </text>
);

// 1 + 2: Tony waves in front of the blurred destination, then cheers and jumps.
const HookShot: React.FC<{ frame: number; stage: Stage }> = ({ frame, stage }) => {
  const feetY = 1780;
  const jumping = frame >= T.jump;
  const squash = interpolate(frame, [T.jump, T.jump + F(0.15), T.jump + F(0.25)], [1, 0.88, 1.06], clamp);
  const rise = interpolate(frame, [T.jump + F(0.15), T.timeline], [0, -300], { ...clamp, easing: Easing.out(Easing.quad) });
  const glow = interpolate(frame, [T.jump + F(0.1), T.timeline], [0, 1500], { ...clamp, easing: Easing.in(Easing.quad) });

  return (
    <g>
      <g filter="url(#intro-blur)">
        <StreetVesuvius stage={stage} />
      </g>
      <rect width={WIDTH} height={HEIGHT} fill={CREAM} opacity={0.18} />
      <g transform={`translate(540 ${feetY + rise}) scale(1 ${squash}) translate(-540 ${-feetY})`}>
        <Tony pose={jumping ? "shocked" : "waving"} expression="happy" x={540} y={feetY} scale={4.2} />
      </g>
      {glow > 0 && <circle cx={480} cy={1390 + rise} r={glow} fill="url(#intro-glow)" />}
    </g>
  );
};

// 3: the timeline. Older years lie to the left; Tony runs left into the past.
const TimelineShot: React.FC<{ frame: number; year: number }> = ({ frame, year }) => {
  const current = interpolate(frame, [T.scrollStart, T.scrollEnd], [NOW, year], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const speed = Math.abs(
    interpolate(frame + 1, [T.scrollStart, T.scrollEnd], [NOW, year], { ...clamp, easing: Easing.inOut(Easing.cubic) }) - current,
  );
  const xOf = (y: number) => 540 + (y - current) * PX_PER_YEAR;

  const drop = interpolate(frame, [T.timeline, T.timeline + F(0.4)], [-700, 0], { ...clamp, easing: Easing.bounce });
  const shrink = interpolate(frame, [T.dive, T.dive + F(0.25)], [1, 0], { ...clamp, easing: Easing.in(Easing.quad) });

  let pose: Pose = "pointing";
  let face: Expression | undefined;
  if (frame >= T.scrollStart && frame < T.scrollEnd) pose = "running";
  if (frame >= T.scrollEnd) {
    pose = "shocked";
    face = "happy";
  }

  const centuries = Array.from({ length: 21 }, (_, i) => i * 100).filter((y) => Math.abs(xOf(y) - 540) < 700);

  return (
    <g>
      <rect width={WIDTH} height={HEIGHT} fill="url(#intro-void)" />
      {/* Speed streaks, stronger the faster the years go by */}
      {Array.from({ length: 16 }, (_, i) => {
        const y = 220 + ((i * 263) % 1500);
        const x = ((i * 389 + frame * 70) % 1600) - 260;
        return (
          <path
            key={i}
            d={`M ${x} ${y} L ${x + 180 + (i % 3) * 60} ${y}`}
            stroke={GLOW}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={Math.min(0.5, speed / 30)}
          />
        );
      })}

      {/* The line, century ticks and the target year */}
      <path d={`M -20 ${LINE_Y} L 1100 ${LINE_Y}`} stroke={CREAM} strokeWidth={14} strokeLinecap="round" />
      <g fontFamily={fontFamily} fontWeight={800} textAnchor="middle">
        {centuries.map((y) => (
          <g key={y}>
            <path d={`M ${xOf(y)} ${LINE_Y - 22} L ${xOf(y)} ${LINE_Y + 22}`} stroke={CREAM} strokeWidth={8} strokeLinecap="round" />
            <text x={xOf(y)} y={LINE_Y + 80} fontSize={42} fill={CREAM} opacity={0.75}>
              {y}
            </text>
          </g>
        ))}
        <circle cx={xOf(year)} cy={LINE_Y} r={44} fill="url(#intro-glow)" />
        <circle cx={xOf(year)} cy={LINE_Y} r={18} fill={GLOW} stroke={CREAM} strokeWidth={6} />

        {/* Big year counter */}
        <text
          x={540}
          y={930}
          fontSize={140}
          fill="#f2c12e"
          stroke={INK}
          strokeWidth={18}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {Math.round(current)} AD
        </text>
      </g>

      <g transform={`translate(540 ${LINE_Y}) scale(${shrink}) translate(-540 ${-LINE_Y})`}>
        <Tony pose={pose} expression={face} x={540} y={LINE_Y - 7 + drop} scale={1.6} facing="left" />
      </g>
    </g>
  );
};

// 4: the first scene of the episode; Tony drops in in front of the bakery.
const ArrivalShot: React.FC<{ frame: number; place: string; year: number }> = ({ frame, place, year }) => {
  const drop = interpolate(frame, [T.land, T.land + F(0.4)], [-900, 0], { ...clamp, easing: Easing.bounce });
  const tag = interpolate(frame, [T.tag, T.tag + F(0.3)], [0, 1], clamp);
  const label = `${place.toUpperCase()} · ${year} AD`;
  return (
    <g>
      <StreetVesuvius stage="day" />
      {frame >= T.land && <Tony pose="idle" x={460} y={1440 + drop} scale={2.8} />}
      <g opacity={tag} fontFamily={fontFamily} fontWeight={800} textAnchor="middle">
        <rect x={540 - 250} y={SAFE_TOP + 10} width={500} height={84} rx={42} fill={INK} />
        <text x={540} y={SAFE_TOP + 66} fontSize={44} fill={CREAM}>
          {label}
        </text>
      </g>
    </g>
  );
};
