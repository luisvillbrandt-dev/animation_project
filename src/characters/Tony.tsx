// Tony: the time traveler who appears in every episode.
// His look never changes: yellow straw hat with a brown band, brown messenger bag
// with the glowing time device. The stickman itself is always black.
import { INK } from "../components/backgrounds/StreetVesuvius";
import { Accessory, Expression, Pose, Stickman } from "../components/Stickman";

export const TONY_LOOK = {
  accessories: ["bucketHat", "satchel"] as Accessory[],
  accent: "#f2c12e", // straw hat
  accent2: "#8a5432", // hat band and bag
};

type Props = {
  pose: Pose;
  expression?: Expression;
  x: number;
  y: number;
  scale?: number;
  facing?: "left" | "right";
  rim?: string;
  seed?: number;
  extra?: Accessory[]; // things he wears on top in a scene, e.g. a pillow
};

export const Tony: React.FC<Props> = ({ extra = [], ...props }) => (
  <Stickman
    {...props}
    color={INK}
    accessories={[...TONY_LOOK.accessories, ...extra]}
    accent={TONY_LOOK.accent}
    accent2={TONY_LOOK.accent2}
  />
);
