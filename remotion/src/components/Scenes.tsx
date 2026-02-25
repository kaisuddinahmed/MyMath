import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { DirectorScene, AnimationStyle } from "../types";
import {
  AppleSvg,
  BlockSvg,
  StarSvg,
  CounterSvg,
} from "../assets/items/ItemSvgs";

/**
 * Renders a caption bar at the bottom of the screen.
 */
export const NarrationBar: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = spring({ frame, fps, from: 0, to: 1, durationInFrames: 12 });

  if (!text) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 24,
        right: 24,
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        borderRadius: 16,
        padding: "14px 24px",
        opacity: fadeIn,
        transform: `translateY(${interpolate(fadeIn, [0, 1], [20, 0])}px)`,
      }}
    >
      <p
        style={{
          color: "#F8FAFC",
          fontSize: 22,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontWeight: 600,
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        {text}
      </p>
    </div>
  );
};

export const TitleCard: React.FC<{
  title: string;
  problem: string;
  grade: number;
}> = ({ problem }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, from: 0.8, to: 1, durationInFrames: 30 });
  const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 20 });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        opacity,
        transform: `scale(${scale})`,
        padding: "0 60px",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
          borderRadius: 24,
          padding: "50px 70px",
          border: "1px solid rgba(255,255,255,0.15)",
          textAlign: "center",
          maxWidth: 1000,
        }}
      >
        <p
          style={{
            color: "#F8FAFC",
            fontSize: 40,
            fontWeight: 700,
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1.5,
          }}
        >
          {problem}
        </p>
      </div>
    </div>
  );
};

/** Helper: choose SVG component by item_type */
function ItemComponent({ itemType, size }: { itemType: string; size: number }) {
  switch (itemType) {
    case "APPLE_SVG":
      return <AppleSvg size={size} />;
    case "BLOCK_SVG":
      return <BlockSvg size={size} />;
    case "STAR_SVG":
      return <StarSvg size={size} />;
    default:
      return <CounterSvg size={size} />;
  }
}

/** Animate a single item appearing */
function AnimatedItem({
  index,
  total,
  itemType,
  animationStyle,
  size = 56,
}: {
  index: number;
  total: number;
  itemType: string;
  animationStyle: AnimationStyle;
  size?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Ensure all items finish appearing within ~2 seconds (40-50 frames)
  const stagger = Math.max(1, 40 / total);
  const delay = Math.round(index * stagger);

  let opacity = 1;
  let transform = "";

  if (animationStyle === "BOUNCE_IN") {
    const s = spring({
      frame: Math.max(0, frame - delay),
      fps,
      from: 0,
      to: 1,
      config: { damping: 8, mass: 0.6 },
    });
    opacity = s;
    transform = `scale(${interpolate(s, [0, 1], [0.2, 1])})`;
  } else if (animationStyle === "FADE_IN") {
    opacity = spring({
      frame: Math.max(0, frame - delay),
      fps,
      from: 0,
      to: 1,
      durationInFrames: 15,
    });
  } else if (animationStyle === "SLIDE_LEFT") {
    const s = spring({
      frame: Math.max(0, frame - delay),
      fps,
      from: 0,
      to: 1,
      durationInFrames: 18,
    });
    opacity = s;
    transform = `translateX(${interpolate(s, [0, 1], [80, 0])}px)`;
  } else if (animationStyle === "POP") {
    const s = spring({
      frame: Math.max(0, frame - delay),
      fps,
      from: 0,
      to: 1,
      config: { damping: 5, mass: 0.4 },
    });
    opacity = s;
    transform = `scale(${interpolate(s, [0, 0.5, 1], [0, 1.3, 1])})`;
  }

  return (
    <div style={{ opacity, transform, display: "inline-flex", margin: 6 }}>
      <ItemComponent itemType={itemType} size={size} />
    </div>
  );
}

/**
 * CounterScene — Adds or removes items with animation.
 */
export const CounterScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const realCount = scene.count || 5;
  const visualCount = Math.min(realCount, 30);
  const itemType = scene.item_type || "COUNTER";
  const animation = scene.animation_style || "BOUNCE_IN";

  const isRemove = scene.action === "REMOVE_ITEMS";
  const isHighlight = scene.action === "HIGHLIGHT";

  let labelText = `Bringing in ${realCount}!`;
  if (isRemove) labelText = `Taking away...`;
  if (isHighlight) labelText = `Looking at ${realCount}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 20,
      }}
    >
      {/* Label */}
      <p
        style={{
          color: "#94A3B8",
          fontSize: 20,
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          margin: 0,
        }}
      >
        {labelText}
      </p>

      {/* Items grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 600,
          gap: 4,
        }}
      >
        {Array.from({ length: visualCount }).map((_, i) => (
          <AnimatedItem
            key={i}
            index={i}
            total={visualCount}
            itemType={itemType}
            animationStyle={animation}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * GroupScene — Shows items arranged in groups (for multiplication/division).
 */
export const GroupScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const groups = Math.min(scene.groups || 3, 10);
  const perGroup = Math.min(scene.per_group || scene.count || 4, 12);
  const itemType = scene.item_type || "BLOCK_SVG";
  const animation = scene.animation_style || "BOUNCE_IN";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 24,
      }}
    >
      <p
        style={{
          color: "#94A3B8",
          fontSize: 20,
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          margin: 0,
        }}
      >
        {groups} groups of {perGroup}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {Array.from({ length: groups }).map((_, gi) => (
          <div
            key={gi}
            style={{
              border: "2px dashed rgba(148,163,184,0.4)",
              borderRadius: 16,
              padding: 12,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 2,
              maxWidth: 180,
            }}
          >
            {Array.from({ length: perGroup }).map((_, ii) => (
              <AnimatedItem
                key={ii}
                index={gi * perGroup + ii}
                total={groups * perGroup}
                itemType={itemType}
                animationStyle={animation}
                size={40}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * FractionScene — Pie or bar chart showing fractions.
 */
export const FractionScene: React.FC<{ scene: DirectorScene }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const numerator = scene.numerator || 1;
  const denominator = Math.max(scene.denominator || 4, 1);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 20,
      }}
    >
      <p
        style={{
          color: "#94A3B8",
          fontSize: 22,
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          margin: 0,
        }}
      >
        {numerator}/{denominator}
      </p>

      {/* Pie chart */}
      <svg width={240} height={240} viewBox="0 0 240 240">
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
          const cx = 120,
            cy = 120,
            r = 100;

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
                  ? `rgba(99,102,241,${reveal})`
                  : `rgba(51,65,85,${reveal * 0.6})`
              }
              stroke="rgba(148,163,184,0.5)"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
};

/**
 * EquationScene — Shows a math equation prominently.
 */
export const EquationScene: React.FC<{ scene: DirectorScene }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({
    frame,
    fps,
    from: 0.6,
    to: 1,
    durationInFrames: 20,
    config: { damping: 10 },
  });
  const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 12 });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          background: "rgba(99,102,241,0.12)",
          borderRadius: 20,
          padding: "40px 60px",
          border: "2px solid rgba(99,102,241,0.3)",
        }}
      >
        <p
          style={{
            color: "#E0E7FF",
            fontSize: 52,
            fontWeight: 800,
            fontFamily: "'Inter', sans-serif",
            margin: 0,
            letterSpacing: 2,
          }}
        >
          {scene.equation || scene.narration}
        </p>
      </div>
    </div>
  );
};
