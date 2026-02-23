export type ChildProfile = {
  child_id: string;
  child_name: string;
  age: number;
  class_level: number;
};

export type Step = {
  title: string;
  text: string;
};

export type PromptAttempt = {
  attempt: number;
  prompt: string;
  checks: Record<string, unknown>;
  score: number;
  passed: boolean;
};

export type ReviewSummary = {
  concept: string;
  objects_used: string;
  prerequisite_used: string;
  common_mistake: string;
};

export type SolveAndPromptResponse = {
  topic: string;
  verified_answer: string;
  verified_steps: Step[];
  template: string;
  min_grade_for_topic: number;
  is_above_grade: boolean;
  review: ReviewSummary;
  attempts: PromptAttempt[];
  final_prompt: string;
  final_passed: boolean;
  final_score: number;
  video_prompt_json: Record<string, unknown> | null;
  schema_valid: boolean;
  // V2 video delivery fields
  video_url?: string | null;
  video_cached?: boolean;
  video_generated_by?: string;
};

export type RenderVideoResponse = {
  output_path: string;
  output_url: string;
  duration_seconds: number;
  used_template: string;
  audio_generated: boolean;
};

export type GeometryParseSummary = {
  analysis_available: boolean;
  has_diagram: boolean;
  line_segments: number;
  circles: number;
  parallel_pairs: number;
  perpendicular_pairs: number;
  point_labels: string[];
  shape_hints: string[];
};

export type ExtractProblemResponse = {
  question: string;
  extracted_text: string;
  source_type: "image" | "pdf";
  ocr_engine: string;
  confidence: number;
  geometry: GeometryParseSummary;
  notes: string[];
};

export type ActivityRecord = {
  child_id: string;
  question: string;
  topic: string;
  template: string;
  score: number;
  timestamp: string;
};

export type ChildMeta = {
  preferred_curriculum?: string;
  strict_class_level?: boolean;
  child_name?: string;
  age?: number;
  class_level?: number;
};

export type ChildView = ChildProfile & ChildMeta;

export type StoredResult = {
  childId: string;
  question: string;
  createdAt: string;
  solve: SolveAndPromptResponse;
  render: RenderVideoResponse | null;
};
