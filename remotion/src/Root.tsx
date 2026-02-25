import React from "react";
import { Composition } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
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
          audioUrls: undefined,
          sceneDurations: undefined,
        }}
        calculateMetadata={async ({ props }) => {
          let totalFrames = 0;
          const sceneDurations: number[] = [];
          
          function getVisualFrames(scene: any): number {
            if (scene.action === "SHOW_EQUATION") return 30;
            if (scene.action === "SPLIT_ITEM") {
              const denom = Math.max(scene.denominator || 4, 1);
              return Math.round((denom - 1) * 6 + 25);
            }
            let total = 1;
            if (scene.action === "GROUP_ITEMS") {
              const g = Math.min(scene.groups || 3, 10);
              const pg = Math.min(scene.per_group || scene.count || 4, 12);
              total = g * pg;
            } else {
              total = Math.min(scene.count || 5, 30);
            }
            const stagger = Math.max(1, 40 / Math.max(1, total));
            const maxDelay = (total - 1) * stagger;
            return Math.round(maxDelay + 30); // 30 frames for spring to settle
          }
          
          const audioUrls = props.audioUrls || [];

          for (let i = 0; i < (props.script?.scenes || []).length; i++) {
            const scene = props.script?.scenes[i];
            const url = audioUrls[i];
            if (url) {
              try {
                const audioSecs = await getAudioDurationInSeconds(url);
                const audioFrames = Math.round((audioSecs + 1.0) * FPS);
                const visualFrames = getVisualFrames(scene);
                
                // Allow scene to hold until BOTH audio and visual are finished
                // (Visual gets an extra 0.5s padding at the end)
                const frames = Math.max(audioFrames, visualFrames + Math.round(FPS * 0.5));
                
                sceneDurations.push(frames);
                totalFrames += frames;
              } catch (err) {
                console.error("Failed to load audio length for " + url, err);
                sceneDurations.push(4 * FPS);
                totalFrames += 4 * FPS;
              }
            } else {
              // Legacy fallback logic
              const scene = props.script.scenes[i];
              if (!scene.narration || scene.narration.trim() === "") {
                sceneDurations.push(4 * FPS);
                totalFrames += 4 * FPS;
              } else {
                const wordCount = scene.narration.split(/\s+/).length;
                const estimatedSeconds = Math.max(3, (wordCount / 2.5) + 1.5);
                const frames = Math.round(estimatedSeconds * FPS);
                sceneDurations.push(frames);
                totalFrames += frames;
              }
            }
          }

          return {
            durationInFrames: totalFrames,
            props: {
              ...props,
              sceneDurations,
            },
          };
        }}
      />
    </>
  );
};
