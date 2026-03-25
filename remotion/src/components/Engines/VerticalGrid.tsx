import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, interpolate, Easing } from "remotion";

export type VerticalGridAction = "ADD" | "SUBTRACT" | "MULTIPLY";

export interface ColumnData {
  colIndex: number;
  topDigit: string | null;
  botDigit: string | null;
  carryIn: number;
  carryOut: number;
  resultDigit: string;
}

export interface VerticalGridProps {
  action: VerticalGridAction;
  operatorStr: string;
  columns: ColumnData[];
  /** Array of durations (in frames) for each mathematical step. 
   * [0] = Setup 
   * [1] = Ones column
   * [2] = Tens column
   * ... 
   */
  stepDurations: number[];
}

export const VerticalGrid: React.FC<VerticalGridProps> = ({
  action,
  operatorStr,
  columns,
  stepDurations,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Cell dimensions
  const CELL = 100;
  const FONT = 84;

  // Calculate starts based on durations
  const stepStarts: number[] = [];
  let currentStart = 0;
  for (const dur of stepDurations) {
    stepStarts.push(currentStart);
    currentStart += dur;
  }
  const totalDuration = currentStart;

  const getColStart = (idx: number) => {
    if (idx < 0) return 0;
    const tIdx = idx + 1; // 0 is setup, 1 is col 0 (ones)
    if (tIdx < stepStarts.length) return stepStarts[tIdx];
    return stepStarts[stepStarts.length - 1] + (idx * 3 * fps); // Fallback if missing
  };

  const getColDur = (idx: number) => {
    const tIdx = idx + 1;
    if (tIdx < stepDurations.length) return stepDurations[tIdx];
    return 3 * fps;
  };

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: `60px repeat(${columns.length}, ${CELL}px)`,
        gridTemplateRows: "60px 100px 100px 100px",
        gap: '4px 0',
        fontSize: FONT,
        fontFamily: "'Courier New', Courier, monospace", // Monospace crucial for math grids
        fontWeight: 800,
        textAlign: "center",
        color: "white",
        position: "relative"
      }}>
        
        {/* Dynamic Column Highlight Box */}
        {columns.map((c, idx) => {
           const colStart = getColStart(idx);
           const colDur = getColDur(idx);
           const colEnd = colStart + colDur;
           const isHighlight = frame >= colStart && frame < colEnd;
           
           // Highlight fades out gracefully
           const highlightOpacity = isHighlight 
             ? spring({frame: frame - colStart, fps, config: {damping: 15}}) 
             : (frame >= colEnd ? Math.max(0, 1 - (frame - colEnd) / 10) : 0);
           
           return (
             <div key={`hl-${c.colIndex}`} style={{
               position: "absolute",
               bottom: 0, top: 0,
               width: CELL,
               right: idx * CELL,
               backgroundColor: "rgba(99, 102, 241, 0.15)", // Indigo glow
               borderRadius: 16,
               opacity: highlightOpacity,
               pointerEvents: "none",
               boxShadow: "0 0 20px rgba(99, 102, 241, 0.2) inset"
             }} />
           );
        })}

        {/* Row 0: Carry / Borrow Fly-in Row */}
        <div style={{gridColumn: 1, gridRow: 1}}></div>
        {columns.map(c => {
           let showValue: string | number = "";
           let opacityAnim = 0;
           let transformY = 0;
           let transformX = 0;
           let scaleVal = 1;
           
           if (action === "ADD") {
             // In Addition, carry flies UP from the result row of the previous column
             const prevColStart = getColStart(c.colIndex - 1);
             const prevColDur = getColDur(c.colIndex - 1);
             const appearFrame = prevColStart + (prevColDur * 0.7); // Appears at the end of previous col
             
             const s = spring({ frame: Math.max(0, frame - appearFrame), fps, config: { damping: 14 } });
             
             showValue = c.carryIn > 0 ? c.carryIn : "";
             opacityAnim = c.carryIn > 0 ? s : 0;
             // Flies UP from bottom right
             transformY = interpolate(s, [0, 1], [300, 0]);
             transformX = interpolate(s, [0, 1], [CELL, 0]); 
             
           } else if (action === "SUBTRACT") {
             // In Subtraction, borrow happens early. We change the top number.
             if (c.carryIn > 0) {
               // This means we borrowed FROM this column. Wait, no.
               // carryIn > 0 means the current column received a loan. 
               // carryOut > 0 means the current column gave a loan.
               // Let's re-align. If c.carryIn > 0, it means it was added +10. 
               // If c.carryOut > 0, it means this column was reduced by 1.
               
               const myColStart = getColStart(c.colIndex);
               const myColDur = getColDur(c.colIndex);
               // The loan happens right at the start of evaluating this column
               const isMyTurnForBorrow = frame >= (myColStart + (myColDur * 0.2));
               
               const s = spring({ frame: Math.max(0, frame - (myColStart + myColDur * 0.2)), fps, config: { damping: 14 } });
               
               // The number shown at the top is the new modified digit
               const topVal = c.topDigit === null || c.topDigit === "." ? 0 : parseInt(c.topDigit);
               
               // If we received a loan, we don't show it in the top row, we show a little '1' prefixed to the main number below.
               // If we GAVE a loan (carryOut > 0), we show the reduced number here!
               if (c.carryOut > 0) {
                 showValue = topVal - 1; // It gave a loan
                 opacityAnim = s;
                 transformY = interpolate(s, [0, 1], [30, 0]);
                 scaleVal = s;
               }
             }
           }
           
           return (
             <div key={`carry-${c.colIndex}`} style={{
               gridColumn: columns.length - c.colIndex + 1, 
               gridRow: 1, 
               fontSize: 48,
               color: "#F87171", // Red styling for carries/borrows
               fontWeight: 600,
               opacity: opacityAnim,
               transform: `translate(${transformX}px, ${transformY}px) scale(${scaleVal})`,
               display: "flex", alignItems: "center", justifyContent: "center"
             }}>
               {showValue}
             </div>
           );
        })}

        {/* Row 1: Top Number */}
        <div style={{gridColumn: 1, gridRow: 2}}></div>
        {columns.map(c => {
          let hasPrefix1 = false;
          let prefix1Opacity = 0;
          let hasStrikethrough = false;
          let strikeScale = 0;
          let strikeColor = "#EF4444";

          if (action === "SUBTRACT") {
            // Case 1: We receive a loan (carryIn > 0). The '1' flies in from the left neighbor.
            if (c.carryIn > 0 && c.topDigit !== "." && c.topDigit !== null) {
              hasPrefix1 = true;
              const myColStart = getColStart(c.colIndex);
              const appearFrame = myColStart + 5; // Appears very quickly
              prefix1Opacity = spring({ frame: Math.max(0, frame - appearFrame), fps, config: { damping: 14 } });
            }
            // Case 2: We gave a loan (carryOut > 0). Strike through the original digit.
            if (c.carryOut > 0 && c.topDigit !== "." && c.topDigit !== null) {
              hasStrikethrough = true;
              const rightNeighborColStart = getColStart(c.colIndex - 1); // We strike it when the right neighbor evaluates
              const appearFrame = rightNeighborColStart + 5;
              strikeScale = spring({ frame: Math.max(0, frame - appearFrame), fps, config: { damping: 14 } });
            }
          }

          return (
            <div key={`top-${c.colIndex}`} style={{
              gridColumn: columns.length - c.colIndex + 1, 
              gridRow: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative"
            }}>
              {c.topDigit || ""}
              {/* Borrowed '1' Prefix */}
              {hasPrefix1 && (
                <span style={{
                   position: "absolute",
                   left: -15, // Hugging the left side of the digit
                   top: -15, // Slightly elevated
                   fontSize: 52,
                   color: "#FCD34D", // Yellow for received loans
                   opacity: prefix1Opacity,
                   transform: `scale(${interpolate(prefix1Opacity, [0, 1], [2, 1])})`,
                   pointerEvents: "none"
                }}>1</span>
              )}
              {/* Strike-through for given loan */}
              {hasStrikethrough && (
                <div style={{
                   position: "absolute",
                   height: 6,
                   backgroundColor: strikeColor,
                   top: "50%",
                   left: "10%",
                   width: "80%",
                   transform: `translateY(-50%) scaleX(${strikeScale}) rotate(-10deg)`, // Added a dynamic angle
                   transformOrigin: "left center",
                   borderRadius: 3,
                   pointerEvents: "none"
                }} />
              )}
            </div>
          );
        })}

        {/* Row 2: Operator & Bottom Number */}
        <div style={{
            gridColumn: 1, 
            gridRow: 3, 
            borderBottom: "6px solid rgba(255,255,255,0.8)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            color: action === "ADD" ? "#10B981" : "#EF4444",
            fontSize: FONT * 0.8,
            paddingBottom: 8,
        }}>
          {operatorStr}
        </div>
        {columns.map(c => (
          <div key={`bot-${c.colIndex}`} style={{
              gridColumn: columns.length - c.colIndex + 1, 
              gridRow: 3, 
              borderBottom: "6px solid rgba(255,255,255,0.8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              paddingBottom: 8,
          }}>
            {c.botDigit || ""}
          </div>
        ))}

        {/* Row 3: Result Line */}
        <div style={{gridColumn: 1, gridRow: 4}}></div>
        {columns.map(c => {
            const colStart = getColStart(c.colIndex);
            const colDur = getColDur(c.colIndex);
            
            // Result pops in midway through the column's duration
            const appearFrame = colStart + (colDur * 0.4);
            const s = spring({ frame: Math.max(0, frame - appearFrame), fps, config: { damping: 10, stiffness: 120 } });
            
            // For the extra carrying column on the far left, it shouldn't pop until the end
            const isExtraCol = c.topDigit === null && c.botDigit === null;
            const revealOpacity = isExtraCol 
              ? spring({ frame: Math.max(0, frame - (getColStart(c.colIndex - 1) + getColDur(c.colIndex - 1))), fps })
              : s;

            return (
              <div key={`res-${c.colIndex}`} style={{
                gridColumn: columns.length - c.colIndex + 1, 
                gridRow: 4, 
                color: "#FCD34D", // Gold answer
                paddingTop: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: revealOpacity,
                // Pop slightly upward and settle
                transform: `translateY(${interpolate(revealOpacity, [0, 1], [40, 0])}px) scale(${interpolate(revealOpacity, [0, 0.5, 1], [0.5, 1.2, 1])})`
              }}>
                {c.resultDigit}
              </div>
            );
        })}

      </div>
    </AbsoluteFill>
  );
};
