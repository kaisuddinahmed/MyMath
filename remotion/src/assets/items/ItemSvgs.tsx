import React from "react";

/** Apple SVG — red with a green leaf */
export const AppleSvg: React.FC<{ size?: number }> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="38" rx="22" ry="24" fill="#EF4444" />
    <ellipse cx="32" cy="38" rx="22" ry="24" fill="url(#appleShine)" />
    <path d="M32 14 C28 6, 22 8, 24 14" stroke="#16A34A" strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="26" cy="12" rx="6" ry="4" fill="#22C55E" transform="rotate(-20 26 12)" />
    <ellipse cx="24" cy="30" rx="4" ry="6" fill="rgba(255,255,255,0.25)" />
    <defs>
      <radialGradient id="appleShine" cx="0.35" cy="0.3" r="0.65">
        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
  </svg>
);

/** Colored block — rounded square with shadow */
export const BlockSvg: React.FC<{ size?: number; color?: string }> = ({
  size = 56,
  color = "#3B82F6",
}) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <rect x="4" y="6" width="48" height="48" rx="8" fill="#1E3A5F" opacity="0.2" />
    <rect x="2" y="2" width="48" height="48" rx="8" fill={color} />
    <rect x="2" y="2" width="48" height="48" rx="8" fill="url(#blockShine)" />
    <defs>
      <linearGradient id="blockShine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
        <stop offset="100%" stopColor="transparent" />
      </linearGradient>
    </defs>
  </svg>
);

/** Star SVG — gold 5-pointed star */
export const StarSvg: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <path
      d="M28 4 L33.5 20.5 L51 20.5 L37 31 L42 48 L28 38 L14 48 L19 31 L5 20.5 L22.5 20.5 Z"
      fill="#FBBF24"
      stroke="#F59E0B"
      strokeWidth="1.5"
    />
    <path
      d="M28 4 L33.5 20.5 L51 20.5 L37 31 L42 48 L28 38 L14 48 L19 31 L5 20.5 L22.5 20.5 Z"
      fill="url(#starShine)"
    />
    <defs>
      <linearGradient id="starShine" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
        <stop offset="100%" stopColor="transparent" />
      </linearGradient>
    </defs>
  </svg>
);

/** Simple circular counter */
export const CounterSvg: React.FC<{ size?: number; color?: string }> = ({
  size = 50,
  color = "#8B5CF6",
}) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
    <circle cx="25" cy="27" r="22" fill="#1E1B4B" opacity="0.15" />
    <circle cx="25" cy="25" r="22" fill={color} />
    <circle cx="18" cy="18" r="6" fill="rgba(255,255,255,0.2)" />
  </svg>
);
