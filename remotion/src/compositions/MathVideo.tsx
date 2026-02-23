import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import type { DirectorScript, DirectorScene } from "../types";
import {
  TitleCard,
  NarrationBar,
  CounterScene,
  GroupScene,
  FractionScene,
  EquationScene,
} from "../components/Scenes";

const BG_COLOR = "#0F172A";
const FPS = 24;

function sceneComponent(scene: DirectorScene) {
  switch (scene.action) {
    case "ADD_ITEMS":
    case "REMOVE_ITEMS":
    case "HIGHLIGHT":
      return <CounterScene scene={scene} />;
    case "GROUP_ITEMS":
      return <GroupScene scene={scene} />;
    case "SPLIT_ITEM":
      return <FractionScene scene={scene} />;
    case "SHOW_EQUATION":
      return <EquationScene scene={scene} />;
    default:
      return <CounterScene scene={scene} />;
  }
}

export const MathVideo: React.FC<{
  script: DirectorScript;
  audioUrl?: string;
}> = ({ script, audioUrl }) => {
  const { fps } = useVideoConfig();
  const titleDuration = 2 * fps; // 2 seconds for title

  let currentFrame = 0;

  // Title card comes first
  const titleStart = currentFrame;
  currentFrame += titleDuration;

  // Calculate scene starts
  const sceneStarts = script.scenes.map((scene) => {
    const start = currentFrame;
    const dur = Math.max(1, scene.duration) * fps;
    currentFrame += dur;
    return { start, dur };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG_COLOR }}>
      {/* Background gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.08) 0%, transparent 60%), " +
            "radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.06) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      {/* Title card */}
      <Sequence from={titleStart} durationInFrames={titleDuration}>
        <AbsoluteFill>
          <TitleCard
            title={script.title}
            problem={script.problem}
            grade={script.grade}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Scenes */}
      {script.scenes.map((scene, i) => (
        <Sequence
          key={i}
          from={sceneStarts[i].start}
          durationInFrames={sceneStarts[i].dur}
        >
          <AbsoluteFill>
            {sceneComponent(scene)}
            <NarrationBar text={scene.narration} />
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* Audio track if provided */}
      {audioUrl ? (
        <Sequence from={0}>
          <Audio src={audioUrl} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
