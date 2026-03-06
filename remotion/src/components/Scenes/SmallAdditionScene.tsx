import React from "react";
import { useVideoConfig, useCurrentFrame, spring, interpolate } from "remotion";
import type { DirectorScene } from "../../types";
import { ItemComponent } from "../../assets/items/ItemSvgs";

export const SmallAdditionScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Parse the equation from the first scene (expected "A + B")
  const eqStr = groupedScenes[0]?.equation || "4 + 2";
  const numMatches = eqStr.match(/\d+/g);
  const leftCount = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 4;
  const rightCount = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 2;
  const totalCount = leftCount + rightCount;
  const itemType = groupedScenes[0]?.item_type || "APPLE_SVG";

  // Internal 4-step timings even when only 1 scene is provided
  const hasCountingStep = timings.length >= 4;
  const step1End = timings[0]?.dur || 4 * fps;
  const step2End = step1End + (timings[1]?.dur || 4 * fps);
  const step3Dur = hasCountingStep ? timings[2].dur : (totalCount >= 3 ? 4 * fps : 0);
  const step3End = step2End + step3Dur;

  // Step 1: All items pop in (in their two-group layout)
  const step1Pop = spring({ frame, fps, config: { damping: 12 } });

  // Step 2: Groups slide together — the big gap between left and right shrinks to zero
  const mergeProgress = spring({
    frame: Math.max(0, frame - step1End),
    fps,
    config: { damping: 14 },
  });

  // The "separator" gap between left group and right group
  // Starts large (groups are separate) and collapses to 0 (become one row)
  const separatorWidth = interpolate(mergeProgress, [0, 1], [90, 0]);
  const plusOpacity = interpolate(mergeProgress, [0, 0.4], [1, 0], { extrapolateRight: "clamp" });

  // Step 3: Counting numbers stagger in one by one across all items
  const getCountOpacity = (index: number) => {
    if (step3Dur === 0) return 0;
    const staggerFrames = step3Dur / Math.max(1, totalCount);
    const delay = step2End + index * staggerFrames;
    return spring({ frame: Math.max(0, frame - delay), fps, from: 0, to: 1, durationInFrames: 10 });
  };

  // Step 4: Final equation fades in
  const step4Opacity = spring({
    frame: Math.max(0, frame - step3End),
    fps,
    from: 0,
    to: 1,
    durationInFrames: 15,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      {/* Single row: [left items] [separator/+] [right items] */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 20,
          transform: `scale(${step1Pop})`,
        }}
      >
        {/* Left group — flat single row */}
        {Array.from({ length: leftCount }).map((_, idx) => {
          const countOpacity = getCountOpacity(idx);
          return (
            <div
              key={`L-${idx}`}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <div style={{ transform: "scale(0.9)" }}>
                <ItemComponent itemType={itemType} />
              </div>
              <div
                style={{
                  color: "#fcd34d",
                  fontSize: 26,
                  fontWeight: "bold",
                  opacity: countOpacity,
                  transform: `translateY(${interpolate(countOpacity, [0, 1], [10, 0])}px)`,
                }}
              >
                {idx + 1}
              </div>
            </div>
          );
        })}

        {/* The Plus Sign / separator — shrinks and fades as groups merge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: separatorWidth,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 72,
              color: "#10b981",
              fontWeight: "bold",
              opacity: plusOpacity,
              lineHeight: 1,
            }}
          >
            +
          </span>
        </div>

        {/* Right group — flat single row */}
        {Array.from({ length: rightCount }).map((_, idx) => {
          const absoluteIdx = leftCount + idx;
          const countOpacity = getCountOpacity(absoluteIdx);
          return (
            <div
              key={`R-${idx}`}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <div style={{ transform: "scale(0.9)" }}>
                <ItemComponent itemType={itemType} />
              </div>
              <div
                style={{
                  color: "#fcd34d",
                  fontSize: 26,
                  fontWeight: "bold",
                  opacity: countOpacity,
                  transform: `translateY(${interpolate(countOpacity, [0, 1], [10, 0])}px)`,
                }}
              >
                {absoluteIdx + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Equation Block (Step 4) */}
      <div
        style={{
          marginTop: 80,
          opacity: step4Opacity,
          transform: `translateY(${interpolate(step4Opacity, [0, 1], [30, 0])}px)`,
          background: "rgba(99,102,241,0.12)",
          borderRadius: 20,
          padding: "20px 60px",
          border: "2px solid rgba(99,102,241,0.3)",
        }}
      >
        <p
          style={{
            color: "#E0E7FF",
            fontSize: 60,
            fontWeight: 800,
            fontFamily: "'Inter', sans-serif",
            margin: 0,
            letterSpacing: 2,
          }}
        >
          {leftCount} + {rightCount} = {totalCount}
        </p>
      </div>
    </div>
  );
};
