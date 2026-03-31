import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { ChoreographyScript } from "../../types";
import { TreeBranch, SVG_HEIGHT, TREE_BOTTOM_OFFSET } from "../../assets/items/TreeBranch";
import { EngineActor } from "../Engines/EngineActor";
import { Confetti } from "../primitives/Confetti";

interface ChoreographySceneProps {
  script: ChoreographyScript;
}

/**
 * Universal Stage Orchestrator.
 * Fully driven by a JSON payload defining environment, actors, and events.
 */
export const ChoreographyScene: React.FC<ChoreographySceneProps> = ({ script }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. ENVIRONMENT MAPPING
  const TREE_CONTAINER_HEIGHT = SVG_HEIGHT;
  
  // Tree slides in
  const treeSlide = script.environment === "TREE_BRANCH" ? spring({
    frame,
    fps,
    from: 300,
    to: 0,
    config: { damping: 14 },
  }) : 0;

  // 2. GLOBAL EVENTS
  const eqEvent = script.events.find(e => e.action === "SHOW_EQUATION");
  const eqStart = eqEvent ? eqEvent.startFrame : Infinity;
  const eqProg = spring({
    frame: Math.max(0, frame - eqStart),
    fps,
    config: { stiffness: 200, damping: 14 },
  });

  const confettiEvent = script.events.find(e => e.action === "CONFETTI");

  // Filter events targeted to 'scene' vs targeted to specific actors
  const getActorEvents = (actorId: string) => script.events.filter(e => e.targetId === actorId);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      
      {/* RENDER ENVIRONMENT */}
      {script.environment === "TREE_BRANCH" && (
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
      )}

      {/* RENDER ACTORS */}
      {script.actors.map(actor => (
        <EngineActor 
          key={actor.id} 
          actor={actor} 
          events={getActorEvents(actor.id)} 
          treeSlideData={{ value: treeSlide }} 
        />
      ))}

      {/* RENDER GLOBAL EVENTS */}
      {confettiEvent && frame > confettiEvent.startFrame && (
        <Confetti startFrame={confettiEvent.startFrame} />
      )}

      {eqEvent?.text && (
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
              boxShadow: "0 10px 0 rgba(0,0,0,0.18), 0 20px 40px rgba(255,107,107,0.4)",
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
              {eqEvent.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
