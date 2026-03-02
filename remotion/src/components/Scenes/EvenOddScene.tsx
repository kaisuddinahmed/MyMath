import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring } from "remotion";
import type { DirectorScene } from "../../types";

export const EvenOddScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const progress = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const num = parseInt(scene.equation || "13", 10);
  const isEven = num % 2 === 0;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 60, transform: `scale(${progress})` }}>
        
        {/* Left column (pairs) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
           {Array.from({ length: Math.floor(num / 2) }).map((_, i) => (
             <div key={`pair-${i}`} style={{ display: "flex", gap: 10 }}>
               <div style={{ width: 40, height: 40, backgroundColor: "#3b82f6", borderRadius: "50%" }} />
               <div style={{ width: 40, height: 40, backgroundColor: "#3b82f6", borderRadius: "50%" }} />
             </div>
           ))}
        </div>

        {/* Right column (leftover) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
           {!isEven && (
             <div style={{ 
               width: 40, 
               height: 40, 
               backgroundColor: "#ef4444", 
               borderRadius: "50%",
               boxShadow: `0 0 20px rgba(239, 68, 68, ${Math.abs(Math.sin(frame / 10))})`,
               transform: `scale(${1 + Math.abs(Math.sin(frame / 10)) * 0.2})`
             }} />
           )}
        </div>
        
      </div>

      {progress > 0.8 && (
        <div style={{ marginTop: 60, fontSize: 80, fontWeight: "bold", color: isEven ? "#10b981" : "#ef4444" }}>
          {isEven ? "Even" : "Odd"}
        </div>
      )}

      <h2 style={{ color: "white", fontSize: 40, marginTop: 40, opacity: progress, textAlign: "center", maxWidth: "80%" }}>
        {scene.narration}
      </h2>
    </AbsoluteFill>
  );
};
