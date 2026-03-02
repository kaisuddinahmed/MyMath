import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, interpolate } from "remotion";
import type { DirectorScene } from "../../types";

export const GeometryScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const progress = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const shapeStr = ((scene.equation || "") + " " + (scene.narration || "")).toLowerCase();
  
  const drawShape = () => {
    if (shapeStr.includes("triangle")) {
      return (
        <svg width="400" height="400" viewBox="0 0 100 100" style={{ overflow: "visible" }}>
          <polygon points="50,10 10,90 90,90" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
          {/* Measurement labels */}
          <line x1="50" y1="10" x2="50" y2="90" stroke="#f8fafc" strokeWidth="1" strokeDasharray="2" />
          <text x="50" y="100" fontSize="6" fill="#fcd34d" textAnchor="middle" fontWeight="bold">Base</text>
          <text x="52" y="55" fontSize="6" fill="#fcd34d" textAnchor="start" fontWeight="bold">Height</text>
        </svg>
      );
    } else if (shapeStr.includes("circle")) {
      return (
        <svg width="400" height="400" viewBox="0 0 100 100" style={{ overflow: "visible" }}>
          <circle cx="50" cy="50" r="40" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="2" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="#f8fafc" strokeWidth="1" strokeDasharray="2" />
          <circle cx="50" cy="50" r="1.5" fill="white" />
          <text x="50" y="47" fontSize="6" fill="#fcd34d" textAnchor="middle" fontWeight="bold">Diameter</text>
        </svg>
      );
    } else if (shapeStr.includes("parallelogram")) {
      // Parallelogram transformation animation to show area equivalence
      const slide = spring({ frame: Math.max(0, frame - 45), fps, config: { damping: 14 } });
      const moveX = interpolate(slide, [0, 1], [0, 80]);
      return (
        <svg width="500" height="300" viewBox="0 0 140 80" style={{ overflow: "visible" }}>
          {/* Base shape (the middle rectangle part that doesnt move) */}
          <polygon points="30,10 90,10 90,70 30,70" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
          {/* The triangle that gets sliced and moved */}
          <polygon points="10,70 30,10 30,70" fill="rgba(16, 185, 129, 0.5)" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" 
             style={{ transform: `translateX(${moveX}px)` }} />
          {/* The outline of where it originally was (dashed) */}
          <polygon points="10,70 30,10 30,70" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="2" />
          {/* Base and Height labels */}
          <text x="60" y="78" fontSize="6" fill="#fcd34d" textAnchor="middle" fontWeight="bold">Base</text>
          <text x="32" y="40" fontSize="6" fill="#fcd34d" textAnchor="start" fontWeight="bold">Height</text>
        </svg>
      );
    } else {
      // Rectangle/Square fallback
      return (
        <svg width="400" height="400" viewBox="0 0 100 100" style={{ overflow: "visible" }}>
          <rect x="10" y="20" width="80" height="60" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="2" rx="2" />
          <text x="50" y="15" fontSize="6" fill="#fcd34d" textAnchor="middle" fontWeight="bold">Length</text>
          <text x="95" y="50" fontSize="6" fill="#fcd34d" textAnchor="start" fontWeight="bold">Width</text>
        </svg>
      );
    }
  };

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", flexDirection: "column" }}>
      <div style={{ transform: `scale(${progress})` }}>
        {drawShape()}
      </div>
      <h2 style={{ color: "white", fontSize: 40, marginTop: 80, opacity: progress, textAlign: "center", maxWidth: "80%", lineHeight: 1.4 }}>
        {scene.narration}
      </h2>
    </AbsoluteFill>
  );
};
