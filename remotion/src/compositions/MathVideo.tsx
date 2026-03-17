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
  EquationScene,
} from "../components/Scenes";
import { FractionScene } from "../components/Scenes/FractionScene";
import { GeometryScene } from "../components/Scenes/GeometryScene";
import { MeasurementScene } from "../components/Scenes/MeasurementScene";
import { DataScene } from "../components/Scenes/DataScene";
import { CurrencyScene } from "../components/Scenes/CurrencyScene";
import { AlgebraScene } from "../components/Scenes/AlgebraScene";
import { NumberLineScene } from "../components/Scenes/NumberLineScene";
import { PlaceValueScene } from "../components/Scenes/PlaceValueScene";
import { ColumnArithmeticScene } from "../components/Scenes/ColumnArithmeticScene";
import { BODMASScene } from "../components/Scenes/BODMASScene";
import { EvenOddScene } from "../components/Scenes/EvenOddScene";
import { PercentageScene } from "../components/Scenes/PercentageScene";
import { SmallAdditionScene } from "../components/Scenes/SmallAdditionScene";
import { MediumAdditionScene } from "../components/Scenes/MediumAdditionScene";
import { SmallSubtractionScene } from "../components/Scenes/SmallSubtractionScene";
import { MediumSubtractionScene } from "../components/Scenes/MediumSubtractionScene";
import { NumberOrderingScene } from "../components/Scenes/NumberOrderingScene";

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
    case "DRAW_SHAPE":
      return <GeometryScene scene={scene} />;
    case "MEASURE":
      return <MeasurementScene scene={scene} />;
    case "PLOT_CHART":
      return <DataScene scene={scene} />;
    case "BALANCE":
      return <AlgebraScene scene={scene} />;
    case "JUMP_NUMBER_LINE":
      return <NumberLineScene scene={scene} />;
    case "SHOW_PLACE_VALUE":
      return <PlaceValueScene scene={scene} />;
    case "SHOW_BODMAS":
      return <BODMASScene scene={scene} />;
    case "SHOW_EVEN_ODD":
      return <EvenOddScene scene={scene} />;
    case "SHOW_PERCENTAGE":
      return <PercentageScene scene={scene} />;
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
      // Ensure medium scenes have enough time for child-paced animation
      if (scene.action === "SHOW_MEDIUM_SUBTRACTION" || scene.action === "SHOW_MEDIUM_ADDITION") {
        dur = Math.max(dur, 22 * fps);
      }
    } else if (!scene.narration || scene.narration.trim() === "") {
      dur = 4 * fps;
    } else {
      const wordCount = scene.narration.split(/\s+/).length;
      // 2.5 words per sec + 1.5 seconds of visual breathing room
      const minSeconds = (scene.action === "SHOW_MEDIUM_SUBTRACTION" || scene.action === "SHOW_MEDIUM_ADDITION") ? 22 : 3;
      const estimatedSeconds = Math.max(minSeconds, (wordCount / 2.5) + 1.5);
      dur = Math.round(estimatedSeconds * fps);
    }
    
    currentFrame += dur;
    return { start, dur };
  });



  // Group scenes for continuous visual animation (e.g., Column Arithmetic)
  const visualGroups: {
    start: number;
    durationInFrames: number;
    action: string;
    subScenes: { scene: DirectorScene; start: number; dur: number }[];
  }[] = [];

  script.scenes.forEach((scene, i) => {
    const timing = sceneStarts[i];
    const lastGroup = visualGroups[visualGroups.length - 1];
    
    // Group scenes that should share continuous visual state (e.g. Columns, Small Addition)
    if (
      lastGroup && 
      (
        (lastGroup.action === "SHOW_COLUMN_ARITHMETIC" && scene.action === "SHOW_COLUMN_ARITHMETIC") ||
        (lastGroup.action === "SHOW_SMALL_ADDITION" && scene.action === "SHOW_SMALL_ADDITION") ||
        (lastGroup.action === "SHOW_MEDIUM_ADDITION" && scene.action === "SHOW_MEDIUM_ADDITION") ||
        (lastGroup.action === "SHOW_SMALL_SUBTRACTION" && scene.action === "SHOW_SMALL_SUBTRACTION") ||
        (lastGroup.action === "SHOW_MEDIUM_SUBTRACTION" && scene.action === "SHOW_MEDIUM_SUBTRACTION") ||
        (lastGroup.action === "SHOW_NUMBER_ORDERING" && scene.action === "SHOW_NUMBER_ORDERING")
      )
    ) {
      lastGroup.durationInFrames += timing.dur;
      lastGroup.subScenes.push({ scene, ...timing });
    } else {
      visualGroups.push({
        start: timing.start,
        durationInFrames: timing.dur,
        action: scene.action,
        subScenes: [{ scene, ...timing }]
      });
    }
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

      {/* Visual Scenes */}
      {visualGroups.map((group, i) => (
        <Sequence
          key={`visual-${i}`}
          from={group.start}
          durationInFrames={group.durationInFrames}
        >
          <AbsoluteFill>
            {group.action === "SHOW_COLUMN_ARITHMETIC" ? (
              <ColumnArithmeticScene groupedScenes={group.subScenes.map(s => s.scene)} timings={group.subScenes} />
            ) : group.action === "SHOW_SMALL_ADDITION" ? (
              <SmallAdditionScene groupedScenes={group.subScenes.map(s => s.scene)} timings={group.subScenes} />
            ) : group.action === "SHOW_MEDIUM_ADDITION" ? (
              <MediumAdditionScene groupedScenes={group.subScenes.map(s => s.scene)} timings={group.subScenes} />
            ) : group.action === "SHOW_SMALL_SUBTRACTION" ? (
              <SmallSubtractionScene groupedScenes={group.subScenes.map(s => s.scene)} timings={group.subScenes} />
            ) : group.action === "SHOW_MEDIUM_SUBTRACTION" ? (
              <MediumSubtractionScene groupedScenes={group.subScenes.map(s => s.scene)} timings={group.subScenes} />
            ) : group.action === "SHOW_NUMBER_ORDERING" ? (
              <NumberOrderingScene groupedScenes={group.subScenes.map(s => s.scene)} timings={group.subScenes} />
            ) : (
              sceneComponent(group.subScenes[0].scene)
            )}
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* Narration Bars — skip for grouped timeline scenes (TTS handles it natively inside) */}
      {script.scenes.map((scene, i) => (
        scene.action === "SHOW_COLUMN_ARITHMETIC" || scene.action === "SHOW_SMALL_ADDITION" || scene.action === "SHOW_MEDIUM_ADDITION" || scene.action === "SHOW_SMALL_SUBTRACTION" || scene.action === "SHOW_MEDIUM_SUBTRACTION" || scene.action === "SHOW_NUMBER_ORDERING" ? null : (
        <Sequence
          key={`narration-${i}`}
          from={sceneStarts[i].start}
          durationInFrames={sceneStarts[i].dur}
        >
          <AbsoluteFill>
            <NarrationBar text={scene.narration} />
          </AbsoluteFill>
        </Sequence>
        )
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
