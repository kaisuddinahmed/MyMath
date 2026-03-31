import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { ChoreographyActor, ChoreographyEvent } from "../../types";
import { CartoonBird } from "../../assets/items/CartoonBird";
import { ItemComponent } from "../../assets/items/ItemSvgs"; // generic fallback

interface EngineActorProps {
  actor: ChoreographyActor;
  events: ChoreographyEvent[];
  // Global tree shift if environment is TREE_BRANCH (for prototype simplicity)
  treeSlideData?: { value: number }; 
}

/**
 * Parses ChoreographyEvents and drives individual actor animations.
 * Translates JSON descriptions into Remotion math formulas.
 */
export const EngineActor: React.FC<EngineActorProps> = ({ actor, events, treeSlideData }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find key events for this actor
  const popInEvent = events.find(e => e.action === "POP_IN");
  const flyEvent = events.find(e => e.action === "FLY_AWAY_ARC");
  const countEvent = events.find(e => e.action === "SHOW_COUNT_BADGE");
  const wobbleEvent = events.find(e => e.action === "WOBBLE");

  // --- 1. POP IN ---
  const popInStart = popInEvent ? popInEvent.startFrame : 0;
  const popInProg = spring({
    frame: Math.max(0, frame - popInStart),
    fps,
    config: { stiffness: 200, damping: 12 },
  });
  
  // Base scale starts at popInProg (0 -> 1) scaled by optional actor startScale
  const baseScale = popInProg * (actor.startScale || 1);

  // --- 2. FLY AWAY ---
  const flyStart = flyEvent ? flyEvent.startFrame : Infinity;
  const flyProg = spring({
    frame: Math.max(0, frame - flyStart),
    fps,
    config: { damping: 18, stiffness: 60 },
  });
  
  const isFlying = flyProg > 0.05;
  const isDeparting = frame >= flyStart;

  // Calculate arc path if flying
  const endX = flyEvent?.endX || 600;
  const flyX = interpolate(flyProg, [0, 1], [0, endX], { extrapolateRight: "clamp" });
  const flyY = interpolate(flyProg, [0, 0.3, 0.6, 1], [0, -200, -280, -400], { extrapolateRight: "clamp" });
  const flyRotate = interpolate(flyProg, [0, 1], [0, -30], { extrapolateRight: "clamp" });
  const flyOpacity = interpolate(flyProg, [0, 0.8, 1], [1, 1, 0], { extrapolateRight: "clamp" });

  // --- 3. WOBBLE ---
  const wobbleStart = wobbleEvent ? wobbleEvent.startFrame : Infinity;
  const numId = parseInt(actor.id.replace(/\D/g, ''), 10) || 0;
  const wobble = (!isDeparting && frame >= wobbleStart) ? Math.sin(frame * 0.15 + numId * 2) * 3 : 0;

  // --- 4. COUNT BADGE ---
  const countStart = countEvent ? countEvent.startFrame : Infinity;
  const countProg = spring({
    frame: Math.max(0, frame - countStart),
    fps,
    config: { stiffness: 180, damping: 12 },
  });

  // Calculate total positions
  // Note: hardcoded treeSlide offset for the prototype to match exactly
  const slideX = treeSlideData ? treeSlideData.value : 0;
  const currentX = actor.startX + slideX + flyX;
  const currentY = actor.startY + flyY + wobble;
  const currentOpacity = isDeparting ? flyOpacity : (actor.startOpacity ?? 1);

  return (
    <React.Fragment>
      <div
        style={{
          position: "absolute",
          left: currentX,
          top: currentY,
          transform: `scale(${baseScale}) rotate(${flyRotate}deg)`,
          opacity: currentOpacity,
          transformOrigin: "center bottom",
          zIndex: 10 + Math.random(), // simplistic z-indexing
        }}
      >
        {actor.type.includes("BIRD") ? (
          <CartoonBird colorIndex={actor.colorIndex || 0} size={110} isFlying={isFlying} />
        ) : (
          <ItemComponent itemType={actor.type} size={100} />
        )}
      </div>

      {/* Opening Number (if POP_IN provides text) */}
      {popInEvent?.text && frame < flyStart && (
        <div
          style={{
            position: "absolute",
            left: currentX + 45, // center offset for 110px bird
            top: currentY - 50,
            opacity: baseScale * (isDeparting && flyProg > 0.3 ? 0 : 1),
            transform: `scale(${baseScale})`,
            zIndex: 20,
          }}
        >
          <span
            style={{
              fontSize: 36,
              fontWeight: 900,
              fontFamily: "'Nunito', 'Comic Sans MS', cursive",
              color: "#333", // simplified
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {popInEvent.text}
          </span>
        </div>
      )}

      {/* Count Badge */}
      {countEvent?.text && frame >= countStart && (
        <div
          style={{
            position: "absolute",
            left: currentX + 35,
            top: currentY - 35,
            opacity: countProg,
            transform: `scale(${interpolate(countProg, [0, 1], [0.3, 1.1], { extrapolateRight: "clamp" })})`,
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
              {countEvent.text}
            </span>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};
