import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, Sequence, interpolate } from "remotion";
import type { DirectorScene } from "../../types";
import { ItemComponent } from "../../assets/items/ItemSvgs";

export const SmallSubtractionScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Parse the equation from the first scene (expected "A - B")
  const eqStr = groupedScenes[0]?.equation || "8 - 3";
  const numMatches = eqStr.match(/\d+/g);
  const totalCount = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 8;
  const subtractCount = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 3;
  const remainCount = totalCount - subtractCount;
  const itemType = groupedScenes[0]?.item_type || "APPLE_SVG";

  // Calculate timing boundaries dynamically based on the number of provided scenes
  const hasCountingStep = timings.length >= 4;
  
  const step1End = timings[0]?.dur || 4 * fps;
  const step2End = step1End + (timings[1]?.dur || 4 * fps);
  
  // If counting step exists, step3End uses its duration. Otherwise, step3End is just step2End.
  const step3Dur = hasCountingStep ? timings[2].dur : 0;
  const step3End = step2End + step3Dur;
  
  // Layout interpolations
  
  // Step 1: Items pop in altogether
  const step1Pop = spring({ frame, fps, config: { damping: 12 }});
  
  // Step 2: The subtracted items slide away to the right and fade out
  const splitProgress = spring({
    frame: Math.max(0, frame - step1End),
    fps,
    config: { damping: 14 }
  });

  const gap = interpolate(splitProgress, [0, 1], [10, 150]);
  const minusOpacity = interpolate(splitProgress, [0, 0.5, 1], [0, 1, 1], { extrapolateRight: "clamp" });
  const takeAwayOpacity = interpolate(splitProgress, [0, 0.8, 1], [1, 0.4, 0.1], { extrapolateRight: "clamp" });

  // Step 3 (Optional): Counting numbers appear ONLY under the remaining items
  const getCountOpacity = (index: number) => {
    if (!hasCountingStep) return 0;
    const staggerFrames = step3Dur / Math.max(1, remainCount);
    const delay = step2End + (index * staggerFrames);
    return spring({
      frame: Math.max(0, frame - delay),
      fps,
      from: 0,
      to: 1,
      durationInFrames: 10
    });
  };

  // Step 4: Final equation fades in
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
        
        {/* Remaining Group (Left) */}
        <div style={{ display: "flex", gap: 10, transform: `scale(${step1Pop})` }}>
          {Array.from({ length: remainCount }).map((_, i) => (
            <div key={`Remain${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }}>
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

        {/* The Minus Sign */}
        <div style={{ fontSize: 90, color: "#ef4444", fontWeight: "bold", opacity: minusOpacity }}>
          -
        </div>

        {/* Subtracted Group (Right) - Slides away and fades */}
        <div style={{ 
          display: "flex", 
          gap: 10, 
          transform: `scale(${step1Pop}) translateX(${interpolate(splitProgress, [0, 1], [0, 50])}px)`,
          opacity: takeAwayOpacity
        }}>
          {Array.from({ length: subtractCount }).map((_, i) => (
            <div key={`Sub${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }}>
              <div style={{ filter: `grayscale(${interpolate(splitProgress, [0, 1], [0, 100])}%)` }}>
                <ItemComponent itemType={itemType} />
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
          background: "rgba(239, 68, 68, 0.12)",
          borderRadius: 20,
          padding: "20px 60px",
          border: "2px solid rgba(239, 68, 68, 0.3)",
        }}
      >
        <p
          style={{
            color: "#fee2e2",
            fontSize: 60,
            fontWeight: 800,
            fontFamily: "'Inter', sans-serif",
            margin: 0,
            letterSpacing: 2,
          }}
        >
          {totalCount} - {subtractCount} = {remainCount}
        </p>
      </div>

    </div>
  );
};
