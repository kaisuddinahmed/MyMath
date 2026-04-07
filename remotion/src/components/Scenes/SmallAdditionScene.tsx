import React from "react";
import { useVideoConfig } from "remotion";
import type { DirectorScene } from "../../types";
import { ObjectArray } from "../Engines/ObjectArray";

export const SmallAdditionScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();

  // Parse the equation from the first scene (expected "A + B")
  const eqStr = groupedScenes[0]?.equation || "4 + 2";
  const numMatches = eqStr.match(/\d+/g);
  const leftCount = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 4;
  const rightCount = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 2;
  const itemType = groupedScenes[0]?.item_type || "APPLE_SVG";

  // Calculate timelines explicitly so we sync with the incoming audio-based timings.
  //
  // Beat layout by narration structure:
  //   3-beat (legacy):  [group1-pop] [group2-pop] [count+eq]
  //   4-beat (abstract):[group1-pop] [group2-pop] [concept+merge] [count+eq]
  //   5-beat (word):    [group1-pop] [group2-pop] [concept] [merge] [count+eq]
  //   6-beat (story):   [setting] [char1-items] [char2-items] [concept] [merge] [count+eq]
  //
  // Visual phases in ObjectArray:
  //   popInEnd     → when group 2 starts appearing (= rightPopDelay)
  //   actionStart  → when gap starts collapsing (merge animation)
  //   countStart   → counting numbers appear
  //   equationStart→ final equation fades in

  const step1End = timings[0]?.dur || 4 * fps;
  const step2End = step1End + (timings[1]?.dur || 4 * fps);

  let leftPopDelay: number = 0;
  let popInEnd: number;
  let operatorStart: number | undefined;
  let actionStart: number;
  let countStart: number;
  let equationStart: number;

  if (timings.length >= 7) {
    // 7-beat story word problem (most detailed):
    // beat 0 = setting  ("Ratul and Mitu have come to Shahid Minar...")
    // beat 1 = group 1  ("Ratul has brought 3 flowers.")           → group 1 pops
    // beat 2 = group 2  ("And Mitu has brought 2 more... total.")  → group 2 pops
    // beat 3 = concept  ("That's why this is an addition problem...") → + sign appears
    // beat 4 = merge    ("Here they come.")                        → gap collapses
    // beat 5 = counting ("Let's count together: 1, 2, 3, 4, 5.")
    // beat 6 = equation ("So A plus B equals total.")
    const b0 = timings[0]?.dur || 4 * fps;
    const b1 = timings[1]?.dur || 4 * fps;
    const b2 = timings[2]?.dur || 4 * fps;
    const b3 = timings[3]?.dur || 4 * fps;
    const b4 = timings[4]?.dur || 4 * fps;
    const b5 = timings[5]?.dur || 4 * fps;
    leftPopDelay  = b0;                            // group 1 starts at beat 1
    popInEnd      = b0 + b1;                       // group 2 starts at beat 2
    operatorStart = b0 + b1 + b2;                  // + sign at beat 3
    actionStart   = b0 + b1 + b2 + b3;            // merge at beat 4
    countStart    = b0 + b1 + b2 + b3 + b4 + 5;  // counting at beat 5
    equationStart = b0 + b1 + b2 + b3 + b4 + b5 + 5; // equation at beat 6
  } else if (timings.length >= 6) {
    // 6-beat story word problem:
    // beat 0 = setting — group 1 pops during this
    // beat 1 = char1's items, beat 2 = char2's items
    // beat 3 = concept, beat 4 = merge, beat 5 = count+eq
    const b0 = timings[0]?.dur || 4 * fps;
    const b1 = timings[1]?.dur || 4 * fps;
    const b2 = timings[2]?.dur || 4 * fps;
    const b3 = timings[3]?.dur || 4 * fps;
    const b4 = timings[4]?.dur || 4 * fps;
    const b5 = timings[5]?.dur || 4 * fps;
    popInEnd      = b0 + b1;
    actionStart   = b0 + b1 + b2 + b3;
    countStart    = b0 + b1 + b2 + b3 + b4 + 5;
    equationStart = b0 + b1 + b2 + b3 + b4 + Math.round(b5 * 0.65);
  } else if (timings.length >= 5) {
    // 5-beat word problem:
    // beats 2+3 = concept + merge, beat 4 = count+eq
    const conceptAndMergeDur = (timings[2]?.dur || 4 * fps) + (timings[3]?.dur || 4 * fps);
    const step3End = step2End + conceptAndMergeDur;
    popInEnd     = step1End * 0.5;
    actionStart  = step1End;
    countStart   = step2End + (timings[2]?.dur || 4 * fps) + 5;
    equationStart = step3End;
  } else if (timings.length >= 4) {
    // 4-beat abstract: beat 2 = concept+merge, beat 3 = count+eq
    const step3End = step2End + (timings[2]?.dur || 4 * fps);
    popInEnd     = step1End * 0.5;
    actionStart  = step1End;
    countStart   = step2End + 5;
    equationStart = step3End;
  } else {
    // 3-beat legacy fallback
    const step3Dur = leftCount + rightCount >= 3 ? 4 * fps : 2 * fps;
    popInEnd     = step1End * 0.5;
    actionStart  = step1End;
    countStart   = step2End + 5;
    equationStart = step2End + step3Dur;
  }

  // Use the final beat's equation (has "A + B = total") for the on-screen reveal
  const finalEqStr = groupedScenes[groupedScenes.length - 1]?.equation || eqStr;

  return (
    <ObjectArray
      action="ADD"
      itemType={itemType}
      leftCount={leftCount}
      rightCount={rightCount}
      equationStr={finalEqStr}
      timings={{
        leftPopDelay,
        popInEnd,
        operatorStart,
        actionStart,
        actionEnd: step2End,
        countStart,
        equationStart,
      }}
    />
  );
};

