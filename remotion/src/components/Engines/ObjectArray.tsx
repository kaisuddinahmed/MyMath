import React from "react";
import { useVideoConfig, useCurrentFrame, spring, interpolate } from "remotion";
import { ItemComponent } from "../../assets/items/ItemSvgs";

export type ObjectArrayAction = "ADD" | "SUBTRACT" | "COUNT";

export interface ObjectArrayProps {
  /** The item to render (e.g. APPLE_SVG) */
  itemType: string;
  /** The mathematical action taking place */
  action: ObjectArrayAction;
  /** Number of items in the left group (starting group) */
  leftCount: number;
  /** Number of items in the right group (joining or leaving group) */
  rightCount: number;
  /** The full equation string to display at the end (e.g., "4 + 2 = 6") */
  equationStr?: string;
  /** 
   * Timing offsets (in frames) to control when each phase starts.
   * If not provided, defaults will be calculated based on standard fps.
   */
  timings?: {
    popInEnd: number;
    actionStart: number;
    actionEnd: number;
    countStart: number;
    equationStart: number;
  };
}

/**
 * A highly reusable "Engine" for Class 1 and 2 objects.
 * Handles Counting, Addition (merging groups), and Subtraction (separating/fading groups).
 * Features "squash and stretch" physics and smooth stagger animations.
 */
export const ObjectArray: React.FC<ObjectArrayProps> = ({
  itemType,
  action,
  leftCount,
  rightCount,
  equationStr,
  timings,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const totalCount = leftCount + rightCount; // Always total. Left is remain, Right is subtract.
  
  // Default timings if not provided
  const t = timings || {
    popInEnd: 2 * fps,               // Step 1: Initial pop
    actionStart: 2 * fps,            // Step 2: Merge/Separate starts
    actionEnd: 4 * fps,              // Step 2 ends
    countStart: 5 * fps,             // Step 3: Counting numbers appear
    equationStart: 7 * fps           // Step 4: Final equation shows
  };

  // --- Step 1: Squash & Stretch Pop-in ---
  // Instead of a simple spring scale, we do a bounce that stretches vertically
  const popProgress = spring({ frame, fps, config: { damping: 10, stiffness: 100 } });
  
  // Map progress (0 -> 1 -> overshoot -> 1) into an elastic scale
  const scaleY = interpolate(popProgress, [0, 0.7, 1, 1.2], [0, 1.3, 1, 0.9], { extrapolateRight: "clamp" });
  const scaleX = interpolate(popProgress, [0, 0.7, 1, 1.2], [0, 0.8, 1, 1.1], { extrapolateRight: "clamp" });

  // --- Step 2: Action (Merge for ADD, Fade/Fall for SUB) ---
  const actionProgress = spring({
    frame: Math.max(0, frame - t.actionStart),
    fps,
    config: { damping: 14 }
  });

  // For Addition, the gap between left and right groups collapses
  const additionGap = interpolate(actionProgress, [0, 1], [100, 0], { extrapolateRight: "clamp" });
  
  // For Subtraction, the right group falls down and fades out
  // Make the fall much more pronounced so it breaks out of the row with a bounce arc
  const subFallY = interpolate(actionProgress, [0, 0.3, 1], [0, -60, 400], { extrapolateRight: "clamp" });
  const subFallX = interpolate(actionProgress, [0, 1], [0, 100], { extrapolateRight: "clamp" });
  const subRotate = interpolate(actionProgress, [0, 1], [0, 90], { extrapolateRight: "clamp" });
  const subOpacity = interpolate(actionProgress, [0, 0.8, 1], [1, 1, 0], { extrapolateRight: "clamp" });

  // Operator (+ or -) fades out as the action resolves
  const operatorOpacity = interpolate(actionProgress, [0, 0.5], [1, 0], { extrapolateRight: "clamp" });

  // --- Step 3: Counting Numbers ---
  const getCountOpacity = (idx: number) => {
    // Stagger the counting numbers
    const staggerFrames = (t.equationStart - t.countStart) / Math.max(1, totalCount);
    const startFrame = t.countStart + (idx * staggerFrames);
    return spring({
      frame: Math.max(0, frame - startFrame),
      fps,
      config: { damping: 15 }
    });
  };

  // --- Step 4: Final Equation ---
  const eqOpacity = spring({
    frame: Math.max(0, frame - t.equationStart),
    fps,
    config: { damping: 12 }
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", width: "100%"
    }}>
      
      {/* Main Container */}
      <div style={{
        display: "flex", flexDirection: "row", alignItems: "center",
        gap: action === "ADD" ? 20 : 16 // Consistent gap for both
      }}>
        
        {/* LEFT GROUP (For Subtraction, this is the remaining items) */}
        <div style={{ display: "flex", gap: 16 }}>
          {Array.from({ length: leftCount }).map((_, idx) => {
            const countProg = getCountOpacity(idx);
            return (
              <div key={`L-${idx}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{ transform: `scaleX(${scaleX}) scaleY(${scaleY})` }}>
                  <ItemComponent itemType={itemType} size={70} />
                </div>
                {/* Counting Number */}
                <span style={{
                  fontSize: 32, fontWeight: "bold", color: "#FCD34D",
                  opacity: countProg,
                  transform: `translateY(${interpolate(countProg, [0, 1], [15, 0])}px)`
                }}>
                  {idx + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* NO OPERATOR BETWEEN GROUPS: We want them to look like one continuous line initially */}

        {/* RIGHT GROUP (For Subtraction, these are the items being removed) */}
        <div style={{ display: "flex", gap: 16 }}>
          {Array.from({ length: rightCount }).map((_, idx) => {
            const absoluteIdx = leftCount + idx; // Just continue the count visually from left to right
            const countProg = getCountOpacity(absoluteIdx);
            
            // Subtraction logic: this group falls away
            const dropY = action === "SUBTRACT" ? subFallY : 0;
            const dropX = action === "SUBTRACT" ? subFallX : 0;
            const opac = action === "SUBTRACT" ? subOpacity : 1;

            return (
              <div key={`R-${idx}`} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
              }}>
                {/* 
                  CRITICAL FIX: The falling animation needs to be on a wrapper that 
                  doesn't break the flexbox layout width, otherwise the whole row shifts.
                */}
                <div style={{
                  transform: `translate(${dropX}px, ${dropY}px) scaleX(${scaleX}) scaleY(${scaleY}) rotate(${action === "SUBTRACT" ? subRotate : 0}deg)`, 
                  opacity: opac,
                }}>
                  <ItemComponent itemType={itemType} size={70} />
                </div>
                
                {/* 
                  Spacer so the Right Group has the exact same vertical 
                  dimensions as the Left Group. This fixes alignment! 
                */}
                <span style={{
                  fontSize: 32, fontWeight: "bold",
                  opacity: 0, pointerEvents: "none",
                  display: action !== "ADD" ? "block" : "none" // Always occupy space if not adding (since count is not rendered)
                }}>
                  0
                </span>
                
                {/* Counting Number (Only show if adding) */}
                {action === "ADD" && (
                  <span style={{
                    fontSize: 32, fontWeight: "bold", color: "#FCD34D",
                    opacity: countProg,
                    transform: `translateY(${interpolate(countProg, [0, 1], [15, 0])}px)`
                  }}>
                    {absoluteIdx + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* FINAL EQUATION */}
      {equationStr && (
        <div style={{
          marginTop: 60,
          opacity: eqOpacity,
          transform: `translateY(${interpolate(eqOpacity, [0, 1], [30, 0])}px) scale(${interpolate(eqOpacity, [0, 1], [0.9, 1])})`,
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: 24, padding: "20px 60px",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
        }}>
          <p style={{
            color: "white", fontSize: 64, fontWeight: 900,
            margin: 0, letterSpacing: 3, textShadow: "0 4px 12px rgba(0,0,0,0.5)"
          }}>
            {equationStr}
          </p>
        </div>
      )}
    </div>
  );
};
