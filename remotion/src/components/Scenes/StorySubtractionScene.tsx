import React from "react";
import {
  useVideoConfig,
  useCurrentFrame,
  spring,
  interpolate,
} from "remotion";
import type { DirectorScene } from "../../types";
import { CartoonBird, BIRD_COLORS } from "../../assets/items/CartoonBird";
import { TreeBranch, SVG_BRANCH_Y, SVG_HEIGHT, SVG_BRANCH_LEFT, SVG_BRANCH_RIGHT } from "../../assets/items/TreeBranch";
import { Confetti } from "../primitives/Confetti";

/**
 * StorySubtractionScene
 *
 * A Cocomelon-style 4-act animated story for subtraction word problems
 * involving birds on a tree branch.
 *
 * Act 1 — Opening (0–25%):   Tree slides in, birds pop onto branch, numbers appear
 * Act 2 — Action  (25–55%):  B birds flap fast, lift off, fly away with sparkle trails
 * Act 3 — Answer  (55–85%):  Remaining birds counted, equation pops in
 * Act 4 — End     (85–100%): Small pause before CelebrationBurst takes over
 */

// Tree container positioning on the 1080×1920 canvas
const TREE_CONTAINER_HEIGHT = SVG_HEIGHT; // matches SVG viewBox height
const TREE_BOTTOM_OFFSET = 120; // CSS bottom value for the tree container

/**
 * Evenly space N birds along the STRAIGHT branch.
 *
 * Bird positions are computed from the TreeBranch exported constants:
 *   - Branch spans SVG x: SVG_BRANCH_LEFT → SVG_BRANCH_RIGHT
 *   - Branch sits at SVG y: SVG_BRANCH_Y
 *   - Container is placed at CSS bottom: TREE_BOTTOM_OFFSET
 *
 * Canvas Y = (1920 - TREE_BOTTOM_OFFSET - TREE_CONTAINER_HEIGHT) + SVG_BRANCH_Y
 */
function getBirdPositions(
  total: number,
  canvasWidth: number
): { x: number; y: number }[] {
  // Map SVG coordinates to canvas coordinates
  const treeContainerTop = 1920 - TREE_BOTTOM_OFFSET - TREE_CONTAINER_HEIGHT;
  const branchYOnCanvas = treeContainerTop + SVG_BRANCH_Y;

  // Scale SVG x range to canvas width (both are 1080, so 1:1)
  const branchLeft = SVG_BRANCH_LEFT;
  const branchRight = SVG_BRANCH_RIGHT;

  const gap = total <= 1 ? 0 : (branchRight - branchLeft) / (total - 1);

  return Array.from({ length: total }, (_, i) => {
    const x = total === 1
      ? (branchLeft + branchRight) / 2
      : branchLeft + i * gap;
    return { x, y: branchYOnCanvas };
  });
}

/**
 * Sparkle trail — small star particles that follow a departing bird.
 */
const SparkleTrail: React.FC<{
  startFrame: number;
  originX: number;
  originY: number;
}> = ({ startFrame, originX, originY }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = frame - startFrame;

  if (elapsed < 0) return null;

  const sparkles = [
    { dx: -15, dy: -10, delay: 0, color: "#FFD93D" },
    { dx: 10, dy: -20, delay: 3, color: "#FF6B6B" },
    { dx: -5, dy: 15, delay: 6, color: "#4ECDC4" },
    { dx: 20, dy: 5, delay: 2, color: "#F06292" },
  ];

  return (
    <>
      {sparkles.map((s, i) => {
        const localF = elapsed - s.delay;
        if (localF < 0) return null;
        const prog = spring({
          frame: localF,
          fps,
          config: { damping: 20 },
        });
        const opacity = interpolate(prog, [0, 0.5, 1], [0, 1, 0], {
          extrapolateRight: "clamp",
        });
        const scale = interpolate(prog, [0, 0.5, 1], [0.3, 1.2, 0.2], {
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: originX + s.dx * prog * 3,
              top: originY + s.dy * prog * 3,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: s.color,
              opacity,
              transform: `scale(${scale})`,
              boxShadow: `0 0 8px ${s.color}`,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

export const StorySubtractionScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Parse equation
  const eqStr = groupedScenes[0]?.equation || "7 - 4";
  const numMatches = eqStr.match(/\d+/g);
  const totalBirds =
    numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 7;
  const subtractBirds =
    numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 4;
  const remainBirds = totalBirds - subtractBirds;

  // Total scene duration
  const totalDur = timings[0]?.dur || 16 * fps;

  // 4-act timing boundaries
  const act1End = Math.round(totalDur * 0.25); // Opening
  const act2End = Math.round(totalDur * 0.55); // Action
  const act3End = Math.round(totalDur * 0.85); // Answer

  // Bird positions along the branch
  const positions = getBirdPositions(totalBirds, 1080);

  // ─── Act 1: Tree slides in + birds pop onto branch ───
  const treeSlide = spring({
    frame,
    fps,
    from: 300,
    to: 0,
    config: { damping: 14 },
  });

  // Each bird pops in with a stagger
  const getBirdPopIn = (birdIdx: number): number => {
    const staggerGap = Math.min(6, act1End / (totalBirds + 2));
    const startF = 8 + birdIdx * staggerGap;
    return spring({
      frame: Math.max(0, frame - startF),
      fps,
      config: { stiffness: 200, damping: 12 },
    });
  };

  // Number above each bird during opening
  const getNumberPop = (birdIdx: number): number => {
    const staggerGap = Math.min(5, act1End / (totalBirds + 3));
    const startF = 14 + birdIdx * staggerGap;
    return spring({
      frame: Math.max(0, frame - startF),
      fps,
      config: { damping: 14 },
    });
  };

  // ─── Act 2: Departing birds fly away ───
  // The LAST `subtractBirds` in the array are the ones that leave
  const departStartIdx = totalBirds - subtractBirds;

  const getBirdFlyProgress = (birdIdx: number): number => {
    if (birdIdx < departStartIdx) return 0; // Stays
    const departIdx = birdIdx - departStartIdx;
    const staggerGap = Math.min(8, (act2End - act1End) / (subtractBirds + 2));
    const startF = act1End + 5 + departIdx * staggerGap;
    return spring({
      frame: Math.max(0, frame - startF),
      fps,
      config: { damping: 18, stiffness: 60 },
    });
  };

  // ─── Act 3: Count remaining birds ───
  const getCountPop = (remainIdx: number): number => {
    const staggerGap = Math.min(10, (act3End - act2End) / (remainBirds + 2));
    const startF = act2End + 10 + remainIdx * staggerGap;
    return spring({
      frame: Math.max(0, frame - startF),
      fps,
      config: { stiffness: 180, damping: 12 },
    });
  };

  // Equation pop-in
  const eqStart = act3End - Math.round((act3End - act2End) * 0.25);
  const eqProg = spring({
    frame: Math.max(0, frame - eqStart),
    fps,
    config: { stiffness: 200, damping: 14 },
  });

  // Show confetti when equation appears
  const showConfetti = frame > eqStart + 5;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Tree — slides in from right */}
      <div
        style={{
          position: "absolute",
          bottom: TREE_BOTTOM_OFFSET,
          right: -50,
          transform: `translateX(${treeSlide}px)`,
          width: 1080,
          height: TREE_CONTAINER_HEIGHT,
        }}
      >
        <TreeBranch width={1080} height={TREE_CONTAINER_HEIGHT} />
      </div>

      {/* Birds on the branch */}
      {positions.map((pos, i) => {
        const popIn = getBirdPopIn(i);
        const flyProg = getBirdFlyProgress(i);
        const isDeparting = i >= departStartIdx;
        const isFlying = isDeparting && flyProg > 0.05;

        // Fly-away arc: go up then right off screen
        const flyX = interpolate(flyProg, [0, 1], [0, 600 + i * 50], {
          extrapolateRight: "clamp",
        });
        const flyY = interpolate(
          flyProg,
          [0, 0.3, 0.6, 1],
          [0, -200, -280, -400],
          { extrapolateRight: "clamp" }
        );
        const flyRotate = interpolate(flyProg, [0, 1], [0, -30], {
          extrapolateRight: "clamp",
        });
        const flyOpacity = interpolate(flyProg, [0, 0.8, 1], [1, 1, 0], {
          extrapolateRight: "clamp",
        });

        // Remaining bird wobble after peers depart
        const wobble =
          !isDeparting && frame > act1End + 15
            ? Math.sin(frame * 0.15 + i * 2) * 3
            : 0;

        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: pos.x - 55 + treeSlide,
                top: pos.y - 100,
                transform: `
                  scale(${popIn})
                  translate(${flyX}px, ${flyY + wobble}px)
                  rotate(${flyRotate}deg)
                `,
                opacity: isDeparting ? flyOpacity : popIn,
                transformOrigin: "center bottom",
                zIndex: 10 + i,
              }}
            >
              <CartoonBird
                colorIndex={i}
                size={110}
                isFlying={isFlying}
              />
            </div>

            {/* Opening number above bird (Act 1) */}
            {frame < act2End && (
              <div
                style={{
                  position: "absolute",
                  left: pos.x - 8 + treeSlide,
                  top: pos.y - 150,
                  opacity: getNumberPop(i) * (isDeparting && flyProg > 0.3 ? 0 : 1),
                  transform: `scale(${getNumberPop(i)})`,
                  zIndex: 20,
                }}
              >
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    fontFamily: "'Nunito', 'Comic Sans MS', cursive",
                    color: BIRD_COLORS[i % BIRD_COLORS.length],
                    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                >
                  {i + 1}
                </span>
              </div>
            )}

            {/* Sparkle trail for departing birds (Act 2) */}
            {isDeparting && flyProg > 0.1 && flyProg < 0.95 && (
              <SparkleTrail
                startFrame={act1End + 5 + (i - departStartIdx) * 6}
                originX={pos.x + flyX + treeSlide}
                originY={pos.y + flyY - 30}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Act 3: Counting numbers for remaining birds */}
      {frame >= act2End &&
        positions.slice(0, remainBirds).map((pos, i) => {
          const countProg = getCountPop(i);
          return (
            <div
              key={`count-${i}`}
              style={{
                position: "absolute",
                left: pos.x - 20 + treeSlide,
                top: pos.y - 135,
                opacity: countProg,
                transform: `scale(${interpolate(
                  countProg,
                  [0, 1],
                  [0.3, 1.1],
                  { extrapolateRight: "clamp" }
                )})`,
                zIndex: 30,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #FFD93D, #FF8E53)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 0 rgba(0,0,0,0.15)",
                }}
              >
                <span
                  style={{
                    fontSize: 30,
                    fontWeight: 900,
                    fontFamily: "'Nunito', 'Comic Sans MS', cursive",
                    color: "#FFFFFF",
                    textShadow: "0 2px 0 rgba(0,0,0,0.2)",
                  }}
                >
                  {i + 1}
                </span>
              </div>
            </div>
          );
        })}

      {/* Act 3: Equation pill — centered in the sky area above the tree */}
      {showConfetti && <Confetti startFrame={eqStart + 5} />}
      <div
        style={{
          position: "absolute",
          top: "38%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${eqProg})`,
          opacity: eqProg,
          zIndex: 50,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
            borderRadius: 36,
            padding: "28px 80px",
            boxShadow:
              "0 10px 0 rgba(0,0,0,0.18), 0 20px 40px rgba(255,107,107,0.4)",
          }}
        >
          <p
            style={{
              color: "#FFFFFF",
              fontSize: 72,
              fontWeight: 900,
              fontFamily: "'Nunito', 'Comic Sans MS', cursive",
              margin: 0,
              letterSpacing: 4,
              textShadow: "0 4px 0 rgba(0,0,0,0.2)",
              whiteSpace: "nowrap",
            }}
          >
            {totalBirds} − {subtractBirds} = {remainBirds}
          </p>
        </div>
      </div>
    </div>
  );
};
