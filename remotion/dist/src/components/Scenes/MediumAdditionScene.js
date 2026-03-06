"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediumAdditionScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
/**
 * MediumAdditionScene — "Make 10" / "Split Tens" for sums 11–20.
 *
 * Two sub-strategies handled automatically:
 *
 * Case A — both numbers ≤ 10 (e.g. 9 + 4):
 *   Make 10: larger is the "base" in a ten-frame, smaller splits to fill the gap.
 *   9 needs 1 → split 4 into (1 + 3) → 9+1=10 → 10+3=13
 *
 * Case B — one number > 10 (e.g. 12 + 4, or 6 + 12):
 *   Split tens: larger is split into 10 + ones, add smaller to ones.
 *   12 = 10+2, 2+4=6 → 10+6=16
 */
const BLOCK_SIZE = 44;
const BLOCK_GAP = 6;
const BLOCK_RADIUS = 8;
const Block = ({ color, opacity = 1, scale = 1, }) => ((0, jsx_runtime_1.jsx)("div", { style: {
        width: BLOCK_SIZE, height: BLOCK_SIZE, borderRadius: BLOCK_RADIUS,
        backgroundColor: color, opacity, transform: `scale(${scale})`,
        border: "2px solid rgba(255,255,255,0.15)", flexShrink: 0,
    } }));
const EmptySlot = ({ filled = false, fillColor = "#6366f1", fillScale = 1, }) => ((0, jsx_runtime_1.jsxs)("div", { style: { position: "relative", width: BLOCK_SIZE, height: BLOCK_SIZE, flexShrink: 0 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                position: "absolute", inset: 0, borderRadius: BLOCK_RADIUS,
                border: "2px dashed rgba(255,255,255,0.22)",
                backgroundColor: "rgba(255,255,255,0.03)",
            } }), filled && ((0, jsx_runtime_1.jsx)("div", { style: {
                position: "absolute", inset: 0, borderRadius: BLOCK_RADIUS,
                backgroundColor: fillColor, transform: `scale(${fillScale})`,
                border: "2px solid rgba(255,255,255,0.15)",
            } }))] }));
const MediumAdditionScene = ({ groupedScenes, timings }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    // Parse equation "A + B" — always normalise so bigNum >= smallNum
    const eqStr = groupedScenes[0]?.equation || "9 + 4";
    const numMatches = eqStr.match(/\d+/g);
    const raw1 = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 9;
    const raw2 = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 4;
    const bigNum = Math.max(raw1, raw2);
    const smallNum = Math.min(raw1, raw2);
    const total = bigNum + smallNum;
    // Decide strategy
    const useSplitTens = bigNum > 10; // Case B: one number already > 10
    //   Case A: Make 10 (bigNum ≤ 10)
    // --- Case A: Make 10 ---
    const gapA = 10 - bigNum; // blocks needed to complete 10
    const remainderA = smallNum - gapA; // what's left of smallNum after bridging
    // --- Case B: Split Tens ---
    const onesB = bigNum - 10; // ones digit of the larger number (e.g. 12 → 2)
    const sumOnesB = onesB + smallNum; // ones sum: e.g. 2 + 4 = 6   → 10 + 6 = 16
    // Colors
    const colorBig = "#6366f1"; // indigo — base / tens frame
    const colorSmall = "#10b981"; // emerald — small group
    const colorBridge = "#f59e0b"; // amber — the bridging blocks
    // Timings
    const totalDur = timings[0]?.dur || 20 * fps;
    const step = totalDur / 4;
    const step1End = step;
    const step2End = step * 2;
    const step3End = step * 3;
    const popIn = (0, remotion_1.spring)({ frame, fps, config: { damping: 12 } });
    const step2Progress = (0, remotion_1.spring)({ frame: Math.max(0, frame - step1End), fps, config: { damping: 14 } });
    const step3Progress = (0, remotion_1.spring)({ frame: Math.max(0, frame - step2End), fps, config: { damping: 14 } });
    const eqOpacity = (0, remotion_1.spring)({ frame: Math.max(0, frame - step3End), fps, from: 0, to: 1, durationInFrames: 12 });
    // Ten-frame slots for Case A
    const tenFrameSlotsA = Array.from({ length: 10 }, (_, i) => {
        if (i < bigNum)
            return { type: "filled" };
        const slotIdx = i - bigNum;
        if (slotIdx < gapA) {
            const delay = step1End + (slotIdx / Math.max(1, gapA)) * step;
            const fillProg = (0, remotion_1.spring)({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
            return { type: "empty", filled: fillProg > 0.05, fillScale: fillProg };
        }
        return { type: "empty", filled: false };
    });
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: "100%", gap: 28,
        }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 24, transform: `scale(${popIn})` }, children: useSplitTens ? (
                /* ── CASE B: Split Tens (e.g. 12 + 4 = 16) ── */
                (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { color: "rgba(255,255,255,0.5)", fontSize: 16, fontFamily: "'Inter',sans-serif" }, children: ["Split ", bigNum, " = 10 + ", onesB] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                display: "flex", flexDirection: "row", gap: BLOCK_GAP,
                                                border: "2px solid rgba(99,102,241,0.4)", borderRadius: 10, padding: 6,
                                            }, children: Array.from({ length: 10 }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: colorBig }, `ten-${i}`))) }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP }, children: Array.from({ length: onesB }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: colorBig, opacity: 0.65 }, `ones-${i}`))) })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { color: "rgba(255,255,255,0.5)", fontSize: 16, fontFamily: "'Inter',sans-serif" }, children: ["Add ", smallNum] }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP }, children: Array.from({ length: smallNum }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: colorSmall }, `sm-${i}`))) })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                opacity: (0, remotion_1.interpolate)(step2Progress, [0.3, 1], [0, 1], { extrapolateRight: "clamp" }),
                                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                            }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { color: colorBridge, fontSize: 18, fontWeight: 700, fontFamily: "'Inter',sans-serif" }, children: [onesB, " + ", smallNum, " = ", sumOnesB, ", so 10 + ", sumOnesB, " = ", total] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                display: "flex", flexDirection: "row", gap: BLOCK_GAP,
                                                border: "2px solid #10b981", borderRadius: 10, padding: 6,
                                            }, children: Array.from({ length: 10 }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: colorBig }, `res-ten-${i}`))) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 36, color: "#10b981", fontWeight: 800 }, children: "+" }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP }, children: Array.from({ length: sumOnesB }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: i < onesB ? colorBig : colorSmall, opacity: 0.9 }, `res-ones-${i}`))) })] })] })] })) : (
                /* ── CASE A: Make 10 (e.g. 9 + 4 = 13) ── */
                (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { color: "rgba(255,255,255,0.5)", fontSize: 16, fontFamily: "'Inter',sans-serif" }, children: ["Make 10 from ", bigNum] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP }, children: tenFrameSlotsA.map((slot, i) => slot.type === "filled" ? ((0, jsx_runtime_1.jsx)(Block, { color: colorBig }, `tf-${i}`)) : ((0, jsx_runtime_1.jsx)(EmptySlot, { filled: slot.filled, fillColor: colorBridge, fillScale: slot.fillScale ?? 1 }, `tf-${i}`))) }), (0, jsx_runtime_1.jsxs)("span", { style: {
                                                opacity: step2Progress, color: colorBridge, fontSize: 18,
                                                fontWeight: 700, fontFamily: "'Inter',sans-serif",
                                            }, children: ["needs ", gapA, " \u2192"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { color: "rgba(255,255,255,0.5)", fontSize: 16, fontFamily: "'Inter',sans-serif" }, children: ["Split ", smallNum, " \u2192 ", gapA, " + ", remainderA] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP, alignItems: "center" }, children: [Array.from({ length: gapA }).map((_, i) => {
                                            const delay = step1End + (i / Math.max(1, gapA)) * step;
                                            const bridgeProg = (0, remotion_1.spring)({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
                                            return ((0, jsx_runtime_1.jsx)(Block, { color: colorBridge, opacity: (0, remotion_1.interpolate)(bridgeProg, [0, 1], [1, 0.05], { extrapolateRight: "clamp" }), scale: (0, remotion_1.interpolate)(bridgeProg, [0, 1], [1, 0.3], { extrapolateRight: "clamp" }) }, `bridge-${i}`));
                                        }), remainderA > 0 && (0, jsx_runtime_1.jsx)("div", { style: { width: 2, height: BLOCK_SIZE, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2 } }), Array.from({ length: remainderA }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: colorSmall }, `rem-${i}`)))] })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                opacity: (0, remotion_1.interpolate)(step3Progress, [0.2, 1], [0, 1], { extrapolateRight: "clamp" }),
                                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                            }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { color: colorBridge, fontSize: 18, fontWeight: 700, fontFamily: "'Inter',sans-serif" }, children: ["10 + ", remainderA, " = ", total] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                display: "flex", flexDirection: "row", gap: BLOCK_GAP,
                                                border: "2px solid #10b981", borderRadius: 10, padding: 6,
                                            }, children: Array.from({ length: 10 }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: i < bigNum ? colorBig : colorBridge }, `full-${i}`))) }), remainderA > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 36, color: "#10b981", fontWeight: 800 }, children: "+" }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP }, children: Array.from({ length: remainderA }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: colorSmall }, `rem2-${i}`))) })] }))] })] })] })) }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    opacity: eqOpacity,
                    transform: `translateY(${(0, remotion_1.interpolate)(eqOpacity, [0, 1], [24, 0])}px)`,
                    background: "rgba(99,102,241,0.12)", borderRadius: 20,
                    padding: "16px 52px", border: "2px solid rgba(99,102,241,0.35)",
                }, children: [(0, jsx_runtime_1.jsxs)("p", { style: {
                            color: "#E0E7FF", fontSize: 54, fontWeight: 800,
                            fontFamily: "'Inter', sans-serif", margin: 0, letterSpacing: 2,
                        }, children: [raw1, " + ", raw2, " = ", total] }), (0, jsx_runtime_1.jsx)("p", { style: {
                            color: "rgba(255,255,255,0.4)", fontSize: 20,
                            fontFamily: "'Inter', sans-serif", margin: "4px 0 0", textAlign: "center",
                        }, children: useSplitTens ? `10 + ${sumOnesB} = ${total}` : `10 + ${remainderA} = ${total}` })] })] }));
};
exports.MediumAdditionScene = MediumAdditionScene;
