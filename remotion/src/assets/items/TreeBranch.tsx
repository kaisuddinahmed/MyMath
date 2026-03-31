import React from "react";

/**
 * TreeBranch — a cute cartoon tree with a STRAIGHT horizontal branch.
 *
 * The branch is perfectly horizontal at a known Y coordinate so bird
 * placement is trivially accurate — no bezier curve matching needed.
 *
 * Layout (in SVG coordinates, viewBox 0 0 1080 800):
 *   - Branch: horizontal line at y=380, from x=60 to x=820
 *   - Trunk: vertical bar from x=800 downward
 *   - Canopy: cloud circles above the trunk
 *
 * The BRANCH_Y constant is exported so StorySubtractionScene can
 * position birds exactly on it.
 */

/** Y coordinate of the branch top surface inside the SVG viewBox */
export const SVG_BRANCH_Y = 380;
/** Height of the SVG viewBox */
export const SVG_HEIGHT = 800;
/** Left-most X where birds can sit (inset from branch start) */
export const SVG_BRANCH_LEFT = 130;
/** Right-most X where birds can sit (before trunk) */
export const SVG_BRANCH_RIGHT = 790;
/** CSS bottom offset for the tree container */
export const TREE_BOTTOM_OFFSET = 120;

export const TreeBranch: React.FC<{
  width?: number;
  height?: number;
}> = ({ width = 1080, height = SVG_HEIGHT }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 1080 ${SVG_HEIGHT}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", bottom: 0, left: 0 }}
    >
      {/* ══════════ TRUNK ══════════ */}
      <rect x="810" y="280" width="75" height="520" rx="18" fill="#8B5E3C" />
      {/* Bark details */}
      <rect x="828" y="340" width="10" height="50" rx="5" fill="#6F4A2E" opacity="0.4" />
      <rect x="845" y="450" width="8" height="35" rx="4" fill="#6F4A2E" opacity="0.3" />
      <rect x="830" y="560" width="12" height="45" rx="6" fill="#6F4A2E" opacity="0.25" />

      {/* ══════════ BRANCH — perfectly horizontal ══════════ */}
      {/* Main branch stroke */}
      <line
        x1="60"
        y1={SVG_BRANCH_Y}
        x2="845"
        y2={SVG_BRANCH_Y}
        stroke="#8B5E3C"
        strokeWidth="32"
        strokeLinecap="round"
      />
      {/* Branch highlight (lighter line on top) */}
      <line
        x1="80"
        y1={SVG_BRANCH_Y - 6}
        x2="840"
        y2={SVG_BRANCH_Y - 6}
        stroke="#A0724B"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Small twig stubs */}
      <path d="M300 380 C 290 355, 310 345, 315 365" stroke="#8B5E3C" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M600 380 C 590 358, 610 348, 615 368" stroke="#8B5E3C" strokeWidth="6" strokeLinecap="round" fill="none" />

      {/* ══════════ CANOPY ══════════ */}
      <circle cx="848" cy="190" r="110" fill="#4CAF50" />
      <circle cx="765" cy="215" r="80"  fill="#66BB6A" />
      <circle cx="920" cy="225" r="75"  fill="#43A047" />
      <circle cx="848" cy="120" r="80"  fill="#66BB6A" />
      <circle cx="780" cy="145" r="60"  fill="#4CAF50" />
      <circle cx="930" cy="160" r="55"  fill="#43A047" />
      {/* Highlight */}
      <circle cx="830" cy="165" r="35" fill="rgba(255,255,255,0.12)" />
      <circle cx="880" cy="200" r="22" fill="rgba(255,255,255,0.08)" />

      {/* Leaves on twigs */}
      <ellipse cx="295" cy="345" rx="14" ry="9" fill="#66BB6A" transform="rotate(-25 295 345)" />
      <ellipse cx="605" cy="348" rx="12" ry="8" fill="#4CAF50" transform="rotate(20 605 348)" />
    </svg>
  );
};
