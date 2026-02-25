/**
 * Type definitions for the video director script
 * that the LLM generates and Remotion consumes.
 */

export type ItemType =
  | "APPLE_SVG"
  | "BLOCK_SVG"
  | "STAR_SVG"
  | "COUNTER"
  | "PIE_CHART"
  | "BAR_CHART";

export type AnimationStyle =
  | "BOUNCE_IN"
  | "FADE_IN"
  | "SLIDE_LEFT"
  | "POP"
  | "NONE";

export type SceneAction =
  | "ADD_ITEMS"
  | "REMOVE_ITEMS"
  | "GROUP_ITEMS"
  | "SPLIT_ITEM"
  | "SHOW_EQUATION"
  | "HIGHLIGHT";

export interface DirectorScene {
  duration: number;
  action: SceneAction;
  item_type?: ItemType;
  count?: number;
  groups?: number;
  per_group?: number;
  numerator?: number;
  denominator?: number;
  equation?: string;
  animation_style: AnimationStyle;
  narration: string;
}

export interface DirectorScript {
  title: string;
  grade: number;
  topic: string;
  problem: string;
  correct_answer: string;
  visual_template: string;
  duration_seconds: number;
  scenes: DirectorScene[];
  checkpoint_question: string;
  practice_problem: {
    question: string;
    answer: string;
  };
}

export interface RenderRequest {
  script: DirectorScript;
  audioUrl?: string; // Legacy
  audioUrls?: string[]; // V2 Per-scene audio
  outputName?: string;
  titleDuration?: number;
}
