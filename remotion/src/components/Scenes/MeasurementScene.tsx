import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring } from "remotion";
import type { DirectorScene } from "../../types";

export const MeasurementScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const progress = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
      {scene.item_type === "RULER" && (
        <div
          style={{
            width: 600,
            height: 80,
            backgroundColor: "#fcd34d",
            transform: `scale(${progress})`,
            display: "flex",
            justifyContent: "space-between",
            padding: "0 20px",
            alignItems: "flex-end",
            border: "2px solid #b45309",
            borderRadius: "4px"
          }}
        >
           {[...Array(11)].map((_, i) => (
             <div key={i} style={{ height: "40%", width: 2, backgroundColor: "#b45309" }} />
           ))}
        </div>
      )}
      
      {scene.item_type === "CLOCK" && (
        <div
          style={{
            width: 200,
            height: 200,
            backgroundColor: "white",
            transform: `scale(${progress})`,
            borderRadius: "50%",
            border: "8px solid #1e293b",
            position: "relative"
          }}
        >
          {/* Hour Hand */}
          <div style={{ position: "absolute", bottom: "50%", left: "48%", width: 6, height: 50, backgroundColor: "#1e293b", transformOrigin: "bottom" }} />
          {/* Minute Hand */}
          <div style={{ position: "absolute", bottom: "50%", left: "49%", width: 4, height: 80, backgroundColor: "#ef4444", transformOrigin: "bottom", transform: "rotate(90deg)" }} />
        </div>
      )}

      <h2 style={{ color: "white", fontSize: 40, marginTop: 40, opacity: progress }}>{scene.narration}</h2>
    </AbsoluteFill>
  );
};
