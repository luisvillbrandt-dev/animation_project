// Lists every composition (= one video you can preview and render).
import { Composition } from "remotion";
import { EmptyCanvas } from "./EmptyCanvas";
import { StickmanTest } from "./StickmanTest";
import { StyleTest } from "./StyleTest";
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
      {(["warm", "dusk", "line"] as const).map((style) => (
        <Composition
          key={style}
          id={`StyleTest-${style}`}
          component={StyleTest}
          defaultProps={{ style }}
          width={WIDTH}
          height={HEIGHT}
          fps={FPS}
          durationInFrames={FPS * 5}
        />
      ))}
    </>
  );
};
