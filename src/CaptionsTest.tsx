// Caption test: the real voice with the TikTok-style captions over a plain background.
// A small clock at the bottom helps with spot checks against timing.json.
import type { Caption } from "@remotion/captions";
import { AbsoluteFill, CalculateMetadataFunction, Html5Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { INK } from "./components/backgrounds/StreetVesuvius";
import { CAPTION_BAND, Captions } from "./components/Captions";
import { FPS, HEIGHT, SAFE_BOTTOM, SAFE_TOP } from "./video";

export type CaptionsTestProps = { episode: string; captions: Caption[] };

// Loads captions.json and sets the length from timing.json (last line end + 0.6 s tail).
export const loadCaptionsTest: CalculateMetadataFunction<CaptionsTestProps> = async ({ props }) => {
  const [captions, timing] = await Promise.all([
    fetch(staticFile(`${props.episode}/captions.json`)).then((r) => r.json() as Promise<Caption[]>),
    fetch(staticFile(`${props.episode}/timing.json`)).then((r) => r.json() as Promise<{ end: number }[]>),
  ]);
  return {
    props: { ...props, captions },
    durationInFrames: Math.ceil((timing[timing.length - 1].end + 0.6) * FPS),
  };
};

export const CaptionsTest: React.FC<CaptionsTestProps> = ({ episode, captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#cdbfab, #8f826f)" }}>
      <Html5Audio src={staticFile(`${episode}/voice/voice.wav`)} />
      {/* Safe area and caption band, faint */}
      <div style={{ position: "absolute", top: SAFE_TOP, bottom: SAFE_BOTTOM, left: 60, right: 60, border: "3px dashed rgba(29,36,51,0.25)", borderRadius: 20 }} />
      <div style={{ position: "absolute", top: CAPTION_BAND.top, height: CAPTION_BAND.height, left: 60, right: 60, background: "rgba(255,255,255,0.08)", borderRadius: 20 }} />
      <Captions captions={captions} />
      <div style={{ position: "absolute", top: HEIGHT - SAFE_BOTTOM + 30, width: "100%", textAlign: "center", fontFamily: "monospace", fontSize: 40, color: INK, opacity: 0.6 }}>
        t = {(frame / fps).toFixed(2)} s
      </div>
    </AbsoluteFill>
  );
};
