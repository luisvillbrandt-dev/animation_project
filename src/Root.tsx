// Lists every composition (= one video you can preview and render).
import { Composition } from "remotion";
import { EmptyCanvas } from "./EmptyCanvas";
import { StickmanTest } from "./StickmanTest";
import { StyleTest } from "./StyleTest";
import { TonyTest } from "./TonyTest";
import { FPS, HEIGHT, WIDTH } from "./video";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EmptyCanvas"
        component={EmptyCanvas}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={FPS * 5}
      />
      <Composition
        id="StickmanTest"
        component={StickmanTest}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={FPS * 6}
      />
      {(["day", "ash", "dark"] as const).map((stage) => (
        <Composition
          key={stage}
          id={`StyleTest-${stage}`}
          component={StyleTest}
          defaultProps={{ stage }}
          width={WIDTH}
          height={HEIGHT}
          fps={FPS}
          durationInFrames={FPS * 5}
        />
      ))}
      {(["a", "b", "c", "d", "e", "f"] as const).map((variant) => (
        <Composition
          key={variant}
          id={`TonyTest-${variant}`}
          component={TonyTest}
          defaultProps={{ variant }}
          width={WIDTH}
          height={HEIGHT}
          fps={FPS}
          durationInFrames={FPS * 4}
        />
      ))}
    </>
  );
};
