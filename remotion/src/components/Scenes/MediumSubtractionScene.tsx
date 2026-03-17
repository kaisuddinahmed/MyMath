import React from "react";
import { useVideoConfig, useCurrentFrame, spring, interpolate } from "remotion";
import type { DirectorScene } from "../../types";

/**
 * MediumSubtractionScene — Unified "Highlight & Remove" for A - B where 11 ≤ A ≤ 20
 *
 * Animation (4 steps, single scene duration):
 *   Step 1: Show all A blocks in a row: [10 indigo | ones light-blue]
 *   Step 2: The rightmost B blocks turn RED (they are the ones being taken away)
 *   Step 3: The red blocks float DOWN and fade out, gap closes
 *   Step 4: Final equation fades in
 *
 * Works for all 11-20 cases automatically:
 *   14 - 4 = 10  →  ones=4, B=4:  all 4 ones turn red and leave
 *   13 - 9 = 4   →  ones=3, B=9:  all 3 ones + 6 tens turn red and leave
 *   17 - 3 = 14  →  ones=7, B=3:  last 3 of the ones turn red and leave
 */

const BLOCK_SIZE = 48;
const BLOCK_GAP = 8;
const BLOCK_RADIUS = 10;

type BlockState = "tens" | "ones" | "removing";

const Block: React.FC<{
  type: BlockState;
  removeProgress?: number;
}> = ({ type, removeProgress = 0 }) => {
  const colors: Record<BlockState, string> = {
    tens: "#6366f1",      // indigo
    ones: "#818cf8",      // lighter indigo (ones digit)
    removing: "#ef4444",  // red — being taken away
  };

  const yShift = type === "removing"
    ? interpolate(removeProgress, [0, 1], [0, 80], { extrapolateRight: "clamp" })
    : 0;
  const opacity = type === "removing"
    ? interpolate(removeProgress, [0, 1], [1, 0], { extrapolateRight: "clamp" })
    : 1;
  const scale = type === "removing"
    ? interpolate(removeProgress, [0, 1], [1, 0.4], { extrapolateRight: "clamp" })
    : 1;

  return (
    <div
      style={{
        width: BLOCK_SIZE,
        height: BLOCK_SIZE,
        borderRadius: BLOCK_RADIUS,
        backgroundColor: colors[type],
        opacity,
        transform: `translateY(${yShift}px) scale(${scale})`,
        border: "2px solid rgba(255,255,255,0.15)",
        flexShrink: 0,
        transition: "background-color 0.3s",
      }}
    />
  );
};

export const MediumSubtractionScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Parse equation "A - B"
  const eqStr = groupedScenes[0]?.equation || "14 - 4";
  const numMatches = eqStr.match(/\d+/g);
  const A = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 14;
  const B = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 4;
  const result = A - B;
  const ones = A - 10; // ones digit of A (e.g. 14 → 4, 13 → 3)

  // Internal 4-step timings from single scene
  const totalDur = timings[0]?.dur || 20 * fps;
  const step = totalDur / 4;
  const step1End = step;
  const step2End = step * 2;
  const step3End = step * 3;

  // Step 1: pop in
  const popIn = spring({ frame, fps, config: { damping: 12 } });

  // Step 2: "removing" blocks turn red (colour transition is CSS, we just track whether we're past step1)
  const colorFlip = frame >= step1End;

  // Step 3: blocks animate away — stagger each block
  const getRemoveProgress = (blockIdx: number): number => {
    // stagger within step 3 duration
    const staggerOffset = (blockIdx / Math.max(1, B)) * (step * 0.6);
    const startF = step2End + staggerOffset;
    return spring({ frame: Math.max(0, frame - startF), fps, config: { damping: 14 } });
  };

  // Step 3b: count remaining blocks
  const getCountProgress = (idx: number): number => {
    // start counting shortly after the first block starts to be removed
    const staggerOffset = (idx / Math.max(1, result)) * step;
    const startF = step2End + (step * 0.5) + staggerOffset;
    return spring({ frame: Math.max(0, frame - startF), fps, config: { damping: 14 } });
  };

  // Step 4: equation fades in
  const eqOpacity = spring({
    frame: Math.max(0, frame - step3End),
    fps, from: 0, to: 1, durationInFrames: 12,
  });

  // Build block array of length A:
  // indices 0..9 are tens, indices 10..(A-1) are ones
  // The RIGHTMOST B blocks are "removing"
  const buildBlocks = () =>
    Array.from({ length: A }, (_, i) => {
      const fromRight = A - 1 - i; // 0 = rightmost
      const isRemoving = fromRight < B;
      const isTens = i < 10;
      const baseType: BlockState = isTens ? "tens" : "ones";
      return { type: isRemoving && colorFlip ? "removing" as BlockState : baseType, removeIdx: isRemoving ? (B - 1 - fromRight) : -1 };
    });

  const blocks = buildBlocks();

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", gap: 32,
    }}>

      {/* ── Main row of A blocks ── */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
        transform: `scale(${popIn})`,
      }}>
        {/* Sublabel */}
        <div style={{
          color: "rgba(255,255,255,0.45)", fontSize: 18, fontFamily: "'Inter', sans-serif",
          display: "flex", gap: 24,
        }}>
          <span>
            {A} = <span style={{ color: "#818cf8" }}>10</span> + <span style={{ color: "#a5b4fc" }}>{ones}</span>
          </span>
          {colorFlip && (
            <span style={{ color: "#ef4444" }}>
              taking away {B}
            </span>
          )}
        </div>

        {/* The block row with counting numbers below */}
        <div style={{ display: "flex", flexDirection: "row", gap: BLOCK_GAP, alignItems: "flex-end" }}>
          {blocks.map((b, i) => {
            const isRemaining = i < result;
            const countProg = isRemaining ? getCountProgress(i) : 0;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Block
                  type={b.type}
                  removeProgress={b.removeIdx >= 0 ? getRemoveProgress(b.removeIdx) : 0}
                />
                <div style={{ height: 24, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  {isRemaining && (
                    <span style={{
                      fontSize: 20,
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      color: "rgba(255,255,255,0.7)",
                      opacity: countProg,
                      transform: `scale(${interpolate(countProg, [0, 1], [0.5, 1], { extrapolateRight: "clamp" })})`
                    }}>
                      {i + 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Remaining count (appears after removal) ── */}
      <div style={{
        opacity: interpolate(
          spring({ frame: Math.max(0, frame - step2End), fps, config: { damping: 14 } }),
          [0, 1], [0, 1], { extrapolateRight: "clamp" }
        ),
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        {result >= 3 && (
          <span style={{
            color: "rgba(255,255,255,0.55)", fontSize: 18,
            fontFamily: "'Inter', sans-serif",
          }}>
            {result} remaining
          </span>
        )}
      </div>

      {/* ── Step 4: Final equation ── */}
      <div style={{
        opacity: eqOpacity,
        transform: `translateY(${interpolate(eqOpacity, [0, 1], [24, 0])}px)`,
        background: "rgba(239,68,68,0.12)", borderRadius: 20,
        padding: "16px 52px", border: "2px solid rgba(239,68,68,0.35)",
      }}>
        <p style={{
          color: "#fee2e2", fontSize: 54, fontWeight: 800,
          fontFamily: "'Inter', sans-serif", margin: 0, letterSpacing: 2,
        }}>
          {A} − {B} = {result}
        </p>
      </div>
    </div>
  );
};
