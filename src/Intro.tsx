// Episode intro (~6.5 s):
// 1. Hook: Tony big in frame, waving at the viewer, the destination blurred behind him.
// 2. Jump: he cheers and jumps, his time device flashes.
// 3. Timeline: he lands on a timeline at today's year; a giant hand pushes him back in time,
//    he tumbles along the timeline while the year counts down.
// 4. Portal: at the target year a portal opens, he dives in, it widens into the first scene.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill, Easing, Html5Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Tony } from "./characters/Tony";
import { INK, Stage, StreetVesuvius } from "./components/backgrounds/StreetVesuvius";
import { GiantFist } from "./components/GiantHand";
import { Expression, Pose } from "./components/Stickman";
import { FPS, HEIGHT, SAFE_TOP, WIDTH } from "./video";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

const F = (seconds: number) => Math.round(seconds * FPS);
export const INTRO_FRAMES = F(6.5);

// When each part happens (in frames).
const T = {
  jump: F(1.9),
  timeline: F(2.4),
  handIn: F(2.7), // the giant hand slides in from the right
  windup: F(3.0), // it pulls back a little
  push: F(3.15), // and pushes Tony back in time
  scrollEnd: F(4.25), // he lands at the target year
  portalOpen: F(4.3),
  dive: F(4.45),
  irisStart: F(4.65),
  irisEnd: F(5.2),
  land: F(5.05),
  tag: F(5.35),
};
const HIT = T.push + 2; // the frame in which the fist reaches him
const scrollStart = HIT;

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
      <Html5Audio src={staticFile("intro-test/voice/voice.wav")} />
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

// 3: the timeline. Older years lie to the left. Tony stands at today's year, a giant fist comes in
// from the right and punches him away; he tumbles back along the timeline to the target year.
const TONY_SCALE = 1.6;
const BODY_Y = LINE_Y - 190; // middle of Tony's body on the timeline
const FIST_SCALE = 1.7;

// An 8-point comic star for the moment of impact.
const STAR = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8;
  const r = i % 2 ? 0.45 : 1;
  return `${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`;
}).join(" ");

const TimelineShot: React.FC<{ frame: number; year: number }> = ({ frame, year }) => {
  const scroll = (f: number) =>
    interpolate(f, [scrollStart, T.scrollEnd], [NOW, year], { ...clamp, easing: Easing.out(Easing.cubic) });
  const current = scroll(frame);
  const speed = Math.abs(scroll(frame + 1) - current);
  const xOf = (y: number) => 540 + (y - current) * PX_PER_YEAR;

  const drop = interpolate(frame, [T.timeline, T.timeline + F(0.4)], [-700, 0], { ...clamp, easing: Easing.bounce });
  const shrink = interpolate(frame, [T.dive, T.dive + F(0.25)], [1, 0], { ...clamp, easing: Easing.in(Easing.quad) });

  // Flight after the push: an arc over the line with two backflips, upright again on landing.
  const p = interpolate(frame, [HIT, T.scrollEnd], [0, 1], clamp);
  const lift = -Math.sin(Math.PI * p) * 110;
  const spin = -720 * Easing.out(Easing.cubic)(p);

  // The fist: slides in, winds up far, punches, then is left behind on the right.
  // The knuckles are about 156 px left of fistX, so fistX 736 hits his back. The camera follows Tony,
  // so right after the hit the fist falls back to the right instead of passing over him.
  const fistX =
    frame < T.windup
      ? interpolate(frame, [T.handIn, T.windup], [1500, 820], { ...clamp, easing: Easing.out(Easing.cubic) })
      : frame < T.push
        ? interpolate(frame, [T.windup, T.push], [820, 980], { ...clamp, easing: Easing.out(Easing.quad) })
        : frame < HIT
          ? interpolate(frame, [T.push, HIT], [980, 736], { ...clamp, easing: Easing.in(Easing.quad) })
          : interpolate(frame, [HIT, HIT + F(0.3)], [736, 1500], { ...clamp, easing: Easing.in(Easing.quad) });
  // Short offsets in whole frames (at 30 fps tiny second values would round to the same frame).
  const jolt = interpolate(frame, [HIT, HIT + 2, HIT + 13], [0, -150, 0], clamp);
  const impact = interpolate(frame, [HIT, HIT + 1, HIT + 5], [0, 1, 0], clamp);
  // Short camera shake on the hit.
  const shake = impact > 0 ? { x: Math.sin(frame * 2.7) * 16 * impact, y: Math.cos(frame * 3.1) * 12 * impact } : { x: 0, y: 0 };

  let pose: Pose = "pointing"; // he points into the past and does not see the fist coming
  let face: Expression | undefined;
  if (frame >= HIT && frame < T.scrollEnd) {
    pose = "shocked";
    face = "shocked";
  }
  if (frame >= T.scrollEnd) {
    pose = "shocked";
    face = "happy";
  }

  // Century ticks from 100 AD to 2000 AD (there is no year 0).
  const centuries = Array.from({ length: 20 }, (_, i) => (i + 1) * 100).filter((y) => Math.abs(xOf(y) - 540) < 700);

  return (
    <g transform={`translate(${shake.x} ${shake.y})`}>
      <rect x={-40} y={-40} width={WIDTH + 80} height={HEIGHT + 80} fill="url(#intro-void)" />
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
          y={820}
          fontSize={130}
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
        <g transform={`translate(${jolt} ${lift}) rotate(${spin} 540 ${BODY_Y})`}>
          <Tony pose={pose} expression={face} x={540} y={LINE_Y - 7 + drop} scale={TONY_SCALE} facing="left" />
        </g>
      </g>

      {frame >= T.handIn && fistX < 1450 && <GiantFist x={fistX} y={BODY_Y} scale={FIST_SCALE} />}

      {/* Comic impact star where the fist hits him */}
      {impact > 0 && (
        <g transform={`translate(570 ${BODY_Y}) scale(${80 + 60 * impact}) rotate(${frame * 4})`} opacity={Math.min(1, impact * 2)}>
          <polygon points={STAR} fill="#f2c12e" stroke={INK} strokeWidth={0.06} strokeLinejoin="round" />
          <polygon points={STAR} fill="#ffffff" transform="scale(0.45)" />
        </g>
      )}
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
