// Background: a street in Pompeii with Mount Vesuvius behind the houses.
// Chosen style: "warm" (A). Over the episode it darkens in stages: warm -> ash -> dark.
// "dusk" and "line" are the rejected style candidates, kept only for the comparison sheet.
// Render inside a 1080x1920 <svg>.
import { useCurrentFrame } from "remotion";

export type StyleName = "warm" | "ash" | "dark" | "dusk" | "line";

export const INK = "#1d2433"; // stickman and outlines; the stickman is always this color

export type Palette = {
  label: string;
  skyTop: string;
  skyBottom: string;
  sun: string;
  sunStroke: string;
  sunX: number;
  sunY: number;
  sunR: number; // 0 = no sun
  volcano: string;
  plume: "wisp" | "column"; // thin smoke on a normal day, the huge ash column during the eruption
  smoke: string;
  smokeStroke: string;
  wall: string;
  wallAlt: string;
  roof: string;
  opening: string; // windows and doorways
  glow: string; // warm light from the bakery oven
  ground: string;
  cobble: string;
  outline: string; // "none" = no outlines
  pumice: string; // "none" = no falling stones
  rim: string; // light edge around the stickman on dark backgrounds, "none" = no edge
};

const WARM: Palette = {
  label: "1 · A normal day",
  skyTop: "#f8e7c6",
  skyBottom: "#f3d9a8",
  sun: "#f4b860",
  sunStroke: INK,
  sunX: 860,
  sunY: 420,
  sunR: 70,
  volcano: "#8c6a55",
  plume: "wisp",
  smoke: "#ece3d6",
  smokeStroke: INK,
  wall: "#eab887",
  wallAlt: "#e2a574",
  roof: "#b5533a",
  opening: "#3b2a24",
  glow: "#f59a3c",
  ground: "#cfab80",
  cobble: "#b9946a",
  outline: INK,
  pumice: "none",
  rim: "none",
};

export const STYLES: Record<StyleName, Palette> = {
  warm: WARM,
  ash: {
    ...WARM,
    label: "2 · The ash column",
    skyTop: "#cdbfab",
    skyBottom: "#b3a28b",
    sun: "#e6cf9f",
    volcano: "#6f5646",
    plume: "column",
    smoke: "#9a8e82",
    wall: "#d2a883",
    wallAlt: "#c69871",
    roof: "#9a4934",
    ground: "#b69a77",
    cobble: "#a2865f",
    pumice: "#f1ebdf",
  },
  dark: {
    ...WARM,
    label: "3 · Darkness",
    skyTop: "#262124",
    skyBottom: "#6e3328",
    sunR: 0,
    volcano: "#3b2627",
    plume: "column",
    smoke: "#4b4040",
    wall: "#735a4a",
    wallAlt: "#684f41",
    roof: "#52291f",
    opening: "#1b1313",
    glow: "#ff8c3a",
    ground: "#4d3d34",
    cobble: "#41322a",
    pumice: "#d8d0c3",
    rim: "#f3e6d3",
  },
  dusk: {
    ...WARM,
    label: "B · Dusk silhouette",
    skyTop: "#f6b867",
    skyBottom: "#d4573f",
    sun: "#ffe1a1",
    sunStroke: "none",
    sunX: 540,
    sunY: 640,
    sunR: 190,
    volcano: "#6b2c33",
    smoke: "#8f4545",
    smokeStroke: "none",
    wall: "#2d1b25",
    wallAlt: "#38212c",
    roof: "#24151d",
    opening: "#ffc66e",
    glow: "#ffb04a",
    ground: "#24151d",
    cobble: "#33202a",
    outline: "none",
    rim: "#f3e6d3",
  },
  line: {
    ...WARM,
    label: "C · Line art",
    skyTop: "#fbfaf6",
    skyBottom: "#fbfaf6",
    sun: "#fbfaf6",
    sunR: 64,
    volcano: "#fbfaf6",
    smoke: "#fbfaf6",
    smokeStroke: "#e4572e",
    wall: "#fbfaf6",
    wallAlt: "#fbfaf6",
    roof: "#fbfaf6",
    opening: "#fbfaf6",
    glow: "#e4572e",
    ground: "#fbfaf6",
    cobble: "#fbfaf6",
  },
};

const STREET_Y = 1500; // where the houses stand and the street begins

type House = { x: number; w: number; h: number; alt?: boolean; windows: number[] };

const HOUSES: House[] = [
  { x: -30, w: 330, h: 300, windows: [70, 190] },
  { x: 780, w: 330, h: 320, alt: true, windows: [90, 210] },
];

const BAKERY = { x: 270, w: 540, h: 360 };
const DOOR = 690; // center of the bakery door, right of center so the baker stands on a plain wall

// The ash column: a trunk rising from the crater that spreads out at the top
// (Pliny the Younger compared it to an umbrella pine).
const PLUME_TRUNK = "M 505 770 C 525 610 505 470 470 330 L 640 330 C 600 470 585 610 600 770 Z";
const PLUME_CANOPY: [number, number, number][] = [
  [250, 330, 80],
  [360, 270, 105],
  [490, 230, 120],
  [630, 240, 115],
  [760, 280, 100],
  [870, 330, 80],
  [430, 350, 80],
  [680, 350, 85],
];

// Falling pumice: fixed pseudo-random columns, each stone loops from top to bottom.
const PUMICE = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 241) % 1080,
  offset: (i * 397) % 1920,
  speed: 9 + ((i * 7) % 6),
  r: 4 + ((i * 5) % 5),
}));

export const StreetVesuvius: React.FC<{ style: StyleName }> = ({ style }) => {
  const frame = useCurrentFrame();
  const p = STYLES[style];
  const line =
    p.outline === "none"
      ? {}
      : { stroke: p.outline, strokeWidth: 8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const gradientId = `sky-${style}`;

  const roof = (x: number, w: number, top: number) =>
    `M ${x - 24} ${top} L ${x + w / 2} ${top - 70} L ${x + w + 24} ${top} Z`;

  // Drawn twice: a wide outline pass, then the fill on top, so the overlapping clouds
  // merge into one shape with a single outer outline.
  const plume = (stroke: string, width: number, fill: string) => (
    <g fill={fill} stroke={stroke} strokeWidth={width} strokeLinejoin="round">
      <path d={PLUME_TRUNK} />
      {PLUME_CANOPY.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>
      </defs>

      {/* Sky and sun */}
      <rect x={0} y={0} width={1080} height={STREET_Y} fill={`url(#${gradientId})`} />
      {p.sunR > 0 && <circle cx={p.sunX} cy={p.sunY} r={p.sunR} fill={p.sun} stroke={p.sunStroke} strokeWidth={8} />}

      {/* Smoke: a thin wisp, or the ash column */}
      {p.plume === "column" ? (
        <>
          {p.smokeStroke !== "none" && plume(p.smokeStroke, 16, p.smokeStroke)}
          {plume("none", 0, p.smoke)}
        </>
      ) : (
        [
          [590, 712, 20],
          [622, 668, 27],
          [664, 628, 34],
        ].map(([cx, cy, r]) => (
          <circle key={cx} cx={cx} cy={cy} r={r} fill={p.smoke} stroke={p.smokeStroke} strokeWidth={6} />
        ))
      )}

      {/* Vesuvius */}
      <path
        d="M -40 1320 L 360 780 Q 430 735 500 770 L 545 750 Q 610 730 680 778 L 1120 1320 Z"
        fill={p.volcano}
        {...line}
      />

      {/* Side houses */}
      {HOUSES.map((h) => {
        const top = STREET_Y - h.h;
        return (
          <g key={h.x}>
            <path d={roof(h.x, h.w, top)} fill={p.roof} {...line} />
            <rect x={h.x} y={top} width={h.w} height={h.h} fill={h.alt ? p.wallAlt : p.wall} {...line} />
            {h.windows.map((wx) => (
              <rect key={wx} x={h.x + wx} y={top + 60} width={60} height={70} rx={6} fill={p.opening} {...line} />
            ))}
          </g>
        );
      })}

      {/* The bakery: wide house, arched doorway with the oven glowing inside */}
      <g>
        <path d={roof(BAKERY.x, BAKERY.w, STREET_Y - BAKERY.h)} fill={p.roof} {...line} />
        <rect x={BAKERY.x} y={STREET_Y - BAKERY.h} width={BAKERY.w} height={BAKERY.h} fill={p.wallAlt} {...line} />
        <path
          d={`M ${DOOR - 80} ${STREET_Y} L ${DOOR - 80} 1290 Q ${DOOR - 80} 1220 ${DOOR} 1220 Q ${DOOR + 80} 1220 ${DOOR + 80} 1290 L ${DOOR + 80} ${STREET_Y} Z`}
          fill={p.opening}
          {...line}
        />
        <path
          d={`M ${DOOR - 56} ${STREET_Y - 8} L ${DOOR - 56} 1440 Q ${DOOR} 1385 ${DOOR + 56} 1440 L ${DOOR + 56} ${STREET_Y - 8} Z`}
          fill={p.glow}
          stroke={style === "line" ? p.glow : "none"}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        {[310].map((wx) => (
          <rect key={wx} x={wx} y={STREET_Y - BAKERY.h + 70} width={70} height={80} rx={6} fill={p.opening} {...line} />
        ))}
      </g>

      {/* Street with a few cobbles */}
      <rect x={-10} y={STREET_Y} width={1100} height={1920 - STREET_Y + 10} fill={p.ground} {...line} />
      {[
        [90, 1600],
        [300, 1650],
        [760, 1610],
        [930, 1690],
        [180, 1760],
        [620, 1780],
        [860, 1840],
      ].map(([cx, cy]) =>
        style === "line" ? (
          <path key={cx} d={`M ${cx - 40} ${cy} L ${cx + 40} ${cy}`} stroke={p.outline} strokeWidth={6} strokeLinecap="round" />
        ) : (
          <rect key={cx} x={cx - 55} y={cy - 18} width={110} height={36} rx={18} fill={p.cobble} />
        ),
      )}

      {/* Falling pumice */}
      {p.pumice !== "none" &&
        PUMICE.map((s, i) => (
          <circle key={i} cx={s.x} cy={(s.offset + frame * s.speed) % 1920} r={s.r} fill={p.pumice} />
        ))}
    </g>
  );
};
