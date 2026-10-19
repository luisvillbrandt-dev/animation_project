// Background: the baker's shop on a street in Pompeii, Vesuvius behind the houses.
// Style A ("warm flat"). Over the episode it darkens in three stages: day -> ash -> dark.
// Historical notes behind the drawing: notes/facts/ep01-pompeii-part1.md (visual check).
// Render inside a 1080x1920 <svg>.
import { useCurrentFrame } from "remotion";

export type Stage = "day" | "ash" | "dark";

export const INK = "#1d2433"; // only the stickman is this dark; background lines are brown

export type Palette = {
  label: string;
  skyTop: string;
  skyBottom: string;
  sun: string;
  sunR: number; // 0 = no sun
  volcano: string;
  vines: string; // vineyards on the lower slopes
  plume: boolean; // the ash column
  smoke: string;
  smokeBlotch: string;
  outline: string;
  wall: string;
  wallAlt: string;
  wallBand: string; // painted lower band of the facade
  roof: string;
  opening: string; // windows and the shop's inside
  wood: string;
  ovenStone: string;
  glow: string; // fire in the oven mouth
  counter: string;
  bread: string;
  breadCut: string;
  sidewalk: string;
  curbFace: string;
  road: string; // gaps between the paving stones
  stone: string;
  stepping: string;
  pumice: string; // "none" = no falling stones
  pumiceSize: [number, number];
  pile: number; // height of pumice piled on roofs and the curb
  lamp: boolean; // oil lamp on the counter
  rim: string; // light edge around the stickman, "none" = no edge
};

const DAY: Palette = {
  label: "1 · A normal day",
  skyTop: "#fbefd6",
  skyBottom: "#f5d9a6",
  sun: "#f8cf7c",
  sunR: 46,
  volcano: "#8b7666",
  vines: "#8f9b5a",
  plume: false,
  smoke: "#e2dcd0",
  smokeBlotch: "#b9ad9c",
  outline: "#4a3428",
  wall: "#e9a66c",
  wallAlt: "#e0975c",
  wallBand: "#c0613f",
  roof: "#b24f36",
  opening: "#6d4636",
  wood: "#7a4a2e",
  ovenStone: "#b8a48d",
  glow: "#f59a3c",
  counter: "#dcc4a2",
  bread: "#c4823f",
  breadCut: "#7f4a22",
  sidewalk: "#cdb08c",
  curbFace: "#a88866",
  road: "#8d7560",
  stone: "#a68b72",
  stepping: "#d9c6aa",
  pumice: "none",
  pumiceSize: [4, 8],
  pile: 0,
  lamp: false,
  rim: "none",
};

export const STAGES: Record<Stage, Palette> = {
  day: DAY,
  ash: {
    ...DAY,
    label: "2 · The ash column",
    skyTop: "#d6ccb4",
    skyBottom: "#b4a587",
    sunR: 0,
    volcano: "#6e5e52",
    vines: "#6f7350",
    plume: true,
    wall: "#d09a6e",
    wallAlt: "#c58c60",
    wallBand: "#a95a3e",
    roof: "#9a4a35",
    opening: "#5e4034",
    ovenStone: "#a8977f",
    counter: "#c8b496",
    sidewalk: "#bba283",
    curbFace: "#988066",
    road: "#7e6a58",
    stone: "#94806b",
    stepping: "#c9b89e",
    pumice: "#f3eee4", // the first pumice was white
    pile: 16,
  },
  dark: {
    ...DAY,
    label: "3 · Darkness",
    skyTop: "#241f22",
    skyBottom: "#742f22",
    sunR: 0,
    volcano: "#3b2c29",
    vines: "#34332a",
    plume: true,
    smoke: "#6d635c",
    smokeBlotch: "#4f4642",
    outline: "#5a4235",
    wall: "#7a5e4b",
    wallAlt: "#6f5444",
    wallBand: "#5d3a2c",
    roof: "#4f2a20",
    opening: "#2e211c",
    wood: "#3e2a20",
    ovenStone: "#6b5d50",
    glow: "#ff8c3a",
    counter: "#7c6a58",
    bread: "#8f5d30",
    breadCut: "#4a2c15",
    sidewalk: "#5e4c3f",
    curbFace: "#4a3b31",
    road: "#3e3129",
    stone: "#4d3d33",
    stepping: "#6f5f50",
    pumice: "#b3aca3", // later the pumice turned grey and bigger
    pumiceSize: [6, 11],
    pile: 42,
    lamp: true,
    rim: "#f3e6d3",
  },
};

const STREET_Y = 1300; // the houses stand here; the raised sidewalk starts here
const CURB_Y = 1350; // front edge of the sidewalk
const ROAD_Y = CURB_Y + 18; // below the curb face

type House = { x: number; w: number; h: number; alt?: boolean; window: number };
const HOUSES: House[] = [
  { x: -40, w: 260, h: 470, window: 80 },
  { x: 860, w: 260, h: 450, alt: true, window: 120 },
];
const BAKERY = { x: 200, w: 680, h: 560 };
const SHOP = { x: 680, w: 170, top: 1000 }; // wide shop opening with a flat wooden lintel

// Vesuvius as one broad cone with a flat top (the twin peaks of today are documented only later).
const VOLCANO = "M -80 1000 L 330 470 Q 360 425 410 420 L 670 420 Q 720 425 750 470 L 1160 1000 Z";

// The ash column: a narrow trunk that spreads into a flat umbrella at the top (Pliny's pine).
const PLUME_TRUNK = "M 508 425 C 518 330 505 235 485 150 L 595 150 C 575 235 562 330 572 425 Z";
const PLUME_CANOPY: [number, number, number][] = [
  [180, 130, 70],
  [300, 100, 85],
  [430, 80, 95],
  [560, 75, 100],
  [690, 85, 92],
  [820, 110, 80],
  [935, 140, 62],
];
const PLUME_BLOTCHES: [number, number, number][] = [
  [380, 110, 26],
  [600, 70, 30],
  [760, 120, 22],
  [540, 260, 14],
];

// Deterministic "random" numbers, so every render looks the same.
const noise = (i: number) => {
  const v = Math.sin(i * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

// Irregular paving stones in staggered rows.
const PAVING = (() => {
  const stones: string[] = [];
  let n = 0;
  for (let row = 0, y = ROAD_Y + 22; y < 1920; row++, y += 62) {
    for (let x = row % 2 ? -70 : -20; x < 1080; n++) {
      const w = 80 + noise(n) * 55;
      const j = (k: number) => (noise(n * 7 + k) - 0.5) * 14;
      stones.push(
        `M ${x + j(1)} ${y + j(2)} L ${x + w + j(3)} ${y + j(4)} L ${x + w + j(5)} ${y + 48 + j(6)} L ${x + j(7)} ${y + 48 + j(8)} Z`,
      );
      x += w + 12;
    }
  }
  return stones;
})();

// Falling pumice: fixed columns, each stone loops from top to bottom.
const PUMICE = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 241) % 1080,
  offset: (i * 397) % 1920,
  speed: 9 + ((i * 7) % 6),
  size: noise(i + 100),
}));

// A heap of pumice along a line: round lumps of slightly different heights.
const pilePath = (x0: number, x1: number, y: number, h: number) => {
  const lump = 46;
  let d = `M ${x0} ${y}`;
  for (let x = x0, i = 0; x < x1; x += lump, i++) {
    d += ` A ${lump / 2} ${h * (0.7 + 0.5 * noise(i + x0))} 0 0 1 ${x + lump} ${y}`;
  }
  return `${d} L ${x1} ${y + 2} L ${x0} ${y + 2} Z`;
};

// Wavy top edge of the vineyards on the volcano's lower slopes.
const VINES_EDGE = (() => {
  let d = "M -100 690";
  for (let x = -100, i = 0; x < 1200; x += 80, i++) {
    d += ` Q ${x + 40} ${i % 2 ? 660 : 715} ${x + 80} 690`;
  }
  return `${d} L 1200 1100 L -100 1100 Z`;
})();

type Props = {
  stage: Stage;
  plume?: number; // 0..1: how far the ash column has grown (overrides the stage); for the eruption
  pumice?: boolean; // overrides whether stones fall
};

const CRATER = { x: 540, y: 425 };

export const StreetVesuvius: React.FC<Props> = ({ stage, plume: grow, pumice }) => {
  const frame = useCurrentFrame();
  const base = STAGES[stage];
  const noStones = pumice === false;
  const p = {
    ...base,
    plume: grow === undefined ? base.plume : grow > 0,
    pumice: noStones ? "none" : base.pumice,
    pile: noStones ? 0 : base.pile,
  };
  const plumeScale = grow === undefined ? 1 : grow;
  const flash = grow === undefined ? 0 : Math.max(0, 1 - grow * 4); // bright burst at the very start
  const line = { stroke: p.outline, strokeWidth: 7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const id = (name: string) => `${name}-${stage}`;

  // Flat tile roof: a slab with rows of tiles.
  const roof = (x: number, w: number, top: number) => (
    <g>
      <rect x={x - 18} y={top - 30} width={w + 36} height={30} fill={p.roof} {...line} />
      {Array.from({ length: Math.floor((w + 36) / 34) - 1 }, (_, i) => (
        <path key={i} d={`M ${x + 16 + i * 34} ${top - 26} L ${x + 16 + i * 34} ${top - 4}`} stroke={p.outline} strokeWidth={3} strokeLinecap="round" />
      ))}
      {p.pile > 0 && <path d={pilePath(x - 18, x + w + 18, top - 30, p.pile * 0.6)} fill={p.pumice} stroke={p.outline} strokeWidth={4} />}
    </g>
  );

  // Drawn twice: a wide outline pass, then the fill on top, so the clouds merge into one shape.
  const plume = (fill: string, stroke: string, width: number) => (
    <g fill={fill} stroke={stroke} strokeWidth={width} strokeLinejoin="round">
      <path d={PLUME_TRUNK} />
      {PLUME_CANOPY.map(([cx, cy, r]) => (
        <circle key={cx} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>
        <clipPath id={id("volcano")}>
          <path d={VOLCANO} />
        </clipPath>
        <radialGradient id={id("lamp")}>
          <stop offset="0" stopColor="#ffc46b" stopOpacity={0.55} />
          <stop offset="1" stopColor="#ffc46b" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect x={0} y={0} width={1080} height={STREET_Y} fill={`url(#${id("sky")})`} />
      {p.sunR > 0 && <circle cx={900} cy={330} r={p.sunR} fill={p.sun} />}

      {/* Ash column */}
      {p.plume && (
        <g transform={`translate(${CRATER.x} ${CRATER.y}) scale(${0.15 + 0.85 * plumeScale} ${plumeScale}) translate(${-CRATER.x} ${-CRATER.y})`}>
          {plume(p.outline, p.outline, 14)}
          {plume(p.smoke, "none", 0)}
          {PLUME_BLOTCHES.map(([cx, cy, r]) => (
            <circle key={cx} cx={cx} cy={cy} r={r} fill={p.smokeBlotch} />
          ))}
        </g>
      )}
      {flash > 0 && <circle cx={CRATER.x} cy={CRATER.y} r={60 + 260 * (1 - flash)} fill="#fff1c9" opacity={flash} />}

      {/* Vesuvius: grey-brown top, vineyards on the lower slopes */}
      <path d={VOLCANO} fill={p.volcano} />
      <path d={VINES_EDGE} fill={p.vines} clipPath={`url(#${id("volcano")})`} />
      <path d={VOLCANO} fill="none" {...line} />

      {/* Side houses: plain walls, one small window high up */}
      {HOUSES.map((h) => {
        const top = STREET_Y - h.h;
        return (
          <g key={h.x}>
            <rect x={h.x} y={top} width={h.w} height={h.h} fill={h.alt ? p.wallAlt : p.wall} {...line} />
            <rect x={h.x} y={STREET_Y - 130} width={h.w} height={130} fill={p.wallBand} {...line} />
            <rect x={h.x + h.window} y={top + 70} width={44} height={54} rx={5} fill={p.opening} {...line} />
            {roof(h.x, h.w, top)}
          </g>
        );
      })}

      {/* The bakery: plain wall where the baker stands, shop opening on the right */}
      <rect x={BAKERY.x} y={STREET_Y - BAKERY.h} width={BAKERY.w} height={BAKERY.h} fill={p.wallAlt} {...line} />
      <rect x={BAKERY.x} y={STREET_Y - 130} width={BAKERY.w} height={130} fill={p.wallBand} {...line} />
      {roof(BAKERY.x, BAKERY.w, STREET_Y - BAKERY.h)}

      <rect x={SHOP.x} y={SHOP.top} width={SHOP.w} height={STREET_Y - SHOP.top} fill={p.opening} {...line} />
      {/* Domed oven at the back, fire in its mouth */}
      <path d="M 700 1225 Q 700 1095 765 1095 Q 830 1095 830 1225 Z" fill={p.ovenStone} {...line} />
      <path d="M 747 1225 L 747 1192 Q 765 1172 783 1192 L 783 1225 Z" fill={p.glow} />
      <rect x={SHOP.x - 16} y={SHOP.top - 22} width={SHOP.w + 32} height={24} fill={p.wood} {...line} />
      {/* Counter with round loaves (scored like the carbonized loaves found in Pompeii) */}
      <rect x={SHOP.x - 8} y={1222} width={SHOP.w + 16} height={STREET_Y - 1222} fill={p.counter} {...line} />
      {[712, 762].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={1206} r={19} fill={p.bread} stroke={p.outline} strokeWidth={4} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <path
                key={i}
                d={`M ${cx + Math.cos(a) * 5} ${1206 + Math.sin(a) * 5} L ${cx + Math.cos(a) * 15} ${1206 + Math.sin(a) * 15}`}
                stroke={p.breadCut}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      ))}
      {p.lamp && (
        <g>
          <circle cx={846} cy={1186} r={170} fill={`url(#${id("lamp")})`} />
          <path d="M 796 1214 Q 796 1198 818 1198 L 846 1202 L 852 1208 L 840 1214 Z" fill="#a8683a" {...line} strokeWidth={4} />
          <path d="M 849 1199 Q 840 1186 850 1172 Q 860 1186 851 1199 Z" fill="#ffd36b" />
        </g>
      )}

      {/* Raised sidewalk, curb, paving stones, stepping stones */}
      <rect x={-10} y={STREET_Y} width={1100} height={CURB_Y - STREET_Y} fill={p.sidewalk} {...line} />
      <rect x={-10} y={CURB_Y} width={1100} height={ROAD_Y - CURB_Y} fill={p.curbFace} {...line} />
      {p.pile > 0 && <path d={pilePath(-10, 1090, CURB_Y, p.pile)} fill={p.pumice} stroke={p.outline} strokeWidth={4} />}
      <rect x={-10} y={ROAD_Y} width={1100} height={1920 - ROAD_Y} fill={p.road} />
      {PAVING.map((d, i) => (
        <path key={i} d={d} fill={p.stone} stroke={p.stone} strokeWidth={10} strokeLinejoin="round" />
      ))}
      {[330, 540, 750].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy={1600} rx={62} ry={28} fill={p.curbFace} />
          <ellipse cx={cx} cy={1590} rx={62} ry={28} fill={p.stepping} {...line} />
        </g>
      ))}

      {/* Falling pumice */}
      {p.pumice !== "none" &&
        PUMICE.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={(s.offset + frame * s.speed) % 1920}
            r={p.pumiceSize[0] + s.size * (p.pumiceSize[1] - p.pumiceSize[0])}
            fill={p.pumice}
          />
        ))}
    </g>
  );
};
