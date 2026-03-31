import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

const COLORS = [
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF",
  "#FF6FC8", "#FFA07A", "#45B7D1", "#BB8FCE",
];

const PARTICLE_COUNT = 48;

// Pre-computed random-looking angles & distances (deterministic, no Math.random)
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * 360 + (i % 3) * 17;
  const distance = 280 + (i % 5) * 80;
  const size = 10 + (i % 4) * 6;
  const color = COLORS[i % COLORS.length];
  const delayFrames = Math.floor((i % 6) * 2);
  return { angle, distance, size, color, delayFrames };
});

export const Confetti: React.FC<{ startFrame?: number }> = ({
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {PARTICLES.map((p, i) => {
        const f = Math.max(0, localFrame - p.delayFrames);
        const progress = interpolate(f, [0, 40], [0, 1], {
          extrapolateRight: "clamp",
        });

        const rad = (p.angle * Math.PI) / 180;
        const x = 540 + Math.cos(rad) * p.distance * progress; // center x = 540 (1080/2)
        const y = 960 + Math.sin(rad) * p.distance * progress; // center y = 960 (1920/2)

        const opacity = interpolate(progress, [0, 0.6, 1], [1, 1, 0], {
          extrapolateRight: "clamp",
        });
        const scale = interpolate(progress, [0, 0.2, 1], [0, 1.3, 0.6], {
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: i % 2 === 0 ? "50%" : "3px",
              backgroundColor: p.color,
              opacity,
              transform: `scale(${scale}) rotate(${progress * 360 + i * 30}deg)`,
              transformOrigin: "center",
            }}
          />
        );
      })}
    </div>
  );
};
