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

  // Calculate timelines explicitly so we sync with the incoming audio-based timings
  // Often it's passed as a multi-step group (e.g. 3 or 4 scenes)
  const step1End = timings[0]?.dur || 4 * fps;
  const step2End = step1End + (timings[1]?.dur || 4 * fps);
  
  // Try to find the duration for step 3 (Counting), if provided
  const hasCountingStep = timings.length >= 4;
  const step3Dur = hasCountingStep ? timings[2].dur : (leftCount + rightCount >= 3 ? 4 * fps : 2 * fps);
  const step3End = step2End + step3Dur;

  return (
    <ObjectArray
      action="ADD"
      itemType={itemType}
      leftCount={leftCount}
      rightCount={rightCount}
      equationStr={eqStr}
      timings={{
        popInEnd: step1End * 0.5,
        actionStart: step1End,
        actionEnd: step2End,
        countStart: step2End + 5, // Give a 5 frame buffer
        equationStart: step3End
      }}
    />
  );
};

