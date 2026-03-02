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
  const itemType = scene.item_type || "COUNTER";
  const animation = scene.animation_style || "BOUNCE_IN";

  const isRemove = scene.action === "REMOVE_ITEMS";
  const isHighlight = scene.action === "HIGHLIGHT";

  let leftCount = 0;
  let rightCount = 0;
  let isAddSplit = false;
  let isSubSplit = false;
  let isCompSplit = false;
  let compOp = "";

  if (scene.equation) {
    const addMatch = scene.equation.match(/(\d+)\s*\+\s*(\d+)/);
    const subMatch = scene.equation.match(/(\d+)\s*-\s*(\d+)/);
    const compMatch = scene.equation.match(/(\d+)\s*([><=]+)\s*(\d+)/);
    
    if (addMatch && !isRemove && !isHighlight) {
      leftCount = parseInt(addMatch[1], 10);
      rightCount = parseInt(addMatch[2], 10);
      if (leftCount + rightCount <= 40) {
        isAddSplit = true;
      }
    } else if (subMatch && !isHighlight) {
      leftCount = parseInt(subMatch[1], 10); // total starting items
      rightCount = parseInt(subMatch[2], 10); // items to take away
      if (leftCount <= 40) {
        isSubSplit = true;
      }
    } else if (compMatch) {
      leftCount = parseInt(compMatch[1], 10);
      rightCount = parseInt(compMatch[3], 10);
      compOp = compMatch[2];
      if (leftCount + rightCount <= 40) {
        isCompSplit = true;
      }
    }
  }

  const realCount = scene.count || (isAddSplit || isCompSplit ? leftCount + rightCount : 5);
  const visualCount = Math.min(realCount, 40);

  let labelText = isAddSplit ? `Adding ${leftCount} and ${rightCount}` : `Bringing in ${realCount}!`;
  if (isRemove || isSubSplit) labelText = isSubSplit ? `Taking away ${rightCount} from ${leftCount}` : `Taking away...`;
  if (isCompSplit) labelText = `Comparing ${leftCount} and ${rightCount}`;

  // For highlight action in comparison, dull out the smaller group
  const leftOpacity = isHighlight && isCompSplit && leftCount <= rightCount ? 0.3 : 1;
  const rightOpacity = isHighlight && isCompSplit && rightCount <= leftCount ? 0.3 : 1;

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
          fontSize: 24,
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          margin: 0,
        }}
      >
        {labelText}
      </p>

      {isCompSplit ? (
        <div style={{ display: "flex", alignItems: "center", gap: 50, marginTop: 40 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 400, gap: 10, opacity: leftOpacity, transition: "opacity 1s" }}>
            {Array.from({ length: leftCount }).map((_, i) => (
              <AnimatedItem key={`left-${i}`} index={i} total={leftCount} itemType={itemType} animationStyle={animation} />
            ))}
          </div>
          {isHighlight ? (
             <div style={{ fontSize: 90, color: "#fcd34d", fontWeight: "bold" }}>{compOp}</div>
          ) : (
             <div style={{ fontSize: 90, color: "transparent", fontWeight: "bold" }}> ? </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 400, gap: 10, opacity: rightOpacity, transition: "opacity 1s" }}>
            {Array.from({ length: rightCount }).map((_, i) => (
              <AnimatedItem key={`right-${i}`} index={i} total={rightCount} itemType={itemType} animationStyle={animation} />
            ))}
          </div>
        </div>
      ) : isAddSplit ? (
        <div style={{ display: "flex", alignItems: "center", gap: 50, marginTop: 40 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 400, gap: 10 }}>
            {Array.from({ length: leftCount }).map((_, i) => (
              <AnimatedItem key={`left-${i}`} index={i} total={leftCount} itemType={itemType} animationStyle={animation} />
            ))}
          </div>
          <div style={{ fontSize: 80, color: "#10b981", fontWeight: "bold" }}>+</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 400, gap: 10 }}>
            {Array.from({ length: rightCount }).map((_, i) => (
              <AnimatedItem key={`right-${i}`} index={i} total={rightCount} itemType={itemType} animationStyle={animation} />
            ))}
          </div>
        </div>
      ) : isSubSplit ? (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 800, gap: 10, marginTop: 40 }}>
          {Array.from({ length: leftCount }).map((_, i) => {
            const isRemovedItem = i >= leftCount - rightCount;
            return (
              <div key={i} style={{ 
                opacity: isRemovedItem ? 0.2 : 1, 
                transform: isRemovedItem ? `translateY(40px) scale(0.8)` : `none`,
                transition: "all 1s cubic-bezier(0.34, 1.56, 0.64, 1)"
              }}>
                <AnimatedItem index={i} total={leftCount} itemType={itemType} animationStyle={isRemovedItem ? "FADE_IN" : animation} />
                {isRemovedItem && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 50, fontWeight: "bold" }}>
                    ×
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 600,
            gap: 10,
            marginTop: 40
          }}
        >
          {Array.from({ length: visualCount }).map((_, i) => (
            <AnimatedItem key={i} index={i} total={visualCount} itemType={itemType} animationStyle={animation} />
          ))}
        </div>
      )}
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
            whiteSpace: "pre-wrap",
          }}
        >
          {scene.equation || scene.narration}
        </p>
      </div>
    </div>
  );
};
