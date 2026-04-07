import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import type { DirectorScript, DirectorScene } from "../types";
import { CounterScene, GroupScene, EquationScene } from "../components/Scenes";
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
import { ChoreographyScene } from "../components/Scenes/ChoreographyScene";
import {
  generateStoryChoreography,
  generateAdditionChoreography,
} from "../mockChoreography";
import { MediumSubtractionScene } from "../components/Scenes/MediumSubtractionScene";
import { NumberOrderingScene } from "../components/Scenes/NumberOrderingScene";
import { PartWholeScene } from "../components/Scenes/PartWholeScene";
import { NumberBondScene } from "../components/Scenes/NumberBondScene";
import {
  CartoonBackground,
  themeForTopic,
} from "../components/primitives/CartoonBackground";
import { CelebrationBurst } from "../components/primitives/CelebrationBurst";

const FPS = 30;

// Nunito font family string — applied inline to all text elements
const KID_FONT = "'Nunito', 'Comic Sans MS', cursive";

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
  const theme = themeForTopic(script.topic || "");

  let currentFrame = 0;

  const sceneStarts = script.scenes.map((scene, i) => {
    const start = currentFrame;

    let dur = 4 * fps;
    let audioDur = 4 * fps;

    if (sceneDurations && sceneDurations[i]) {
      audioDur = sceneDurations[i];
      // Add 0.5s of "digestion padding" so scenes don't cut the moment the voice stops
      dur = sceneDurations[i] + 0.5 * fps;
      if (
        scene.action === "SHOW_MEDIUM_SUBTRACTION" ||
        scene.action === "SHOW_MEDIUM_ADDITION"
      ) {
        dur = Math.max(dur, 22 * fps);
      }
    } else if (!scene.narration || scene.narration.trim() === "") {
      dur = 4 * fps;
      audioDur = 4 * fps;
    } else {
      const wordCount = scene.narration.split(/\s+/).length;
      const minSeconds =
        scene.action === "SHOW_MEDIUM_SUBTRACTION" ||
        scene.action === "SHOW_MEDIUM_ADDITION"
          ? 22
          : 3;
      const estimatedSeconds = Math.max(minSeconds, wordCount / 2.5 + 1.5);
      dur = Math.round(estimatedSeconds * fps);
      audioDur = dur;
    }

    currentFrame += dur;
    return { start, dur, audioDur };
  });

  // Group scenes for continuous visual animation
  const visualGroups: {
    start: number;
    durationInFrames: number;
    action: string;
    subScenes: {
      scene: DirectorScene;
      start: number;
      dur: number;
      audioDur?: number;
    }[];
  }[] = [];

  script.scenes.forEach((scene, i) => {
    const timing = sceneStarts[i];
    const lastGroup = visualGroups[visualGroups.length - 1];

    if (
      lastGroup &&
      ((lastGroup.action === "SHOW_COLUMN_ARITHMETIC" &&
        scene.action === "SHOW_COLUMN_ARITHMETIC") ||
        (lastGroup.action === "SHOW_SMALL_ADDITION" &&
          scene.action === "SHOW_SMALL_ADDITION") ||
        (lastGroup.action === "SHOW_MEDIUM_ADDITION" &&
          scene.action === "SHOW_MEDIUM_ADDITION") ||
        (lastGroup.action === "SHOW_SMALL_SUBTRACTION" &&
          scene.action === "SHOW_SMALL_SUBTRACTION") ||
        (lastGroup.action === "SHOW_MEDIUM_SUBTRACTION" &&
          scene.action === "SHOW_MEDIUM_SUBTRACTION") ||
        (lastGroup.action === "CHOREOGRAPH_SUBTRACTION" &&
          scene.action === "CHOREOGRAPH_SUBTRACTION") ||
        (lastGroup.action === "CHOREOGRAPH_ADDITION" &&
          scene.action === "CHOREOGRAPH_ADDITION") ||
        (lastGroup.action === "SHOW_NUMBER_ORDERING" &&
          scene.action === "SHOW_NUMBER_ORDERING") ||
        (lastGroup.action === "SHOW_PART_WHOLE_SUBTRACTION" &&
          scene.action === "SHOW_PART_WHOLE_SUBTRACTION") ||
        (lastGroup.action === "SHOW_NUMBER_BOND" &&
          scene.action === "SHOW_NUMBER_BOND"))
    ) {
      lastGroup.durationInFrames += timing.dur;
      lastGroup.subScenes.push({ scene, ...timing });
    } else {
      visualGroups.push({
        start: timing.start,
        durationInFrames: timing.dur,
        action: scene.action,
        subScenes: [{ scene, ...timing }],
      });
    }
  });

  // Determine celebration start (last scene)
  // Total video duration accumulated from all scene durations
  const totalVideoFrames = currentFrame;

  // Celebration is an ADDITIONAL sequence that plays AFTER all scenes finish
  const CELEBRATION_FRAMES = 4 * FPS; // 4 seconds
  const showCelebration = !!script.correct_answer && script.scenes.length > 0;
  // Starts exactly when all math scene content is done
  const celebrationStart = totalVideoFrames;

  return (
    <AbsoluteFill>
      {/* Bright cartoon sky/ground background — full video */}
      <CartoonBackground theme={theme} />

      {/* Visual Scenes */}
      {visualGroups.map((group, i) => (
        <Sequence
          key={`visual-${i}`}
          from={group.start}
          durationInFrames={group.durationInFrames}
        >
          <AbsoluteFill>
            {group.action === "SHOW_COLUMN_ARITHMETIC" ? (
              <ColumnArithmeticScene
                groupedScenes={group.subScenes.map((s) => s.scene)}
                timings={group.subScenes}
              />
            ) : group.action === "SHOW_SMALL_ADDITION" ? (
              <SmallAdditionScene
                groupedScenes={group.subScenes.map((s) => s.scene)}
                timings={group.subScenes}
              />
            ) : group.action === "SHOW_MEDIUM_ADDITION" ? (
              <MediumAdditionScene
                groupedScenes={group.subScenes.map((s) => s.scene)}
                timings={group.subScenes}
              />
            ) : group.action === "CHOREOGRAPH_SUBTRACTION" ||
              group.action === "CHOREOGRAPH_ADDITION" ? (
              (() => {
                const total =
                  group.subScenes[0]?.scene?.choreography_total || 5;
                const amt = group.subScenes[0]?.scene?.choreography_amount || 1;
                const type = group.subScenes[0]?.scene?.item_type || "BIRD_SVG";
                const env =
                  group.subScenes[0]?.scene?.choreography_environment ||
                  (type.includes("BIRD") || type.includes("APPLE")
                    ? "TREE_BRANCH"
                    : "PLAIN");
                if (group.action === "CHOREOGRAPH_ADDITION") {
                  return (
                    <ChoreographyScene
                      script={generateAdditionChoreography(
                        total,
                        amt,
                        type,
                        env,
                        group.subScenes,
                      )}
                    />
                  );
                }
                return (
                  <ChoreographyScene
                    script={generateStoryChoreography(
                      total,
                      amt,
                      type,
                      env,
                      group.subScenes,
                    )}
                  />
                );
              })()
            ) : group.action === "SHOW_SMALL_SUBTRACTION" ? (
              // Fallback for cached V2 problems mapping to the new V3 engine
              group.subScenes[0]?.scene?.item_type?.includes("BIRD") ? (
                (() => {
                  const eqStr = group.subScenes[0]?.scene?.equation || "7 - 4";
                  const nums = eqStr.match(/\d+/g);
                  const total =
                    nums && nums.length >= 1 ? parseInt(nums[0], 10) : 7;
                  const amt =
                    nums && nums.length >= 2 ? parseInt(nums[1], 10) : 4;
                  return (
                    <ChoreographyScene
                      script={generateStoryChoreography(
                        total,
                        amt,
                        group.subScenes[0].scene.item_type || "BIRD_SVG",
                        "TREE_BRANCH",
                        group.subScenes,
                      )}
                    />
                  );
                })()
              ) : (
                <SmallSubtractionScene
                  groupedScenes={group.subScenes.map((s) => s.scene)}
                  timings={group.subScenes}
                />
              )
            ) : group.action === "SHOW_MEDIUM_SUBTRACTION" ? (
              <MediumSubtractionScene
                groupedScenes={group.subScenes.map((s) => s.scene)}
                timings={group.subScenes}
              />
            ) : group.action === "SHOW_NUMBER_ORDERING" ? (
              <NumberOrderingScene
                groupedScenes={group.subScenes.map((s) => s.scene)}
                timings={group.subScenes}
              />
            ) : group.action === "SHOW_PART_WHOLE_SUBTRACTION" ? (
              <PartWholeScene
                groupedScenes={group.subScenes.map((s) => s.scene)}
                timings={group.subScenes}
              />
            ) : group.action === "SHOW_NUMBER_BOND" ? (
              <NumberBondScene
                groupedScenes={group.subScenes.map((s) => s.scene)}
                timings={group.subScenes}
              />
            ) : (
              sceneComponent(group.subScenes[0].scene)
            )}
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* Narration Bars — disabled: audio TTS handles narration */}

      {/* Celebration burst — final 4 seconds ONLY */}
      {showCelebration && (
        <Sequence from={celebrationStart} durationInFrames={CELEBRATION_FRAMES}>
          <AbsoluteFill>
            <CelebrationBurst answer={script.correct_answer} startFrame={0} />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* Audio track(s) */}
      {audioUrls && audioUrls.length > 0 ? (
        audioUrls.map((url, i) =>
          url ? (
            <Sequence
              key={i}
              from={sceneStarts[i].start + Math.round(fps * 0.5)}
            >
              <Audio src={url} />
            </Sequence>
          ) : null,
        )
      ) : audioUrl ? (
        <Sequence from={0}>
          <Audio src={audioUrl} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
