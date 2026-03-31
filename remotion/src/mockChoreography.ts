import { ChoreographyScript } from "./types";
import { SVG_BRANCH_LEFT, SVG_BRANCH_RIGHT } from "./assets/items/TreeBranch";

// Map bird positions for the mock generator (matching the logic in getBirdPositions)
const BIRD_Y = 1280;

export const generateBirdChoreography = (
  total: number, 
  amount: number,
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
      id: `bird-${i}`,
      type: "BIRD_SVG",
      colorIndex: i,
      startX: getBirdX(i) - 55, // Center offset for 110px bird
      startY: BIRD_Y,
    })),
    events: [
      // --- ACT 1: POP IN (during first sentence) ---
      ...Array.from({ length: total }).map((_, i) => ({
        targetId: `bird-${i}`,
        startFrame: 8 + i * 5,
        action: "POP_IN" as const,
        text: `${i + 1}`, // Show badge 1-N
      })),

      // --- ACT 2: B BIRDS FLY AWAY (starting exactly when 2nd audio segment starts) ---
      ...Array.from({ length: amount }).map((_, index) => {
        const i = total - 1 - index; // rightmost birds fly away
        return {
          targetId: `bird-${i}`,
          startFrame: act2Start + index * 8, 
          action: "FLY_AWAY_ARC" as const,
          endX: 600 + i * 40,
        };
      }),

      // --- WOBBLE FOR REMAINING ---
      ...Array.from({ length: remaining }).map((_, i) => ({
        targetId: `bird-${i}`,
        startFrame: act2Start, 
        action: "WOBBLE" as const,
      })),

      // --- ACT 3: COUNT REMAINING (during 3rd sentence) ---
      ...Array.from({ length: remaining }).map((_, i) => ({
        targetId: `bird-${i}`,
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
