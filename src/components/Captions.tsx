// TikTok-style captions: big bold words, the word being spoken highlighted, at most 2 lines.
// They sit in the caption band above the stickman's head (inside the safe area).
import type { Caption } from "@remotion/captions";
import { createTikTokStyleCaptions, TikTokPage } from "@remotion/captions";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { useMemo } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INK } from "./backgrounds/StreetVesuvius";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

export const CAPTION_BAND = { top: 470, height: 300 }; // in px of the 1080x1920 frame
const HIGHLIGHT = "#f2c12e"; // Tony's hat yellow
const MAX_CHARS = 22; // per page, so a page never needs more than 2 lines
const FONT_SIZE = 96;

// Splits pages that are too long for 2 lines into smaller ones, keeping the word timing.
const limitPageLength = (pages: TikTokPage[]): TikTokPage[] =>
  pages.flatMap((page) => {
    const out: TikTokPage[] = [];
    let current: TikTokPage["tokens"] = [];
    const flush = () => {
      if (!current.length) return;
      const startMs = current[0].fromMs;
      out.push({
        text: current.map((t) => t.text).join(""),
        startMs,
        durationMs: current[current.length - 1].toMs - startMs,
        tokens: current,
      });
      current = [];
    };
    for (const token of page.tokens) {
      const length = current.map((t) => t.text).join("").trim().length + token.text.length;
      if (current.length && length > MAX_CHARS) flush();
      current.push(token);
    }
    flush();
    return out;
  });

export const Captions: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;

  const pages = useMemo(
    () =>
      limitPageLength(
        createTikTokStyleCaptions({
          captions,
          combineTokensWithinMilliseconds: 900,
          breakOnSilenceAfterMilliseconds: 300,
        }).pages,
      ),
    [captions],
  );

  // The page on screen: from its first word until the next page starts,
  // but it disappears shortly after its last word when a pause follows.
  const index = pages.findIndex((p, i) => {
    const next = pages[i + 1];
    const until = Math.min(next ? next.startMs : Infinity, p.startMs + p.durationMs + 350);
    return nowMs >= p.startMs && nowMs < until;
  });
  if (index === -1) return null;
  const page = pages[index];
  const pageFrame = frame - Math.round((page.startMs / 1000) * fps);
  const pop = spring({ frame: pageFrame, fps, config: { damping: 14, stiffness: 220 }, durationInFrames: 8 });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: CAPTION_BAND.top,
          height: CAPTION_BAND.height,
          left: 80,
          right: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: FONT_SIZE,
            lineHeight: 1.08,
            textAlign: "center",
            textTransform: "uppercase",
            color: "#ffffff",
            WebkitTextStroke: `18px ${INK}`,
            paintOrder: "stroke fill",
            transform: `scale(${0.85 + 0.15 * pop})`,
          }}
        >
          {page.tokens.map((token) => {
            const active = nowMs >= token.fromMs && nowMs < token.toMs;
            return (
              <span
                key={token.fromMs}
                style={{
                  display: "inline-block",
                  margin: "0 0.22em", // wide enough that the thick outline does not eat the space

                  color: active ? HIGHLIGHT : "#ffffff",
                  transform: active ? "scale(1.08)" : undefined,
                }}
              >
                {token.text.trim()}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
