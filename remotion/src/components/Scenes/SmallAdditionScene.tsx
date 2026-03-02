import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, Sequence, interpolate } from "remotion";
import type { DirectorScene } from "../../types";
import { AppleSvg, BlockSvg, CounterSvg } from "../../assets/items/ItemSvgs";

function ItemComponent({ itemType, size = 56 }: { itemType: string; size?: number }) {
  switch (itemType) {
    case "APPLE_SVG": return <AppleSvg size={size} />;
    case "BLOCK_SVG": return <BlockSvg size={size} />;
    default: return <CounterSvg size={size} />;
  }
}

export const SmallAdditionScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Parse the equation from the first scene (expected "A + B")
  const eqStr = groupedScenes[0]?.equation || "4 + 2";
  const match = eqStr.match(/(\d+)\s*\+\s*(\d+)/);
  const leftCount = match ? parseInt(match[1], 10) : 4;
  const rightCount = match ? parseInt(match[2], 10) : 2;
  const totalCount = leftCount + rightCount;
  const itemType = groupedScenes[0]?.item_type || "APPLE_SVG";

  // Calculate timing boundaries dynamically based on the number of provided scenes
  const hasCountingStep = timings.length >= 4;
  
  const step1End = timings[0]?.dur || 4 * fps;
  const step2End = step1End + (timings[1]?.dur || 4 * fps);
  
  // If counting step exists, step3End uses its duration. Otherwise, step3End is just step2End.
  const step3Dur = hasCountingStep ? timings[2].dur : 0;
  const step3End = step2End + step3Dur;
  
  // Layout interpolations based on step transitions
  
  // Step 1: Items pop in separate groups
  const step1Pop = spring({ frame, fps, config: { damping: 12 }});
  
  // Step 2: Plus sign fades out, objects slide together
  const mergeProgress = spring({
    frame: Math.max(0, frame - step1End),
    fps,
    config: { damping: 14 }
  });

  const gap = interpolate(mergeProgress, [0, 1], [150, 10]);
  const plusOpacity = interpolate(mergeProgress, [0, 0.5], [1, 0], { extrapolateRight: "clamp" });

  // Step 3 (Optional): Counting numbers appear under items sequentially
  const getCountOpacity = (index: number) => {
    if (!hasCountingStep) return 0; // Don't show counters if step is skipped
    const staggerFrames = step3Dur / totalCount;
    const delay = step2End + (index * staggerFrames);
    return spring({
      frame: Math.max(0, frame - delay),
      fps,
      from: 0,
      to: 1,
      durationInFrames: 10
    });
  };

  // Step 4 (or 3, if counting skipped): Final equation fades in
  const step4Opacity = spring({
    frame: Math.max(0, frame - step3End),
    fps,
    from: 0,
    to: 1,
    durationInFrames: 15
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        paddingTop: 80,
      }}
    >
      {/* Container holding the groups */}
      <div style={{ display: "flex", alignItems: "center", gap: gap }}>
        
        {/* Left Group */}
        <div style={{ display: "flex", gap: 10, transform: `scale(${step1Pop})` }}>
          {Array.from({ length: leftCount }).map((_, i) => (
            <div key={`L${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }}>
              <ItemComponent itemType={itemType} />
              {/* Counting numbers (Step 3) */}
              <div style={{ 
                color: "#fcd34d", 
                fontSize: 32, 
                fontWeight: "bold",
                opacity: getCountOpacity(i),
                transform: `translateY(${interpolate(getCountOpacity(i), [0,1], [10, 0])}px)`
              }}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>

        {/* The Plus Sign */}
        <div style={{ fontSize: 90, color: "#10b981", fontWeight: "bold", opacity: plusOpacity }}>
          +
        </div>

        {/* Right Group */}
        <div style={{ display: "flex", gap: 10, transform: `scale(${step1Pop})` }}>
          {Array.from({ length: rightCount }).map((_, i) => (
            <div key={`R${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }}>
              <ItemComponent itemType={itemType} />
              {/* Counting numbers continue (Step 3) */}
              <div style={{ 
                color: "#fcd34d", 
                fontSize: 32, 
                fontWeight: "bold",
                opacity: getCountOpacity(leftCount + i),
                transform: `translateY(${interpolate(getCountOpacity(leftCount + i), [0,1], [10, 0])}px)`
              }}>
                {leftCount + i + 1}
              </div>
            </div>
          ))}
        </div>

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
