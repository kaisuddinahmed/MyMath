import React from "react";
import { useCurrentFrame } from "remotion";

/**
 * 7 distinct bright bird colours — each bird gets a unique colour.
 */
export const BIRD_COLORS = [
  "#FF6B6B", // coral red
  "#4ECDC4", // teal
  "#FFD93D", // sunny yellow
  "#6BCB77", // green
  "#45B7D1", // sky blue
  "#F06292", // pink
  "#FF8E53", // orange
];

interface CartoonBirdProps {
  /** Index into BIRD_COLORS (wraps around) */
  colorIndex?: number;
  /** Pixel size of the SVG */
  size?: number;
  /** Whether the bird is flying (faster wing flap + lifted posture) */
  isFlying?: boolean;
  /** Override: hide wing flap for a static pose */
  staticPose?: boolean;
}

/**
 * CartoonBird — a cute, round bird with big eyes and an animated flapping wing.
 *
 * The wing rotates via `Math.sin(frame * speed)` so it oscillates smoothly.
 * When `isFlying`, the flap speed doubles and the body tilts upward slightly.
 */
export const CartoonBird: React.FC<CartoonBirdProps> = ({
  colorIndex = 0,
  size = 80,
  isFlying = false,
  staticPose = false,
}) => {
  const frame = useCurrentFrame();
  const bodyColor = BIRD_COLORS[colorIndex % BIRD_COLORS.length];

  // Wing flap — sine wave oscillation
  const flapSpeed = isFlying ? 0.6 : 0.2;
  const flapAmplitude = isFlying ? 35 : 15;
  const wingAngle = staticPose ? 0 : Math.sin(frame * flapSpeed) * flapAmplitude;

  // Slight body tilt when flying
  const bodyTilt = isFlying ? -15 : 0;

  // Subtle idle bob when perched
  const idleBob = staticPose ? 0 : Math.sin(frame * 0.08 + colorIndex * 1.5) * 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        transform: `rotate(${bodyTilt}deg) translateY(${idleBob}px)`,
        transformOrigin: "center center",
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow under bird */}
        <ellipse cx="50" cy="90" rx="22" ry="5" fill="rgba(0,0,0,0.1)" />

        {/* Tail feathers */}
        <path
          d="M20 55 C 10 45, 5 55, 12 65"
          fill={bodyColor}
          opacity={0.7}
        />
        <path
          d="M18 50 C 5 42, 2 52, 10 60"
          fill={bodyColor}
          opacity={0.5}
        />

        {/* Body — big round */}
        <ellipse cx="50" cy="58" rx="28" ry="26" fill={bodyColor} />

        {/* Belly highlight */}
        <ellipse cx="52" cy="65" rx="18" ry="15" fill="rgba(255,255,255,0.25)" />

        {/* Wing — animated rotation around shoulder pivot */}
        <g
          transform={`rotate(${wingAngle}, 38, 52)`}
          style={{ transformOrigin: "38px 52px" }}
        >
          <path
            d="M38 52 C 25 68, 35 78, 55 68 C 45 62, 38 56, 38 52 Z"
            fill={bodyColor}
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="1"
          />
          {/* Wing inner detail */}
          <path
            d="M40 56 C 32 66, 38 72, 48 65"
            fill="rgba(255,255,255,0.2)"
          />
        </g>

        {/* Head — overlapping circle */}
        <circle cx="62" cy="38" r="18" fill={bodyColor} />

        {/* White eye background */}
        <circle cx="68" cy="34" r="8" fill="white" />
        {/* Pupil */}
        <circle cx="70" cy="34" r="4" fill="#1E293B" />
        {/* Eye shine */}
        <circle cx="72" cy="32" r="1.5" fill="white" />

        {/* Beak */}
        <path d="M80 38 L 92 42 L 80 46 Z" fill="#FBBF24" />
        {/* Beak highlight */}
        <path d="M80 38 L 86 40 L 80 42 Z" fill="#FCD34D" />

        {/* Blush cheek */}
        <circle cx="72" cy="44" r="4" fill="rgba(255,100,100,0.3)" />

        {/* Feet (only visible when perched) */}
        {!isFlying && (
          <>
            <path
              d="M42 82 L 38 92 M 42 82 L 42 92 M 42 82 L 46 92"
              stroke="#FBBF24"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M58 82 L 54 92 M 58 82 L 58 92 M 58 82 L 62 92"
              stroke="#FBBF24"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </div>
  );
};
