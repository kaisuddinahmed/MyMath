import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import type { DirectorScene } from "../../types";
import { ItemComponent } from "../../assets/items/ItemSvgs";

export const PartWholeScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Parse data from the scenes
  // Equation expected: "A - B" in scenes 4, 5, 6
  let eqStr = "";
  for (const s of groupedScenes) {
    if (s.equation && s.equation.includes("-")) {
      eqStr = s.equation;
      break;
    }
  }
  
  const numMatches = eqStr.match(/\d+/g);
  const totalCount = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 9;
  const subsetCount = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 5;
  const remainCount = totalCount - subsetCount;
  
  const itemType = groupedScenes[0]?.item_type || "CHILD_SVG";
  const subsetLabel = groupedScenes[0]?.subset_label || "subset";
  const remainLabel = groupedScenes[0]?.remainder_label || "remainder";

  // Identify the exact start frame of each of the 6 phases
  const p1 = timings[0]?.start || 0;
  const p2 = timings[1]?.start || p1 + fps * 3;
  const p3 = timings[2]?.start || p2 + fps * 3;
  const p4 = timings[3]?.start || p3 + fps * 3;
  const p5 = timings[4]?.start || p4 + fps * 3;
  const p6 = timings[5]?.start || p5 + fps * 3;

  // Active phase index (0 to 5)
  let activePhase = 0;
  if (frame >= p6) activePhase = 5;
  else if (frame >= p5) activePhase = 4;
  else if (frame >= p4) activePhase = 3;
  else if (frame >= p3) activePhase = 2;
  else if (frame >= p2) activePhase = 1;

  // Animations
  const popProgress = spring({ frame: Math.max(0, frame - p1), fps, config: { damping: 12 } });
  
  // Phase 2 Highlight subset (we highlight the first `subsetCount` items)
  // We use a CSS filter to tint them (e.g. pinkish), and bump their scale slightly
  const highlightProgress = spring({ frame: Math.max(0, frame - p2), fps, config: { damping: 14 } });
  const highlightScale = interpolate(highlightProgress, [0, 1], [1, 1.15]);
  
  // Phase 3 Separation
  const separateProgress = spring({ frame: Math.max(0, frame - p3), fps, config: { damping: 15 } });
  const gapSize = interpolate(separateProgress, [0, 1], [20, 160]);
  
  // Phase 4 Equation appearance
  const eq4Progress = spring({ frame: Math.max(0, frame - p4), fps });
  
  // The counting numbers stagger across the first half of Phase 5.
  // The final answer `? -> value` should only reveal AFTER the counting is complete.
  // We'll reveal the final answer at the end of the counting stagger.
  const staggerFrames = timings[4]?.dur ? timings[4].dur / Math.max(1, remainCount + 1) : fps;
  const revealAnswerFrame = p5 + (remainCount * staggerFrames);
  const showFinalAnswer = frame >= revealAnswerFrame;

  // Phase 5 Answer reveal (Counting remainder)
  const getCountOpacity = (idx: number) => {
    const startFrame = p5 + (idx * staggerFrames);
    return spring({ frame: Math.max(0, frame - startFrame), fps, config: { damping: 15 } });
  };
  const confettiProgress = spring({ frame: Math.max(0, frame - p5 - (fps * 2)), fps });

  // Render variables
  const containerWidth = 1000;
  const itemSize = totalCount > 10 ? 50 : 80;

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      
      {/* Main visual arena */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", gap: gapSize, marginTop: 100 }}>
        
        {/* SUBSET GROUP (Left side after separation) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {/* Label for subset */}
          <div style={{
            opacity: separateProgress,
            transform: `translateY(${interpolate(separateProgress, [0, 1], [20, 0])}px)`,
            background: "rgba(236,72,153,0.2)", padding: "10px 20px", borderRadius: 16,
            border: "2px solid #EC4899", color: "#FBCFE8", fontSize: 28, fontWeight: "bold"
          }}>
            {subsetLabel} = {subsetCount}
          </div>
          
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", gap: itemSize * 0.2 }}>
            {Array.from({ length: subsetCount }).map((_, i) => (
              <div key={`sub-${i}`} style={{
                transform: `scale(${popProgress * highlightScale})`,
                // Highlight filter (hue shift towards pink/magenta if possible, plus brightness)
                filter: frame >= p2 ? "sepia(1) hue-rotate(-50deg) saturate(3) brightness(1.2)" : "none",
                transition: "filter 0.5s ease"
              }}>
                <ItemComponent itemType={itemType} size={itemSize} />
              </div>
            ))}
          </div>
        </div>

        {/* REMAINDER GROUP (Right side after separation) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {/* Label for remainder */}
          <div style={{
            opacity: separateProgress,
            transform: `translateY(${interpolate(separateProgress, [0, 1], [20, 0])}px)`,
            background: "rgba(59,130,246,0.2)", padding: "10px 20px", borderRadius: 16,
            border: "2px solid #3B82F6", color: "#BFDBFE", fontSize: 28, fontWeight: "bold"
          }}>
            <span style={{ color: showFinalAnswer ? "#FCD34D" : "inherit" }}>
              {remainLabel} = {showFinalAnswer ? remainCount : "?"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", gap: itemSize * 0.2 }}>
            {Array.from({ length: remainCount }).map((_, i) => {
              const countOpac = activePhase >= 4 ? getCountOpacity(i) : 0;
              return (
                <div key={`rem-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ transform: `scale(${popProgress})` }}>
                    <ItemComponent itemType={itemType} size={itemSize} />
                  </div>
                  {/* Counting ticks for remainder */}
                  <span style={{ 
                    fontSize: 24, fontWeight: "bold", color: "#FCD34D", marginTop: 5,
                    opacity: countOpac, transform: `translateY(${interpolate(countOpac, [0,1], [10,0])}px)`
                  }}>
                    {i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* EQUATION ROW (Appears in Phase 4) */}
      <div style={{
        marginTop: 60,
        opacity: eq4Progress,
        transform: `translateY(${interpolate(eq4Progress, [0, 1], [30, 0])}px)`,
        background: "rgba(255, 255, 255, 0.1)", backdropFilter: "blur(10px)",
        borderRadius: 24, padding: "20px 60px",
        border: "2px solid rgba(255, 255, 255, 0.2)",
        display: "flex", gap: 20, alignItems: "center"
      }}>
        <span style={{ color: "white", fontSize: 64, fontWeight: 900 }}>{totalCount}</span>
        <span style={{ color: "#F87171", fontSize: 64, fontWeight: 900 }}>−</span>
        <span style={{ color: "#EC4899", fontSize: 64, fontWeight: 900 }}>{subsetCount}</span>
        <span style={{ color: "#9CA3AF", fontSize: 64, fontWeight: 900 }}>=</span>
        <span style={{ color: showFinalAnswer ? "#FCD34D" : "#9CA3AF", fontSize: 64, fontWeight: 900 }}>
          {showFinalAnswer ? remainCount : "?"}
        </span>
      </div>

    </AbsoluteFill>
  );
};
