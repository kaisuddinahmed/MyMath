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

  // Mode drives the visual timing strategy.
  // Set on each beat by class_1.py; falls back to length-based heuristic for legacy data.
  const mode = groupedScenes[0]?.mode;

  // Use the final beat's equation (has "A + B = total") for the on-screen reveal
  const finalEqStr = groupedScenes[groupedScenes.length - 1]?.equation || eqStr;

  let leftPopDelay: number = 0;
  let popInEnd: number;
  let operatorStart: number | undefined;
  let actionStart: number;
  let countStart: number;
  let equationStart: number;

  // ─────────────────────────────────────────────────────────────
  // STORY MODE  (7 beats)
  //
  // beat 0  setting     "{char1} and {char2} have come to {location}…"
  // beat 1  group 1     "{char1} has brought {n} items."            → group 1 pops
  // beat 2  group 2     "And {char2} has brought {n} more…"         → group 2 pops
  // beat 3  + sign      "That is why this is an addition problem…"  → + appears
  // beat 4  merge       "Here they come."                            → gap collapses
  // beat 5  count       "Let us count together: 1, 2, 3…"
  // beat 6  equation    "So A plus B equals total."
  // ─────────────────────────────────────────────────────────────
  if (mode === "story" || (!mode && timings.length >= 7)) {
    const b0 = timings[0]?.dur || 4 * fps;
    const b1 = timings[1]?.dur || 4 * fps;
    const b2 = timings[2]?.dur || 4 * fps;
    const b3 = timings[3]?.dur || 4 * fps;
    const b4 = timings[4]?.dur || 4 * fps;
    const b5 = timings[5]?.dur || 4 * fps;
    leftPopDelay  = b0;                                    // group 1 pops at beat 1
    popInEnd      = b0 + b1;                               // group 2 pops at beat 2
    operatorStart = b0 + b1 + b2;                          // + sign at beat 3
    actionStart   = b0 + b1 + b2 + b3;                    // merge at beat 4
    countStart    = b0 + b1 + b2 + b3 + b4 + 5;           // count at beat 5
    equationStart = b0 + b1 + b2 + b3 + b4 + b5 + 5;     // equation at beat 6

  // ─────────────────────────────────────────────────────────────
  // JOINING MODE  (5 beats)
  //
  // beat 0  group 1     "Look! Here are {a} items."                 → group 1 pops immediately
  // beat 1  group 2     "And here are {b} more items."              → group 2 pops, + appears
  // beat 2  concept     "We need to find the total…"
  // beat 3  merge       "Let's put them all together. Here they come!"
  // beat 4  count+eq    "Let's count together… So A plus B equals total!"
  // ─────────────────────────────────────────────────────────────
  } else if (mode === "joining" || (!mode && timings.length >= 5)) {
    const b0 = timings[0]?.dur || 4 * fps;
    const b1 = timings[1]?.dur || 4 * fps;
    const b2 = timings[2]?.dur || 4 * fps;
    const b3 = timings[3]?.dur || 4 * fps;
    const b4 = timings[4]?.dur || 4 * fps;
    leftPopDelay  = 0;                                     // group 1 pops at frame 0
    popInEnd      = b0;                                    // group 2 pops at beat 1
    operatorStart = b0;                                    // + sign appears with group 2
    actionStart   = b0 + b1 + b2;                         // merge at beat 3
    countStart    = b0 + b1 + b2 + b3 + 5;               // count at beat 4
    equationStart = b0 + b1 + b2 + b3 + Math.round(b4 * 0.65); // equation mid-beat 4

  // ─────────────────────────────────────────────────────────────
  // ABSTRACT MODE  (4 beats)
  //
  // beat 0  group 1     "Look! {a} blocks here."                    → group 1 pops
  // beat 1  group 2+op  "And {b} more blocks coming!"               → group 2 pops + sign
  // beat 2  merge       "This is an addition problem. Let's put them together!"
  // beat 3  count+eq    "Let's count together… {a} plus {b} equals {total}!"
  // ─────────────────────────────────────────────────────────────
  } else if (mode === "abstract" || (!mode && timings.length >= 4)) {
    const b0 = timings[0]?.dur || 4 * fps;
    const b1 = timings[1]?.dur || 4 * fps;
    const b2 = timings[2]?.dur || 4 * fps;
    const b3 = timings[3]?.dur || 4 * fps;
    leftPopDelay  = 0;                                     // group 1 pops at frame 0
    popInEnd      = b0;                                    // group 2 pops at beat 1
    operatorStart = b0;                                    // + sign with group 2
    actionStart   = b0 + b1;                              // merge at beat 2
    countStart    = b0 + b1 + b2 + 5;                    // count at beat 3
    equationStart = b0 + b1 + b2 + Math.round(b3 * 0.65); // equation mid-beat 3

  } else {
    // ─────────────────────────────────────────────────────────────
    // LEGACY 3-BEAT FALLBACK
    // ─────────────────────────────────────────────────────────────
    const step1End = timings[0]?.dur || 4 * fps;
    const step2End = step1End + (timings[1]?.dur || 4 * fps);
    const step3Dur = leftCount + rightCount >= 3 ? 4 * fps : 2 * fps;
    leftPopDelay  = 0;
    popInEnd      = step1End * 0.5;
    actionStart   = step1End;
    countStart    = step2End + 5;
    equationStart = step2End + step3Dur;
  }

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
        actionEnd: (timings[1]?.start ?? 0) + (timings[1]?.dur ?? 4 * fps),
        countStart,
        equationStart,
      }}
    />
  );
};
