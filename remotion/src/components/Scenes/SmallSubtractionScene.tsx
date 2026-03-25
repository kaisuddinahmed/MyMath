import React from "react";
import { useVideoConfig } from "remotion";
import type { DirectorScene } from "../../types";
import { ObjectArray } from "../Engines/ObjectArray";

export const SmallSubtractionScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();

  // Parse the equation from the first scene (expected "A - B")
  const eqStr = groupedScenes[0]?.equation || "8 - 3";
  const numMatches = eqStr.match(/\d+/g);
  const totalCount = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 8;
  const subtractCount = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 3;
  
  // For the ObjectArray engine:
  // "leftCount" is the number that stays.
  // "rightCount" is the number that fades/falls away.
  const remainCount = totalCount - subtractCount;
  const itemType = groupedScenes[0]?.item_type || "APPLE_SVG";

  // Calculate timelines explicitly
  const totalDuration = timings[0]?.dur || 16 * fps;
  const stepSplit = totalDuration / 4;

  const step1End = stepSplit;        // Pop in
  const step2End = stepSplit * 2;    // Subtracted items fall away
  const step3Dur = remainCount >= 3 ? stepSplit : 2 * fps;
  const step3End = step2End + step3Dur;

  return (
    <ObjectArray
      action="SUBTRACT"
      itemType={itemType}
      leftCount={remainCount}
      rightCount={subtractCount}
      equationStr={`${totalCount} - ${subtractCount} = ${remainCount}`}
      timings={{
        popInEnd: step1End * 0.5,
        actionStart: step1End,
        actionEnd: step2End,
        countStart: step2End + 5,
        equationStart: step3End
      }}
    />
  );
};

