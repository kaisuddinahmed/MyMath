import React from "react";
import { Composition } from "remotion";
import { MathVideo } from "./compositions/MathVideo";
import type { DirectorScript } from "./types";

const FPS = 24;

/** Fallback script for Remotion Studio preview */
const defaultScript: DirectorScript = {
  title: "Let's Add!",
  grade: 1,
  topic: "addition",
  problem: "3 + 5",
  correct_answer: "8",
  visual_template: "counters_add_sub",
  duration_seconds: 15,
  scenes: [
    {
      duration: 5,
      action: "ADD_ITEMS",
      item_type: "APPLE_SVG",
      count: 3,
      animation_style: "BOUNCE_IN",
      narration: "Let's start with 3 red apples!",
    },
    {
      duration: 5,
      action: "ADD_ITEMS",
      item_type: "APPLE_SVG",
      count: 5,
      animation_style: "BOUNCE_IN",
      narration: "Now let's add 5 more apples!",
    },
    {
      duration: 5,
      action: "SHOW_EQUATION",
      equation: "3 + 5 = 8",
      animation_style: "POP",
      narration: "3 plus 5 equals 8! Great job!",
    },
  ],
  checkpoint_question: "Can you count all the apples?",
  practice_problem: { question: "4 + 2", answer: "6" },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MathVideo"
        component={MathVideo}
        durationInFrames={FPS * 30}
        fps={FPS}
        width={1280}
        height={720}
        defaultProps={{
          script: defaultScript,
          audioUrl: undefined,
        }}
        calculateMetadata={async ({ props }) => {
          const totalSeconds =
            2 + (props.script?.scenes || []).reduce(
              (sum: number, s: { duration: number }) => sum + Math.max(1, s.duration),
              0
            );
          return {
            durationInFrames: Math.ceil(totalSeconds * FPS),
          };
        }}
      />
    </>
  );
};
