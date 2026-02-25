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
  audioUrls?: string[];
  sceneDurations?: number[];
}> = ({ script, audioUrl, audioUrls, sceneDurations }) => {
  const { fps } = useVideoConfig();

  let currentFrame = 0;

  // Calculate scene starts
  // If `sceneDurations` is provided by Root `calculateMetadata`, use the exact audio lengths.
  // Otherwise, fallback to the ~150 wpm word-count strategy.
  const sceneStarts = script.scenes.map((scene, i) => {
    const start = currentFrame;
    
    let dur = 4 * fps;
    
    if (sceneDurations && sceneDurations[i]) {
      // Use exact duration calculated from the audio file
      dur = sceneDurations[i];
    } else if (!scene.narration || scene.narration.trim() === "") {
      dur = 4 * fps; 
    } else {
      const wordCount = scene.narration.split(/\s+/).length;
      // 2.5 words per sec + 1.5 seconds of visual breathing room
      const estimatedSeconds = Math.max(3, (wordCount / 2.5) + 1.5);
      dur = Math.round(estimatedSeconds * fps);
    }
    
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

      {/* Audio track(s) */}
      {audioUrls && audioUrls.length > 0 ? (
        audioUrls.map((url, i) => (
          url ? (
            <Sequence key={i} from={sceneStarts[i].start + Math.round(fps * 0.5)}>
              <Audio src={url} />
            </Sequence>
          ) : null
        ))
      ) : audioUrl ? (
        <Sequence from={0}>
          <Audio src={audioUrl} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
