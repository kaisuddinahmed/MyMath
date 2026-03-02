import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring } from "remotion";
import type { DirectorScene } from "../../types";

export const CurrencyScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const progress = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", width: 800, transform: `scale(${progress})` }}>
        {scene.item_type === "COIN" && [...Array(scene.count || 5)].map((_, i) => (
          <div key={i} style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "radial-gradient(#fde047, #ca8a04)",
            display: "flex", justifyContent: "center", alignItems: "center",
            border: "4px solid #a16207", color: "#713f12", fontWeight: "bold", fontSize: 24
          }}>
            $1
          </div>
        ))}
        {scene.item_type === "NOTE" && [...Array(scene.count || 3)].map((_, i) => (
          <div key={i} style={{
            width: 140, height: 70, backgroundColor: "#bbf7d0",
            border: "2px solid #166534", borderRadius: 4,
            display: "flex", justifyContent: "center", alignItems: "center",
            color: "#14532d", fontWeight: "bold", fontSize: 24, padding: 5,
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.1)"
          }}>
            $10
          </div>
        ))}
      </div>

      <h2 style={{ color: "white", fontSize: 40, marginTop: 60, opacity: progress }}>{scene.narration}</h2>
    </AbsoluteFill>
  );
};
