/**
 * Type definitions for the video director script
 * that the LLM generates and Remotion consumes.
 */

export type ItemType =
  | "APPLE_SVG"
  | "BIRD_SVG"
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
  | "NUMBER_LINE"
  | "CHILD_SVG"
  | "FOOTBALL_SVG"
  | "PEN_SVG"
  | "PENCIL_SVG"
  | "TREE_SVG"
  | "BOTTLE_SVG"
  | "CAR_SVG"
  | "RICKSHAW_SVG"
  | "FEATHER_SVG"
  | "JACKFRUIT_SVG"
  | "BOOK_SVG"
  | "FLOWER_SVG"
  | "MANGO_SVG"
  | "BRINJAL_SVG"
  | "BUS_SVG"
  | "BD_FLAG_SVG"
  | "MAGPIE_SVG"
  | "LILY_SVG"
  | "TIGER_SVG"
  | "BANANA_SVG"
  | "ROSE_SVG"
  | "LEAF_SVG"
  | "UMBRELLA_SVG"
  | "HILSA_FISH_SVG"
  | "BALLOON_SVG"
  | "PINEAPPLE_SVG"
  | "COCONUT_SVG"
  | "CARROT_SVG"
  | "WATER_GLASS_SVG"
  | "EGG_SVG"
  | "TEA_CUP_SVG"
  | "POMEGRANATE_SVG"
  | "RABBIT_SVG"
  | "CAT_SVG"
  | "HORSE_SVG"
  | "BOAT_SVG"
  | "MARBLE_SVG"
  | "CROW_SVG"
  | "PEACOCK_SVG"
  | "COCK_SVG"
  | "HEN_SVG"
  | "GUAVA_SVG"
  | "ELEPHANT_SVG"
  | "TOMATO_SVG"
  | "PALM_FRUIT_SVG"
  | "ICE_CREAM_SVG"
  | "WATERMELON_SVG"
  | "CAP_SVG"
  | "HAT_SVG"
  | "BUTTERFLY_SVG"
  | "CHOCOLATE_SVG"
  | "CHAIR_SVG"
  | "SLICED_WATERMELON_SVG";

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
  | "SHOW_SMALL_ADDITION"
  | "SHOW_MEDIUM_ADDITION"
  | "SHOW_SMALL_SUBTRACTION"
  | "SHOW_MEDIUM_SUBTRACTION"
  | "SHOW_NUMBER_ORDERING"
  | "SHOW_PART_WHOLE_SUBTRACTION"
  | "SHOW_NUMBER_BOND"
  | "PROTOTYPE_CHOREOGRAPHY";

export type CurriculumId = "nctb" | "cambridge" | "edexcel";

// ==========================================
// V2 CHOREOGRAPHY ENGINE TYPES
// ==========================================

export interface ChoreographyActor {
  id: string;
  type: ItemType;       // e.g. "BIRD_SVG"
  colorIndex?: number;  // for distinct visual variations
  startX: number;
  startY: number;
  startScale?: number;
  startOpacity?: number;
}

export interface ChoreographyEvent {
  targetId: string; // The actor ID to animate (or "scene" for global events)
  startFrame: number;
  action: "POP_IN" | "FLY_AWAY_ARC" | "WOBBLE" | "SHOW_COUNT_BADGE" | "SHOW_EQUATION" | "CONFETTI";
  // Action payloads
  text?: string;
  endX?: number;
  endY?: number;
}

export interface ChoreographyScript {
  environment: "TREE_BRANCH" | "NONE";
  actors: ChoreographyActor[];
  events: ChoreographyEvent[];
}

// ==========================================
// V1 SCENE TYPES
// ==========================================

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
  subset_label?: string;
  remainder_label?: string;
  bond_whole?: number;
  bond_part1?: number;
  bond_part2?: number;
  bond_missing?: "whole" | "part1" | "part2" | "split";
  /** V2 Choreography data payload for entirely data-driven scenes */
  choreography?: ChoreographyScript;
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
