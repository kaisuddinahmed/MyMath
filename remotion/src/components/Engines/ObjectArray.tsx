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
    leftPopDelay?: number;   // frames to wait before group 1 starts appearing (default: 0)
    popInEnd: number;        // when group 2 starts appearing (= rightPopDelay)
    operatorStart?: number;  // when + sign becomes visible (default: same as popInEnd)
    actionStart: number;     // when gap starts collapsing (merge animation)
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

  // --- Step 1a: Left group pop-in (delayed by leftPopDelay if provided) ---
  const leftDelay = t.leftPopDelay || 0;
  const popProgress = spring({ frame: Math.max(0, frame - leftDelay), fps, config: { damping: 10, stiffness: 100 } });
  const scaleY = interpolate(popProgress, [0, 0.7, 1, 1.2], [0, 1.3, 1, 0.9], { extrapolateRight: "clamp" });
  const scaleX = interpolate(popProgress, [0, 0.7, 1, 1.2], [0, 0.8, 1, 1.1], { extrapolateRight: "clamp" });
  // Keep group 1 fully invisible before its delay fires
  const leftGroupOpacity = leftDelay > 0 ? Math.min(1, popProgress * 3) : 1;

  // --- Step 1b: Right group pop-in (delayed until popInEnd for ADD) ---
  // For ADD: right group appears after left group with a visible gap between them.
  // For SUBTRACT: right group is already there from frame 0 (it's the set being removed).
  const rightPopDelay = action === "ADD" ? t.popInEnd : 0;
  const rightPopProgress = spring({
    frame: Math.max(0, frame - rightPopDelay),
    fps,
    config: { damping: 10, stiffness: 100 },
  });
  const rightScaleY = interpolate(rightPopProgress, [0, 0.7, 1, 1.2], [0, 1.3, 1, 0.9], { extrapolateRight: "clamp" });
  const rightScaleX = interpolate(rightPopProgress, [0, 0.7, 1, 1.2], [0, 0.8, 1, 1.1], { extrapolateRight: "clamp" });
  // Right group is invisible before its pop-in delay
  const rightGroupOpacity = action === "ADD" ? Math.min(1, rightPopProgress * 3) : 1;

  // --- Step 2: Action (Merge for ADD, Fade/Fall for SUB) ---
  const actionProgress = spring({
    frame: Math.max(0, frame - t.actionStart),
    fps,
    config: { damping: 14 }
  });

  // For Addition: gap between groups collapses from 80px → 0 during merge.
  // This gap is APPLIED in the JSX (unlike before where it was computed but unused).
  const additionGap = action === "ADD"
    ? interpolate(actionProgress, [0, 1], [80, 0], { extrapolateRight: "clamp" })
    : 0;

  // For Subtraction, the right group falls down and fades out
  const subFallY = interpolate(actionProgress, [0, 0.3, 1], [0, -60, 400], { extrapolateRight: "clamp" });
  const subFallX = interpolate(actionProgress, [0, 1], [0, 100], { extrapolateRight: "clamp" });
  const subRotate = interpolate(actionProgress, [0, 1], [0, 90], { extrapolateRight: "clamp" });
  const subOpacity = interpolate(actionProgress, [0, 0.8, 1], [1, 1, 0], { extrapolateRight: "clamp" });

  // Operator: appears at operatorStart (or falls back to when group 2 appears), fades out during merge
  const opDelay = t.operatorStart !== undefined ? t.operatorStart : t.popInEnd;
  const operatorProgress = spring({
    frame: Math.max(0, frame - opDelay),
    fps,
    config: { damping: 15 },
  });
  const operatorOpacity = action === "ADD"
    ? operatorProgress * interpolate(actionProgress, [0, 0.5], [1, 0], { extrapolateRight: "clamp" })
    : interpolate(actionProgress, [0, 0.5], [1, 0], { extrapolateRight: "clamp" });

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
        gap: action === "ADD" ? 0 : 16, // For ADD, gap is controlled by additionGap on right group
      }}>

        {/* LEFT GROUP (For Subtraction, this is the remaining items) */}
        <div style={{ display: "flex", gap: 16, opacity: leftGroupOpacity }}>
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

        {/* OPERATOR: + sign for ADD (appears with right group, fades during merge) */}
        {action === "ADD" && (
          <div style={{
            opacity: operatorOpacity,
            marginLeft: additionGap * 0.4,
            marginRight: additionGap * 0.4,
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: 40,
          }}>
            <span style={{
              color: "#FCD34D", fontSize: 56, fontWeight: 900,
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              lineHeight: 1,
            }}>+</span>
          </div>
        )}

        {/* RIGHT GROUP (For ADD: appears after left group with gap; for SUBTRACT: removed items) */}
        <div style={{
          display: "flex", gap: 16,
          // For ADD: right group shifts right by remaining gap amount so total gap = additionGap
          marginLeft: action === "ADD" ? additionGap * 0.2 : 0,
          opacity: action === "ADD" ? rightGroupOpacity : 1,
        }}>
          {Array.from({ length: rightCount }).map((_, idx) => {
            const absoluteIdx = leftCount + idx;
            const countProg = getCountOpacity(absoluteIdx);

            // Subtraction logic: this group falls away
            const dropY = action === "SUBTRACT" ? subFallY : 0;
            const dropX = action === "SUBTRACT" ? subFallX : 0;
            const opac = action === "SUBTRACT" ? subOpacity : 1;

            // Use rightScaleX/Y for ADD (delayed pop-in), original scales for SUBTRACT
            const rsx = action === "ADD" ? rightScaleX : scaleX;
            const rsy = action === "ADD" ? rightScaleY : scaleY;

            return (
              <div key={`R-${idx}`} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
              }}>
                <div style={{
                  transform: `translate(${dropX}px, ${dropY}px) scaleX(${rsx}) scaleY(${rsy}) rotate(${action === "SUBTRACT" ? subRotate : 0}deg)`,
                  opacity: opac,
                }}>
                  <ItemComponent itemType={itemType} size={70} />
                </div>

                {/* Spacer for SUBTRACT alignment */}
                <span style={{
                  fontSize: 32, fontWeight: "bold",
                  opacity: 0, pointerEvents: "none",
                  display: action !== "ADD" ? "block" : "none"
                }}>
                  0
                </span>

                {/* Counting Number (ADD only) */}
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
