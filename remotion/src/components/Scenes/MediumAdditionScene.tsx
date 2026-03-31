import React from "react";
import { useVideoConfig, useCurrentFrame, spring, interpolate } from "remotion";
import type { DirectorScene } from "../../types";
import { Confetti } from "../primitives/Confetti";

/**
 * MediumAdditionScene — Unified "Arrive & Join" for A + B where sum is 11–20.
 *
 * MIRRORS MediumSubtractionScene exactly (reverse animation):
 *   Sub: B blocks turn red and LEAVE the row (float down)
 *   Add: B blocks are emerald and ARRIVE to join the row (float up)
 *
 * Animation (4 steps, single scene duration):
 *   Step 1: Show A blocks in a row (indigo) — the starting group
 *   Step 2: B new blocks appear to the right (highlighted emerald, floating up from below)
 *   Step 3: B blocks settle into position — full row of A+B is complete
 *   Step 4: Final equation fades in
 *
 * Works for all 11-20 cases (9+4, 12+4, 6+12 etc.) — no sub-strategy needed.
 */

const BLOCK_SIZE = 48;
const BLOCK_GAP = 8;
const BLOCK_RADIUS = 10;

type BlockState = "existing" | "arriving";

const Block: React.FC<{
  type: BlockState;
  arriveProgress?: number;
}> = ({ type, arriveProgress = 0 }) => {
  const colors: Record<BlockState, string> = {
    existing: "#4ECDC4",   // teal — the existing group
    arriving: "#6BCB77",   // green — the new blocks joining
  };

  // Arriving blocks float UP into position (mirror of subtraction's downward exit)
  const yShift = type === "arriving"
    ? interpolate(arriveProgress, [0, 1], [60, 0], { extrapolateRight: "clamp" })
    : 0;
  const opacity = type === "arriving"
    ? interpolate(arriveProgress, [0, 1], [0, 1], { extrapolateRight: "clamp" })
    : 1;
  const scale = type === "arriving"
    ? interpolate(arriveProgress, [0, 1], [0.4, 1], { extrapolateRight: "clamp" })
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
        border: "3px solid rgba(255,255,255,0.5)",
        boxShadow: "0 4px 0 rgba(0,0,0,0.15)",
        flexShrink: 0,
      }}
    />
  );
};

export const MediumAdditionScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Parse equation "A + B" — normalise so bigNum ≥ smallNum (larger first)
  const eqStr = groupedScenes[0]?.equation || "9 + 4";
  const numMatches = eqStr.match(/\d+/g);
  const raw1 = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 9;
  const raw2 = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 4;
  // A = larger (existing group), B = smaller (arriving group) — mirrors subtraction
  const A = Math.max(raw1, raw2);
  const B = Math.min(raw1, raw2);
  const total = A + B;

  // Internal 4-step timings — identical structure to MediumSubtractionScene
  const totalDur = timings[0]?.dur || 20 * fps;
  const step = totalDur / 4;
  const step1End = step;
  const step2End = step * 2;
  const step3End = step * 3;

  // Step 1: pop in
  const popIn = spring({ frame, fps, config: { damping: 12 } });

  // Step 2: arriving blocks appear (colour label)
  const colorFlip = frame >= step1End;

  // Step 3: blocks animate in — stagger each arriving block (mirror of remove stagger)
  const getArriveProgress = (blockIdx: number): number => {
    const staggerOffset = (blockIdx / Math.max(1, B)) * (step * 0.6);
    const startF = step2End + staggerOffset;
    return spring({ frame: Math.max(0, frame - startF), fps, config: { damping: 14 } });
  };

  // Step 3b: count all blocks sequentially
  const getCountProgress = (idx: number): number => {
    // start counting shortly after the first arriving block starts
    const staggerOffset = (idx / Math.max(1, total)) * step;
    const startF = step2End + (step * 0.5) + staggerOffset;
    return spring({ frame: Math.max(0, frame - startF), fps, config: { damping: 14 } });
  };

  // Step 4: equation fades in
  const eqOpacity = spring({
    frame: Math.max(0, frame - step3End),
    fps, from: 0, to: 1, durationInFrames: 12,
  });

  // Build block array of length total (A existing + B arriving):
  // First A blocks = "existing" (indigo)
  // Next B blocks = "arriving" (emerald, staggered float-in)
  const blocks = [
    ...Array.from({ length: A }, (_, i) => ({ type: "existing" as BlockState, arriveIdx: -1 })),
    ...Array.from({ length: B }, (_, i) => ({ type: "arriving" as BlockState, arriveIdx: i })),
  ];

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", gap: 32,
    }}>

      {/* ── Main row: A existing + B arriving blocks ── */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
        transform: `scale(${popIn})`,
      }}>
        {/* Label — mirrors subtraction label exactly */}
        <div style={{
          color: "rgba(0,0,0,0.55)", fontSize: 20, fontFamily: "'Nunito', 'Comic Sans MS', cursive",
          display: "flex", gap: 24, fontWeight: 700,
        }}>
          <span>
            Starting with <span style={{ color: "#4ECDC4", fontWeight: 900 }}>{A}</span>
          </span>
          {colorFlip && (
            <span style={{ color: "#6BCB77", fontWeight: 900 }}>
              {B} more joining! 🎉
            </span>
          )}
        </div>

        {/* The block row with counting numbers below */}
        <div style={{ display: "flex", flexDirection: "row", gap: BLOCK_GAP, alignItems: "flex-end" }}>
          {blocks.map((b, i) => {
            const countProg = getCountProgress(i);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Block
                  type={b.type}
                  arriveProgress={b.arriveIdx >= 0 ? getArriveProgress(b.arriveIdx) : 1}
                />
                <div style={{ height: 24, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <span style={{
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: "'Nunito', 'Comic Sans MS', cursive",
                    color: "rgba(0,0,0,0.7)",
                    opacity: countProg,
                    transform: `scale(${interpolate(countProg, [0, 1], [0.4, 1], { extrapolateRight: "clamp" })})`
                  }}>
                    {i + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Total count label (appears after arrival) — mirrors "X balls remain" ── */}
      <div style={{
        opacity: interpolate(
          spring({ frame: Math.max(0, frame - step2End), fps, config: { damping: 14 } }),
          [0, 1], [0, 1], { extrapolateRight: "clamp" }
        ),
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        {total >= 3 && (
          <span style={{
            color: "rgba(0,0,0,0.5)", fontSize: 20,
            fontFamily: "'Nunito', 'Comic Sans MS', cursive",
            fontWeight: 700,
          }}>
            {total} altogether 🌟
          </span>
        )}
      </div>

      {/* Step 4: Confetti + equation */}
      {frame >= step3End && <Confetti startFrame={step3End} />}
      <div style={{
        opacity: eqOpacity,
        transform: `translateY(${interpolate(eqOpacity, [0, 1], [28, 0])}px)`,
        background: "linear-gradient(135deg, #6BCB77, #4ECDC4)",
        borderRadius: 28,
        padding: "20px 60px",
        boxShadow: "0 8px 0 rgba(0,0,0,0.15), 0 16px 32px rgba(107,203,119,0.35)",
      }}>
        <p style={{
          color: "#FFFFFF", fontSize: 64, fontWeight: 900,
          fontFamily: "'Nunito', 'Comic Sans MS', cursive", margin: 0, letterSpacing: 3,
          textShadow: "0 4px 0 rgba(0,0,0,0.15)",
        }}>
          {raw1} + {raw2} = {total}
        </p>
      </div>
    </div>
  );
};
