import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import type { DirectorScene } from "../../types";

export const NumberBondScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Parse payload
  const scene = groupedScenes[0];
  const w = scene?.bond_whole ?? 10;
  const p1 = scene?.bond_part1 ?? 5;
  const p2 = scene?.bond_part2 ?? 5;
  const missing = scene?.bond_missing ?? "part2";
  
  // 2. Timeline
  const totalDur = timings[0]?.dur || fps * 5;
  
  const setupEnd = fps * 1; // 1s points pop in
  const askStart = Math.min(fps * 2, totalDur * 0.4); // Start pulsing the missing node
  const revealStart = totalDur - (fps * 2); // Reveal the answer 2s before end

  // 3. Animations
  // Setup pop loops
  const popProgress = spring({ frame, fps, config: { damping: 12 } });
  
  // Pulse the missing part
  const askProgress = interpolate(
    frame - askStart,
    [0, fps * 0.5, fps, fps * 1.5, fps * 2],
    [1, 1.2, 1, 1.2, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );

  // Reveal animation
  const revealProgress = spring({ frame: Math.max(0, frame - revealStart), fps, config: { damping: 12 } });

  // 4. Coordinates
  const cx = 500;
  const topY = 250;
  const bottomY = 600;
  const leftX = 300;
  const rightX = 700;
  
  const nodeRadius = 80;

  // Node styles
  const getNodeStyle = (type: "whole" | "part1" | "part2", x: number, y: number) => {
    const isMissing = missing === type;
    
    // Scale logic
    let currentScale = popProgress;
    if (isMissing && frame >= askStart && frame < revealStart) {
      currentScale *= askProgress;
    }
    if (isMissing && frame >= revealStart) {
      currentScale *= interpolate(revealProgress, [0, 0.5, 1], [1, 1.3, 1]);
    }

    // Value display logic
    let valStr = "";
    if (type === "whole") valStr = w.toString();
    if (type === "part1") valStr = p1.toString();
    if (type === "part2") valStr = p2.toString();
    
    let displayVal = valStr;
    let color = "#FFFFFF";
    
    if (isMissing) {
      if (frame < revealStart) {
        displayVal = "?";
        color = "#FCD34D"; // Yellow while asking
      } else {
        color = "#34D399"; // Green on reveal
      }
    }

    return (
      <div style={{
        position: "absolute",
        left: x - nodeRadius,
        top: y - nodeRadius,
        width: nodeRadius * 2,
        height: nodeRadius * 2,
        borderRadius: "50%",
        backgroundColor: "#1E293B",
        border: `8px solid ${isMissing && frame >= revealStart ? "#34D399" : "#6366F1"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 72,
        fontWeight: "bold",
        color: color,
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        transform: `scale(${currentScale})`,
        zIndex: 10
      }}>
        {/* If revealing, fade out ? and fade in Value */}
        {isMissing && frame >= revealStart ? (
          <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ position: "absolute", opacity: 1 - revealProgress }}>?</span>
            <span style={{ position: "absolute", opacity: revealProgress }}>{valStr}</span>
          </div>
        ) : (
          <span>{displayVal}</span>
        )}
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      
      {/* Title */}
      <div style={{
        position: "absolute", top: 80, fontSize: 50, fontWeight: "bold", color: "#F8FAFC",
        opacity: interpolate(popProgress, [0, 1], [0, 1])
      }}>
        Number Bonds
      </div>

      {/* Lines between nodes */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
        {/* Whole to Part 1 */}
        <line 
          x1={cx} y1={topY} x2={leftX} y2={bottomY} 
          stroke="#475569" strokeWidth="12" strokeLinecap="round"
          strokeDasharray="1000"
          strokeDashoffset={interpolate(popProgress, [0, 1], [1000, 0])}
        />
        {/* Whole to Part 2 */}
        <line 
          x1={cx} y1={topY} x2={rightX} y2={bottomY} 
          stroke="#475569" strokeWidth="12" strokeLinecap="round"
          strokeDasharray="1000"
          strokeDashoffset={interpolate(popProgress, [0, 1], [1000, 0])}
        />
      </svg>

      {/* Nodes */}
      {getNodeStyle("whole", cx, topY)}
      {getNodeStyle("part1", leftX, bottomY)}
      {getNodeStyle("part2", rightX, bottomY)}

    </AbsoluteFill>
  );
};
