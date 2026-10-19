// Placeholder: an empty vertical canvas with the safe area marked by a dashed frame.
import { AbsoluteFill } from "remotion";
import { HEIGHT, SAFE_BOTTOM, SAFE_TOP } from "./video";

export const EmptyCanvas: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1d2433" }}>
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP,
          left: 60,
          right: 60,
          height: HEIGHT - SAFE_TOP - SAFE_BOTTOM,
          border: "4px dashed rgba(255, 255, 255, 0.25)",
          borderRadius: 24,
        }}
      />
    </AbsoluteFill>
  );
};
