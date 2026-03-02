import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { DirectorScene } from "../../types";

/**
 * FractionScene — Pie or bar chart showing fractions.
 */
export const FractionScene: React.FC<{ scene: DirectorScene }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Provide fallbacks in case the LLM doesn't set them
  const numerator = scene.numerator ?? 1;
  const denominator = Math.max(scene.denominator ?? 4, 1);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 40,
        backgroundColor: "#0F172A", // Match the unified math style
      }}
    >
      <div style={{ position: "relative", width: 400, height: 400 }}>
        {/* Pie chart */}
        <svg width={400} height={400} viewBox="0 0 400 400">
          {Array.from({ length: denominator }).map((_, i) => {
            const angle = (360 / denominator) * i - 90;
            const endAngle = angle + 360 / denominator;
            const filled = i < numerator;
            const reveal = spring({
              frame: Math.max(0, frame - i * 6),
              fps,
              from: 0,
              to: 1,
              durationInFrames: 15,
            });

            const startRad = (angle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            const cx = 200,
              cy = 200,
              r = 180;

            const x1 = cx + r * Math.cos(startRad);
            const y1 = cy + r * Math.sin(startRad);
            const x2 = cx + r * Math.cos(endRad);
            const y2 = cy + r * Math.sin(endRad);
            const largeArc = 360 / denominator > 180 ? 1 : 0;

            const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

            return (
              <path
                key={i}
                d={d}
                fill={
                  filled
                    ? `rgba(59, 130, 246, ${reveal})` // Modern blue (#3b82f6)
                    : `rgba(51, 65, 85, ${reveal * 0.6})`  // Slate
                }
                stroke="#1e293b" // Slate border
                strokeWidth="4"
                style={{
                  transformOrigin: "200px 200px",
                  transform: `scale(${spring({ frame: frame - 10, fps, config: { damping: 12 }})})`
                }}
              />
            );
          })}
        </svg>
      </div>

      <p
        style={{
          color: "#f8fafc",
          fontSize: 60,
          fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
          margin: 0,
          opacity: spring({ frame: frame - 30, fps })
        }}
      >
        {numerator} / {denominator}
      </p>

      {scene.narration && (
        <h2 style={{ color: "white", fontSize: 40, marginTop: 20, opacity: spring({ frame: frame - 10, fps }) }}>
          {scene.narration}
        </h2>
      )}
    </div>
  );
};
