import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, interpolate } from "remotion";
import type { DirectorScene } from "../../types";

export const NumberOrderingScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Extract start and end arrays from equations
  const startEq = groupedScenes[0]?.equation || "8, 3, 5, 2, 1";
  const endEq = groupedScenes[groupedScenes.length - 1]?.equation || "1, 2, 3, 5, 8";

  // Parse numbers
  const parseNumbers = (eq: string) =>
    eq.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));

  const startArr = parseNumbers(startEq);
  let endArr = parseNumbers(endEq);
  
  // Guard against missing or mismatched arrays
  if (startArr.length === 0) startArr.push(1, 2, 3);
  if (endArr.length !== startArr.length) {
    endArr = [...startArr].sort((a, b) => a - b);
  }

  // Calculate timing boundaries:
  // Usually scene 1 is introduction, scene 2 is the transition, scene 3 is final result.
  const step1End = timings[0]?.dur || 4 * fps;
  const isTransitioning = timings.length > 1;
  
  // Transition progress
  const transitionProgress = spring({
    frame: Math.max(0, frame - step1End),
    fps,
    config: { damping: 14, mass: 1 },
  });

  const itemWidth = 100;
  const gap = 20;
  const containerWidth = startArr.length * itemWidth + (startArr.length - 1) * gap;
  const startX = -containerWidth / 2 + itemWidth / 2;

  // Track each number's unique ID to find its index in start and end arrays
  // Note: if numbers are duplicated (e.g. 2, 3, 2), this naive indexOf might fail,
  // but for grade 1 math it's almost always unique distinct numbers.
  // We'll use objects to track exact instances if needed, but for simplicity let's handle duplicates 
  // by mapping them distinctly.
  const mappedElements = startArr.map((num, originalIndex) => {
    // find index in endArr
    // to handle duplicates, we blank out the used index in a copy of endArr
    const endArrCopy = [...endArr];
    let finalIndex = originalIndex;
    
    // Naively sort to find the target index (for animation purposes)
    // Actually, let's just use the sorted version of startArr to find target index to be totally safe
    const sortedStart = [...startArr].sort((a, b) => {
      // If it's descending ordering, the end array will tell us.
      // E.g. endArr[0] > endArr[endArr.length-1] means descending
      const isDescending = endArr[0] > endArr[endArr.length - 1];
      return isDescending ? b - a : a - b;
    });
    
    // Find where THIS 'num' goes. 
    // We need to handle duplicates carefully.
    return { num, originalIndex };
  });

  // Calculate destination indices
  const destinationIndices = new Array(startArr.length).fill(0);
  const used = new Set();
  
  mappedElements.forEach((el, i) => {
    let dest = endArr.findIndex((v, idx) => v === el.num && !used.has(idx));
    if (dest === -1) dest = i; // Fallback
    used.add(dest);
    destinationIndices[i] = dest;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end", // Align from the bottom instead of center
        justifyContent: "center",
        height: "100%", // Take full height
        paddingBottom: "15%", // Push the 'base' floor up by 15% from the screen bottom
        gap: gap,
        position: "relative",
      }}
    >
      <div style={{ position: "relative", width: containerWidth, height: itemWidth }}>
        {mappedElements.map((el, i) => {
          const destIdx = destinationIndices[i];
          
          // Calculate X positions
          const xStart = i * (itemWidth + gap);
          const xEnd = destIdx * (itemWidth + gap);
          
          const currentX = interpolate(transitionProgress, [0, 1], [xStart, xEnd]);
          
          // Pop in animation for the initial entry
          const popIn = spring({
            frame: Math.max(0, frame - (i * 5)), // stagger entry
            fps,
            config: { damping: 10 }
          });

          // Block units for visual magnitude
          const blockHeight = 30;
          const blockGap = 4;
          const towerHeight = el.num * (blockHeight + blockGap);
          
          return (
            <div
              key={`tower-${i}`}
              style={{
                position: "absolute",
                left: currentX,
                bottom: 0,
                width: itemWidth,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: `scale(${popIn})`,
                transformOrigin: "bottom center",
              }}
            >
              {/* The stack of visual blocks */}
              <div 
                style={{
                  display: "flex",
                  flexDirection: "column-reverse", // stack from bottom
                  gap: blockGap,
                  marginBottom: gap,
                }}
              >
                {Array.from({ length: el.num }).map((_, bIdx) => {
                  return (
                    <div 
                      key={bIdx}
                      style={{
                        width: itemWidth - 20, // slightly narrower than the base tablet
                        height: blockHeight,
                        backgroundColor: "#34D399", // Emerald green for the blocks
                        borderRadius: 6,
                        boxShadow: "0 4px 6px rgba(16, 185, 129, 0.3)",
                        border: "1px solid rgba(255,255,255,0.2)"
                      }}
                    />
                  )
                })}
              </div>

              {/* The Number Text base */}
              <div
                style={{
                  width: itemWidth,
                  height: itemWidth,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                  borderRadius: 24,
                  boxShadow: "0 10px 25px rgba(79, 70, 229, 0.4)",
                  color: "white",
                  fontSize: 48,
                  fontWeight: "bold",
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                {el.num}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
