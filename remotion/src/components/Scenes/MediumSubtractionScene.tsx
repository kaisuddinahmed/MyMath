import React from "react";
import { useVideoConfig, useCurrentFrame, spring, interpolate } from "remotion";
import type { DirectorScene } from "../../types";

/**
 * MediumSubtractionScene — "Break Through 10" (Approach 1: Split Minuend)
 *
 * Example: 13 - 4 = 9
 *   ones = 13 - 10 = 3
 *
 * Animation steps:
 *   Step 1: Show 13 = [10-frame full] + [3 ones blocks]
 *   Step 2: "Subtract B from the 10" → remove 4 blocks from ten-frame → 6 remain
 *   Step 3: Combine (10 - B) + ones: 6 + 3 = 9, blocks slide together
 *   Step 4: Final equation
 */

const BLOCK_SIZE = 52;
const BLOCK_GAP = 8;
const BLOCK_RADIUS = 10;

const Block: React.FC<{ color: string; opacity?: number; scale?: number }> = ({
  color, opacity = 1, scale = 1,
}) => (
  <div style={{
    width: BLOCK_SIZE, height: BLOCK_SIZE, borderRadius: BLOCK_RADIUS,
    backgroundColor: color, opacity, transform: `scale(${scale})`,
    border: "2px solid rgba(255,255,255,0.15)", flexShrink: 0,
  }} />
);

export const MediumSubtractionScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Parse equation "A - B"
  const eqStr = groupedScenes[0]?.equation || "13 - 4";
  const numMatches = eqStr.match(/\d+/g);
  const A = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 13;
  const B = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 4;
  const result = A - B;

  // Split minuend: A = 10 + ones
  const ones = A - 10;             // e.g. 13 - 10 = 3
  const tenAfterSub = 10 - B;      // e.g. 10 - 4 = 6  (blocks left in ten-frame)

  // Colors
  const colorTen = "#6366f1";      // indigo — ten-frame blocks
  const colorOnes = "#10b981";     // emerald — the ones blocks
  const colorRemoved = "#ef4444";  // red — blocks being removed from ten-frame

  // Internal 4-step timings
  const totalDur = timings[0]?.dur || 20 * fps;
  const step = totalDur / 4;
  const step1End = step;
  const step2End = step * 2;
  const step3End = step * 3;

  // Step 1: pop in
  const popIn = spring({ frame, fps, config: { damping: 12 } });

  // Step 2: removal animation
  const removeProgress = spring({
    frame: Math.max(0, frame - step1End),
    fps, config: { damping: 14 },
  });

  // Step 3: merge (10-B) blocks + ones blocks slide together
  const mergeProgress = spring({
    frame: Math.max(0, frame - step2End),
    fps, config: { damping: 14 },
  });

  // Step 4: final equation
  const eqOpacity = spring({
    frame: Math.max(0, frame - step3End),
    fps, from: 0, to: 1, durationInFrames: 12,
  });

  // Per-block removal: stagger each removed block
  const getRemovedBlockStyle = (idx: number): { opacity: number; scale: number } => {
    const delay = step1End + (idx / Math.max(1, B)) * step;
    const prog = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
    return {
      opacity: interpolate(prog, [0, 1], [1, 0], { extrapolateRight: "clamp" }),
      scale: interpolate(prog, [0, 1], [1, 0.2], { extrapolateRight: "clamp" }),
    };
  };

  // Gap between remaining ten-frame blocks and ones blocks closes on merge
  const mergeGap = interpolate(mergeProgress, [0, 1], [60, 0]);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", gap: 32,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, transform: `scale(${popIn})` }}>

        {/* ── Row 1: Ten-frame (full 10) ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, fontFamily: "'Inter', sans-serif" }}>
            Split {A} = 10 + {ones}
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: BLOCK_GAP }}>
            {/* First tenAfterSub blocks stay (indigo) */}
            {Array.from({ length: tenAfterSub }).map((_, i) => (
              <Block key={`stay-${i}`} color={colorTen} />
            ))}
            {/* Next B blocks are removed (red, animate out) */}
            {Array.from({ length: B }).map((_, i) => {
              const s = getRemovedBlockStyle(i);
              return <Block key={`remove-${i}`} color={colorRemoved} opacity={s.opacity} scale={s.scale} />;
            })}
          </div>
          {/* Label: "subtract B from 10" */}
          <div style={{
            opacity: removeProgress,
            color: colorRemoved, fontSize: 20, fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
          }}>
            10 − {B} = {tenAfterSub}
          </div>
        </div>

        {/* ── Row 2: Ones blocks ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, fontFamily: "'Inter', sans-serif" }}>
            Plus the {ones} left over
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: BLOCK_GAP }}>
            {Array.from({ length: ones }).map((_, i) => (
              <Block key={`ones-${i}`} color={colorOnes} />
            ))}
          </div>
        </div>

        {/* ── Row 3: Merge remaining + ones ── */}
        <div style={{
          opacity: interpolate(mergeProgress, [0.2, 1], [0, 1], { extrapolateRight: "clamp" }),
          display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
        }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, fontFamily: "'Inter', sans-serif" }}>
            {tenAfterSub} + {ones} = {result}
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: BLOCK_GAP, alignItems: "center" }}>
            {/* Remaining ten-frame blocks */}
            <div style={{ display: "flex", flexDirection: "row", gap: BLOCK_GAP }}>
              {Array.from({ length: tenAfterSub }).map((_, i) => (
                <Block key={`merged-ten-${i}`} color={colorTen} />
              ))}
            </div>
            {/* Animated gap that collapses */}
            <div style={{ width: mergeGap, flexShrink: 0, transition: "width 0.3s" }} />
            {/* Ones blocks */}
            <div style={{ display: "flex", flexDirection: "row", gap: BLOCK_GAP }}>
              {Array.from({ length: ones }).map((_, i) => (
                <Block key={`merged-ones-${i}`} color={colorOnes} />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Step 4: Final equation ── */}
      <div style={{
        opacity: eqOpacity,
        transform: `translateY(${interpolate(eqOpacity, [0, 1], [24, 0])}px)`,
        background: "rgba(239, 68, 68, 0.12)",
        borderRadius: 20, padding: "18px 56px",
        border: "2px solid rgba(239, 68, 68, 0.35)",
      }}>
        <p style={{
          color: "#fee2e2", fontSize: 58, fontWeight: 800,
          fontFamily: "'Inter', sans-serif", margin: 0, letterSpacing: 2,
        }}>
          {A} − {B} = {result}
        </p>
        <p style={{
          color: "rgba(255,255,255,0.5)", fontSize: 22,
          fontFamily: "'Inter', sans-serif", margin: "6px 0 0", textAlign: "center",
        }}>
          (10 − {B}) + {ones} = {result}
        </p>
      </div>
    </div>
  );
};
