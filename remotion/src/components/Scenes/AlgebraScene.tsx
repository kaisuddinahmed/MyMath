import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring } from "remotion";
import type { DirectorScene } from "../../types";

export const AlgebraScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const progress = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
      {scene.action === "BALANCE" && (
        <div style={{ display: "flex", alignItems: "center", transform: `scale(${progress})` }}>
          <div style={{ fontSize: 60, backgroundColor: "#1e293b", padding: 30, borderRadius: 10, color: "white" }}>
            📦 + 5
          </div>
          <div style={{ fontSize: 80, margin: "0 40px", color: "#fcd34d" }}>=</div>
          <div style={{ fontSize: 60, backgroundColor: "#1e293b", padding: 30, borderRadius: 10, color: "white" }}>
            12
          </div>
        </div>
      )}

      <h2 style={{ color: "white", fontSize: 40, marginTop: 60, opacity: progress }}>{scene.narration}</h2>
    </AbsoluteFill>
  );
};
