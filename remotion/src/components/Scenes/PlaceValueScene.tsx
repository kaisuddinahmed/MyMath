import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring } from "remotion";
import type { DirectorScene } from "../../types";

const PLACE_NAMES = [
  "Ones", "Tens", "Hundreds", "Thousands", "Ten Thousands", "Lakhs", "Ten Lakhs", "Crores"
];

export const PlaceValueScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Extract digits from the equation string (e.g. "45678")
  const equation = scene.equation || "0";
  const numMatch = equation.replace(/,/g, '').match(/\d+/);
  const numStr = numMatch ? numMatch[0] : "0";
  const digits = numStr.split('');

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
      {scene.action === "SHOW_PLACE_VALUE" && (
        <div style={{ display: "flex", gap: 30, padding: 40, backgroundColor: "#1e293b", borderRadius: 20 }}>
          {digits.map((digit, i) => {
            const placeIndex = digits.length - 1 - i;
            const placeName = PLACE_NAMES[placeIndex] || `10^${placeIndex}`;

            // Staggered slide-in animation for each column
            const slideProgress = spring({
              frame: frame - i * 5,
              fps,
              config: { damping: 14 }
            });

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 100 }}>
                <h3 style={{ color: "#94a3b8", fontSize: 24, margin: "0 0 20px 0" }}>{placeName}</h3>
                <div style={{ 
                  backgroundColor: "#334155", 
                  width: 80, 
                  height: 100, 
                  borderRadius: 12,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  transform: `translateY(${(1 - slideProgress) * -100}px)`,
                  opacity: slideProgress
                }}>
                  <span style={{ fontSize: 48, fontWeight: "bold", color: "#f8fafc" }}>{digit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
