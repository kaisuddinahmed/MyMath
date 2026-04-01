import { ChoreographyScript, ItemType } from "./types";
import { SVG_BRANCH_LEFT, SVG_BRANCH_RIGHT } from "./assets/items/TreeBranch";

// Map bird positions for the mock generator (matching the logic in getBirdPositions)
const BIRD_Y = 1280;

export const generateStoryChoreography = (
  total: number, 
  amount: number,
  itemType: string,
  environment: string,
  timings: { start: number; dur: number; audioDur?: number }[]
): ChoreographyScript => {
  const gap = total <= 1 ? 0 : (SVG_BRANCH_RIGHT - SVG_BRANCH_LEFT) / (total - 1);
  const getBirdX = (i: number) => total === 1 ? (SVG_BRANCH_LEFT + SVG_BRANCH_RIGHT) / 2 : SVG_BRANCH_LEFT + i * gap;
  const remaining = total - amount;

  // The LLM often sends the subtraction narration split across multiple scenes (e.g. 3 audio files).
  // We must SUM the total audio space across all subscenes so the animation spans the whole dialogue correctly.
  const totalDuration = timings.reduce((sum, t) => sum + (t.dur || 0), 0) || 300;
  
  // Split the total duration into 4 logical acts (25% each):
  // Act 1 (0-25%): Pop in ("5 birds were sitting...")
  // Act 2 (25-50%): Fly away ("And 1 flew away...")
  // Act 3 (50-75%): Counting
  // Act 4 (75-100%): Equation ("So 5 minus 1 leaves 4")
  const quarter = totalDuration * 0.25;
  
  // Stagger boundaries
  const act2Start = quarter; 
  const act3Start = quarter * 2; 
  const act4Start = quarter * 3; 

  return {
    environment: "TREE_BRANCH",
    actors: Array.from({ length: total }).map((_, i) => ({
      id: `actor-${i}`,
      type: (itemType || "BIRD_SVG") as ItemType,
      colorIndex: i,
      startX: getBirdX(i) - 55, // Center offset for 110px bird
      startY: BIRD_Y,
    })),
    events: [
      // --- ACT 1: POP IN (during first sentence) ---
      ...Array.from({ length: total }).map((_, i) => ({
        targetId: `actor-${i}`,
        startFrame: 8 + i * 5,
        action: "POP_IN" as const,
        text: `${i + 1}`, // Show badge 1-N
      })),

      // --- ACT 2: B BIRDS FLY AWAY (starting exactly when 2nd audio segment starts) ---
      ...Array.from({ length: amount }).map((_, index) => {
        const i = total - 1 - index; // rightmost birds fly away
        return {
          targetId: `actor-${i}`,
          startFrame: act2Start + index * 8, 
          action: "FLY_AWAY_ARC" as const,
          endX: 600 + i * 40,
        };
      }),

      // --- WOBBLE FOR REMAINING ---
      ...Array.from({ length: remaining }).map((_, i) => ({
        targetId: `actor-${i}`,
        startFrame: act2Start, 
        action: "WOBBLE" as const,
      })),

      // --- ACT 3: COUNT REMAINING (during 3rd sentence) ---
      ...Array.from({ length: remaining }).map((_, i) => ({
        targetId: `actor-${i}`,
        startFrame: act3Start + i * 15, // slower counting
        action: "SHOW_COUNT_BADGE" as const,
        text: `${i + 1}`,
      })),

      // --- ACT 4: GLOBAL EQUATION ---
      {
        targetId: "scene",
        startFrame: act4Start - 15, // slight lead in for equation pop
        action: "SHOW_EQUATION",
        text: `${total} − ${amount} = ${remaining}`,
      },
      
      // --- CONFETTI ---
      {
        targetId: "scene",
        startFrame: act4Start,
        action: "CONFETTI",
      }
    ],
  };
};

export const generateAdditionChoreography = (
  amount1: number, 
  amount2: number,
  itemType: string,
  environment: string,
  timings: { start: number; dur: number; audioDur?: number }[]
): ChoreographyScript => {
  const total = amount1 + amount2;
  const gap = total <= 1 ? 0 : (SVG_BRANCH_RIGHT - SVG_BRANCH_LEFT) / (total - 1);
  const getBirdX = (i: number) => total === 1 ? (SVG_BRANCH_LEFT + SVG_BRANCH_RIGHT) / 2 : SVG_BRANCH_LEFT + i * gap;

  // Predict total run length based on the incoming narration cuts
  const totalDuration = timings.reduce((sum, t) => sum + (t.dur || 0), 0) || 300;
  
  // Logical Acts for Addition:
  // Act 1: Initial Group Pop In ("3 children playing")
  // Act 2: Second Group Pop In ("2 more come")
  // Act 3: Whole Group Excitement Wobble & Counting
  // Act 4: Mathematical Conclusion
  const quarter = totalDuration * 0.25;
  const act2Start = quarter; 
  const act3Start = quarter * 2; 
  const act4Start = quarter * 3;

  return {
    environment: environment === "PLAIN" ? "PLAIN" : "TREE_BRANCH",
    actors: Array.from({ length: total }).map((_, i) => ({
      id: `actor-${i}`,
      type: (itemType || "CHILD_SVG") as ItemType,
      colorIndex: i,
      startX: getBirdX(i) - 55, // Center offset
      startY: BIRD_Y,
    })),
    events: [
      // --- ACT 1: INITIAL GROUP POP IN ---
      ...Array.from({ length: amount1 }).map((_, i) => ({
        targetId: `actor-${i}`,
        startFrame: 8 + i * 5,
        action: "POP_IN" as const,
      })),

      // --- ACT 2: NEW ARRIVALS POP IN ---
      ...Array.from({ length: amount2 }).map((_, index) => {
        const i = amount1 + index;
        return {
          targetId: `actor-${i}`,
          startFrame: act2Start + index * 8, 
          action: "POP_IN" as const, // Pop in next to the first group exactly when the voice triggers
        };
      }),

      // --- WOBBLE ALL FOR VISUAL COMBINATION EXCITEMENT ---
      ...Array.from({ length: total }).map((_, i) => ({
        targetId: `actor-${i}`,
        startFrame: act3Start - 10,  // Just before counting starts
        action: "WOBBLE" as const,
      })),

      // --- ACT 3: COUNTING BADGES (during enumeration voiceover) ---
      ...Array.from({ length: total }).map((_, i) => ({
        targetId: `actor-${i}`,
        startFrame: act3Start + i * 15, // Slow, paced counting
        action: "SHOW_COUNT_BADGE" as const,
        text: `${i + 1}`,
      })),

      // --- ACT 4: GLOBAL EQUATION STAMP ---
      {
        targetId: "scene",
        startFrame: act4Start - 15,
        action: "SHOW_EQUATION",
        text: `${amount1} + ${amount2} = ${total}`,
      },
      
      // --- END SCENE CONFETTI ---
      {
        targetId: "scene",
        startFrame: act4Start,
        action: "CONFETTI",
      }
    ],
  };
};
