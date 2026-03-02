import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, interpolate } from "remotion";
import type { DirectorScene } from "../../types";

export const BODMASScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const progress = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  // Example equation format: "(3+4)×2−1" -> we expect scenes to pass the current equation state
  const eqStr = scene.equation || "(3+4)×2";
  
  // Highlight bracket logic (if '(' exists, glow it)
  const hasBrackets = eqStr.includes("(") && eqStr.includes(")");
  let displayHTML = eqStr;
  
  if (hasBrackets) {
    const startIdx = eqStr.indexOf("(");
    const endIdx = eqStr.indexOf(")") + 1;
    const beforePart = eqStr.substring(0, startIdx);
    const bracketPart = eqStr.substring(startIdx, endIdx);
    const afterPart = eqStr.substring(endIdx);
    
    // Dim the non-bracket part, pulse the bracket part
    const pulse = interpolate(Math.sin((frame * Math.PI) / 15), [-1, 1], [0.6, 1]);
    
    displayHTML = `
      <span style="opacity: 0.4">${beforePart}</span>
      <span style="color: #fcd34d; filter: drop-shadow(0 0 10px rgba(252,211,77,${pulse}))">${bracketPart}</span>
      <span style="opacity: 0.4">${afterPart}</span>
    `;
  }

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", flexDirection: "column" }}>
      
      <div 
        style={{ 
          transform: `scale(${progress})`,
          fontSize: 100,
          fontWeight: "bold",
          color: "#f8fafc",
          letterSpacing: "0.1em",
          fontFamily: "'Inter', monospace",
          backgroundColor: "#1e293b",
          padding: "40px 60px",
          borderRadius: 24,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
        }}
        dangerouslySetInnerHTML={{ __html: displayHTML }}
      />
      
      <h2 style={{ color: "white", fontSize: 40, marginTop: 100, opacity: progress, textAlign: "center", maxWidth: "80%" }}>
        {scene.narration}
      </h2>
    </AbsoluteFill>
  );
};
