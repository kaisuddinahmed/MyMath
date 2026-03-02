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
  | "BAR_CHART"
  | "COIN"
  | "NOTE"
  | "RULER"
  | "CLOCK"
  | "SHAPE_2D"
  | "SHAPE_3D"
  | "BASE10_BLOCK"
  | "TALLY_MARK"
  | "NUMBER_LINE";

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
  | "HIGHLIGHT"
  | "DRAW_SHAPE"
  | "MEASURE"
  | "BALANCE"
  | "PLOT_CHART"
  | "JUMP_NUMBER_LINE"
  | "SHOW_PLACE_VALUE"
  | "SHOW_COLUMN_ARITHMETIC"
  | "SHOW_BODMAS"
  | "SHOW_EVEN_ODD"
  | "SHOW_PERCENTAGE"
  | "SHOW_SMALL_ADDITION";

export type CurriculumId = "nctb" | "cambridge" | "edexcel";

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
  /**
   * Optional: curriculum-specific visual metaphor for this scene.
   * e.g. "fish" for NCTB addition, "ten-frame" for Cambridge addition.
   * Scenes should use this to pick the right icon/object to animate.
   */
  visual_metaphor?: string;
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
  /**
   * Optional: curriculum the script was generated for.
   * Drives visual_metaphor choices and narration style.
   * Defaults to "nctb" if omitted.
   */
  curriculum?: CurriculumId;
}

export interface RenderRequest {
  script: DirectorScript;
  audioUrl?: string; // Legacy
  audioUrls?: string[]; // V2 Per-scene audio
  outputName?: string;
  titleDuration?: number;
}
