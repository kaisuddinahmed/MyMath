import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, interpolate } from "remotion";
import type { DirectorScene } from "../../types";

export const NumberLineScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Parse equation "5 + 3" or similar to find start and jump
  const equation = scene.equation || "";
  const nums = (equation.match(/\d+/g) || []).map(Number);
  const startNum = nums.length > 0 ? nums[0] : 0;
  const jumpSize = scene.count || (nums.length > 1 ? nums[1] : 5);
  
  const endNum = startNum + jumpSize;
  const lineStart = Math.max(0, startNum - 2);
  const lineEnd = endNum + 2;
  const numTicks = lineEnd - lineStart + 1;

  const introProgress = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  // Jump animation
  const jumpStartFrame = 15;
  const jumpProgress = spring({
    frame: frame - jumpStartFrame,
    fps,
    config: { damping: 14 }
  });

  // 100% width = numTicks
  const tickWidthPct = 100 / numTicks;
  // Center of the tick
  const startX = (startNum - lineStart + 0.5) * tickWidthPct;
  const endX = (endNum - lineStart + 0.5) * tickWidthPct;
  const currentX = interpolate(jumpProgress, [0, 1], [startX, endX]);
  
  // Parabolic arch for Y: inverted parabola scaled by jumpHeight
  const jumpHeight = 80; // max height of jump in px
  const currentY = -4 * jumpProgress * (1 - jumpProgress) * jumpHeight;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", backgroundColor: "#0F172A" }}>
      {scene.action === "JUMP_NUMBER_LINE" && (
        <div style={{ position: "relative", width: "80%", height: 300, transform: `scale(${introProgress})` }}>
          {/* The Line */}
          <div style={{ position: "absolute", top: 150, width: "100%", height: 8, backgroundColor: "#94a3b8", borderRadius: 4 }} />
          
          {/* Ticks */}
          {Array.from({ length: numTicks }).map((_, i) => {
            const num = lineStart + i;
            return (
              <div key={i} style={{ position: "absolute", top: 135, left: `${(i + 0.5) * tickWidthPct}%`, width: 4, height: 38, backgroundColor: "#e2e8f0", transform: "translateX(-50%)" }}>
                <div style={{ position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", color: "#f8fafc", fontSize: 28, fontWeight: "bold" }}>
                  {num}
                </div>
              </div>
            );
          })}
          
          {/* Hopper (circle) */}
          <div style={{ 
            position: "absolute", 
            top: 110, 
            left: `${currentX}%`, 
            transform: `translate(-50%, ${currentY}px)`,
            width: 50, 
            height: 50, 
            backgroundColor: "#f59e0b", 
            borderRadius: "50%",
            border: "4px solid white",
            zIndex: 10,
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
          }} />
          
          {/* Jump Label */}
          {jumpProgress > 0.5 && (
            <div style={{
              position: "absolute",
              top: 20,
              left: `${(startX + endX) / 2}%`,
              transform: "translateX(-50%)",
              color: "#fcd34d",
              fontSize: 40,
              fontWeight: "bold",
              opacity: interpolate(jumpProgress, [0.5, 1], [0, 1])
            }}>
              +{jumpSize}
            </div>
          )}
        </div>
      )}

      <h2 style={{ color: "white", fontSize: 40, marginTop: 40, opacity: introProgress }}>{scene.narration}</h2>
    </AbsoluteFill>
  );
};
