import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { DirectorScene } from "../../types";
import { VerticalGrid, ColumnData, VerticalGridAction } from "../Engines/VerticalGrid";

export const ColumnArithmeticScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();

  // Try to find the equation from any scene in the group
  let eqStr = "";
  for (const scene of groupedScenes) {
    if (scene.equation) {
      eqStr = scene.equation;
      break;
    }
  }

  const match = eqStr.match(/^\s*([\d\.]+)\s*([\+\-*/÷xX])\s*([\d\.]+)(?:\s*=\s*(.*?))?\s*$/);
  
  if (!match) {
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", padding: 40 }}>
        {eqStr && <h3 style={{ color: "#fcd34d", fontSize: 40 }}>{eqStr}</h3>}
      </AbsoluteFill>
    );
  }

  const [_, strOp1, operator, strOp2] = match;

  let num1Str = strOp1;
  let num2Str = strOp2;
  
  // Align decimals by appending .0 and padding zeros to the right
  if (num1Str.includes(".") || num2Str.includes(".")) {
    if (!num1Str.includes(".")) num1Str += ".0";
    if (!num2Str.includes(".")) num2Str += ".0";
    
    const frac1 = num1Str.split(".")[1].length;
    const frac2 = num2Str.split(".")[1].length;
    const maxFrac = Math.max(frac1, frac2);
    
    num1Str = num1Str.padEnd(num1Str.length + (maxFrac - frac1), "0");
    num2Str = num2Str.padEnd(num2Str.length + (maxFrac - frac2), "0");
  }

  const cols: ColumnData[] = [];
  const s1 = num1Str.split("").reverse();
  const s2 = num2Str.split("").reverse();
  const maxLens = Math.max(s1.length, s2.length);

  let carry = 0;
  for (let i = 0; i < maxLens; i++) {
    const d1Str = i < s1.length ? s1[i] : "0";
    const d2Str = i < s2.length ? s2[i] : "0";

    if (d1Str === "." || d2Str === ".") {
      cols.push({
        colIndex: i,
        topDigit: d1Str === "." ? "." : null,
        botDigit: d2Str === "." ? "." : null,
        carryIn: carry,
        carryOut: carry,
        resultDigit: "."
      });
      continue;
    }

    const d1 = parseInt(d1Str, 10);
    const d2 = parseInt(d2Str, 10);
    
    const currCarryIn = carry;
    let colSum = 0;
    
    if (operator === "+") {
      colSum = d1 + d2 + carry;
      carry = Math.floor(colSum / 10);
    } else {
      // Subtraction with borrowing
      colSum = d1 - d2 + carry; // 'carry' acts as 'borrowed 10'
      if (colSum < 0) {
        colSum += 10; 
        carry = -1; // We took a loan from the next column
      } else {
        carry = 0;
      }
    }
    
    cols.push({
      colIndex: i,
      topDigit: i < s1.length ? s1[i] : null,
      botDigit: i < s2.length ? s2[i] : null,
      // For the engine: 
      // Add: carryIn is standard. carryOut is 0.
      // Sub: carryIn means "we received a loan of 10". carryOut means "we gave a loan to the previous col".
      carryIn: operator === "+" ? currCarryIn : (currCarryIn < 0 ? 10 : 0),
      carryOut: operator === "+" ? carry : (carry < 0 ? 1 : 0),
      resultDigit: operator === "+" ? (colSum % 10).toString() : colSum.toString()
    });
  }
  
  if (carry > 0 && operator === "+") {
    cols.push({
      colIndex: maxLens,
      topDigit: null,
      botDigit: null,
      carryIn: carry,
      carryOut: 0,
      resultDigit: carry.toString()
    });
  }

  // Temporal Configuration Mapping
  const localDurations: number[] = [];
  for (const t of timings) {
    localDurations.push(t.dur);
  }

  // Extract physical items from the first scene (if it was tagged as a physical word problem)
  const firstScene = groupedScenes[0];
  const topCount = firstScene?.choreography_total;
  const botCount = firstScene?.choreography_amount;
  const itemType = firstScene?.item_type;

  return (
    <VerticalGrid 
      action={operator === "+" ? "ADD" : "SUBTRACT"}
      operatorStr={operator}
      columns={cols}
      stepDurations={localDurations}
      topCount={topCount}
      botCount={botCount}
      itemType={itemType}
    />
  );
};


