import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, interpolate, Easing } from "remotion";
import type { DirectorScene } from "../../types";

export const ColumnArithmeticScene: React.FC<{
  groupedScenes: DirectorScene[];
  timings: { scene: DirectorScene; start: number; dur: number }[];
}> = ({ groupedScenes, timings }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

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

  interface ColumnData {
    colIndex: number;      
    topDigit: string | null;
    botDigit: string | null;
    carryIn: number;       
    carryOut: number;      
    resultDigit: string;
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
      colSum = d1 - d2 - carry;
      if (colSum < 0) {
        colSum += 10; // borrow from next column
        carry = 1;
      } else {
        carry = 0;
      }
    }
    
    cols.push({
      colIndex: i,
      topDigit: i < s1.length ? s1[i] : null,
      botDigit: i < s2.length ? s2[i] : null,
      carryIn: currCarryIn,
      carryOut: carry,
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

  // Temporal Configuration
  const setupEndFrame = timings[0]?.dur || 3 * fps;
  const totalDuration = timings.reduce((acc: number, t: {dur: number}) => acc + t.dur, 0);
  const lastSceneDur = timings[timings.length - 1]?.dur || 3 * fps;
  const outroStartFrame = Math.max(setupEndFrame + 1, totalDuration - lastSceneDur);
  
  const calcStart = setupEndFrame;
  const calcDuration = Math.max(1, outroStartFrame - setupEndFrame);
  const colDuration = calcDuration / cols.length;

  // Cell size
  const CELL = 80;
  const FONT = 72;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" }}>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: `40px repeat(${cols.length}, ${CELL}px)`, 
        gridTemplateRows: "50px 80px 80px 80px",
        gap: '4px 0', 
        fontSize: FONT, 
        fontFamily: "'Courier New', Courier, monospace", 
        fontWeight: 700,
        textAlign: "center",
        color: "white",
        position: "relative"
      }}>
        
        {/* Dynamic Column Highlight Box */}
        {cols.map((c, idx) => {
           const colStart = calcStart + (idx * colDuration);
           const colEnd = colStart + colDuration;
           const isHighlight = frame >= colStart && frame < colEnd;
           const highlightOpacity = isHighlight 
             ? spring({frame: frame - colStart, fps, config: {damping: 15}}) 
             : (frame >= colEnd ? Math.max(0, 1 - (frame - colEnd) / 10) : 0);
           
           return (
             <div key={`hl-${c.colIndex}`} style={{
               position: "absolute",
               bottom: 0, top: 0,
               width: CELL,
               right: idx * CELL,
               backgroundColor: "rgba(99, 102, 241, 0.12)",
               borderRadius: 12,
               opacity: highlightOpacity,
               pointerEvents: "none"
             }} />
           );
        })}

        {/* Row 0: Carry Row */}
        <div style={{gridColumn: 1, gridRow: 1}}></div>
        {cols.map(c => {
           const colStart = calcStart + ((c.colIndex - 1) * colDuration);
           const appearFrame = colStart + (colDuration * 0.6);
           const s = spring({ frame: Math.max(0, frame - appearFrame), fps, config: { damping: 12 } });
           
           return (
             <div key={`carry-${c.colIndex}`} style={{
               gridColumn: cols.length - c.colIndex + 1, 
               gridRow: 1, 
               fontSize: 36,
               color: "#f87171",
               fontWeight: 600,
               opacity: c.carryIn > 0 ? s : 0,
               transform: `translateY(${16 * (1 - s)}px)`
             }}>
               {c.carryIn > 0 ? c.carryIn : ""}
             </div>
           );
        })}

        {/* Row 1: Top Number — always visible */}
        <div style={{gridColumn: 1, gridRow: 2}}></div>
        {cols.map(c => (
          <div key={`top-${c.colIndex}`} style={{
            gridColumn: cols.length - c.colIndex + 1, 
            gridRow: 2,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {c.topDigit || ""}
          </div>
        ))}

        {/* Row 2: Operator & Bottom Number — always visible, right-aligned */}
        <div style={{
            gridColumn: 1, 
            gridRow: 3, 
            borderBottom: "4px solid rgba(255,255,255,0.6)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            color: "#94a3b8",
            fontSize: FONT * 0.7,
            paddingBottom: 8,
        }}>
          {operator}
        </div>
        {cols.map(c => (
          <div key={`bot-${c.colIndex}`} style={{
              gridColumn: cols.length - c.colIndex + 1, 
              gridRow: 3, 
              borderBottom: "4px solid rgba(255,255,255,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              paddingBottom: 8,
          }}>
            {c.botDigit || ""}
          </div>
        ))}

        {/* Row 3: Result — appears column-by-column during calculation */}
        <div style={{gridColumn: 1, gridRow: 4}}></div>
        {cols.map(c => {
            const colStart = calcStart + (c.colIndex * colDuration);
            const appearFrame = colStart + (colDuration * 0.4);
            const s = spring({ frame: Math.max(0, frame - appearFrame), fps, config: { damping: 14 } });
            
            // Extra carry column: reveal during outro
            const isExtraCol = c.topDigit === null && c.botDigit === null;
            const isOutro = frame >= outroStartFrame;
            const revealOpacity = isExtraCol 
              ? (isOutro ? spring({frame: frame - outroStartFrame, fps}) : 0)
              : s;

            return (
              <div key={`res-${c.colIndex}`} style={{
                gridColumn: cols.length - c.colIndex + 1, 
                gridRow: 4, 
                color: "#fcd34d",
                paddingTop: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: revealOpacity,
                transform: `translateY(${20 * (1 - revealOpacity)}px)`
              }}>
                {c.resultDigit}
              </div>
            );
        })}

      </div>
    </AbsoluteFill>
  );
};

