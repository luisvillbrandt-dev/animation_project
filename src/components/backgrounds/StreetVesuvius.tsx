// Background: a street in Pompeii with Mount Vesuvius behind the houses.
// Drawn in one of the candidate styles (see STYLES) so we can compare them.
// Render inside a 1080x1920 <svg>.

export type StyleName = "warm" | "dusk" | "line";

export type Palette = {
  label: string;
  skyTop: string;
  skyBottom: string;
  sun: string;
  sunStroke: string;
  sunX: number;
  sunY: number;
  sunR: number;
  volcano: string;
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
  stickman: string;
  headFill: string;
};

export const STYLES: Record<StyleName, Palette> = {
  warm: {
    label: "A · Warm flat",
    skyTop: "#f8e7c6",
    skyBottom: "#f3d9a8",
    sun: "#f4b860",
    sunStroke: "#1d2433",
    sunX: 860,
    sunY: 420,
    sunR: 70,
    volcano: "#8c6a55",
    smoke: "#ece3d6",
    smokeStroke: "#1d2433",
    wall: "#eab887",
    wallAlt: "#e2a574",
    roof: "#b5533a",
    opening: "#3b2a24",
    glow: "#f59a3c",
    ground: "#cfab80",
    cobble: "#b9946a",
    outline: "#1d2433",
    stickman: "#1d2433",
    headFill: "#ffffff",
  },
  dusk: {
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
    stickman: "#fff3e3",
    headFill: "#24151d",
  },
  line: {
    label: "C · Line art",
    skyTop: "#fbfaf6",
    skyBottom: "#fbfaf6",
    sun: "#fbfaf6",
    sunStroke: "#1d2433",
    sunX: 860,
    sunY: 420,
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
    outline: "#1d2433",
    stickman: "#1d2433",
    headFill: "#ffffff",
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

export const StreetVesuvius: React.FC<{ style: StyleName }> = ({ style }) => {
  const p = STYLES[style];
  const line = p.outline === "none" ? {} : { stroke: p.outline, strokeWidth: 8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const gradientId = `sky-${style}`;

  const roof = (x: number, w: number, top: number) =>
    `M ${x - 24} ${top} L ${x + w / 2} ${top - 70} L ${x + w + 24} ${top} Z`;

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
      <circle cx={p.sunX} cy={p.sunY} r={p.sunR} fill={p.sun} stroke={p.sunStroke} strokeWidth={8} />

      {/* Vesuvius with its two peaks, and a thin wisp of smoke */}
      <path
        d="M -40 1320 L 360 780 Q 430 735 500 770 L 545 750 Q 610 730 680 778 L 1120 1320 Z"
        fill={p.volcano}
        {...line}
      />
      {[
        [590, 712, 20],
        [622, 668, 27],
        [664, 628, 34],
      ].map(([cx, cy, r]) => (
        <circle key={cx} cx={cx} cy={cy} r={r} fill={p.smoke} stroke={p.smokeStroke} strokeWidth={6} />
      ))}

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
    </g>
  );
};
