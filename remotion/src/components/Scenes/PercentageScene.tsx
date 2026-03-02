import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring } from "remotion";
import type { DirectorScene } from "../../types";

export const PercentageScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const progress = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  // e.g. "45%"
  const pcMatch = (scene.equation || "25%").match(/\d+/);
  const targetPct = pcMatch ? parseInt(pcMatch[0], 10) : 25;
  
  // Fill animation over 60 frames
  const fillProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 100, mass: 2 },
    durationInFrames: 60
  });

  const filledCubes = Math.round(targetPct * fillProgress);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", flexDirection: "column" }}>
      
      <div style={{ transform: `scale(${progress})`, display: "flex", alignItems: "center", gap: 60 }}>
        
        {/* 10x10 Grid */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(10, 1fr)", 
          gap: 2, 
          padding: 10, 
          backgroundColor: "#1e293b",
          borderRadius: 12,
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)"
        }}>
          {Array.from({ length: 100 }).map((_, i) => {
            // Fill bottom-up, left-to-right
            const col = i % 10;
            const row = 9 - Math.floor(i / 10);
            const index = row * 10 + col;
            const isFilled = index < filledCubes;
            
            return (
              <div 
                key={i} 
                style={{ 
                  width: 30, 
                  height: 30, 
                  backgroundColor: isFilled ? "#10b981" : "#334155",
                  borderRadius: 4,
                  transition: "background-color 0.1s"
                }} 
              />
            );
          })}
        </div>

        {/* Huge Percentage Text */}
        <div style={{ fontSize: 120, fontWeight: "bold", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
          {filledCubes}<span style={{ color: "#10b981" }}>%</span>
        </div>

      </div>

      <h2 style={{ color: "white", fontSize: 40, marginTop: 80, opacity: progress, textAlign: "center", maxWidth: "80%" }}>
        {scene.narration}
      </h2>
    </AbsoluteFill>
  );
};
