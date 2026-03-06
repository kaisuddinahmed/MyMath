"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediumSubtractionScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
/**
 * MediumSubtractionScene — "Break Through 10" (Approach 1: Split Minuend)
 *
 * Example: 13 - 4 = 9
 *   ones = 13 - 10 = 3
 *
 * Animation steps:
 *   Step 1: Show 13 = [10-frame full] + [3 ones blocks]
 *   Step 2: "Subtract B from the 10" → remove 4 blocks from ten-frame → 6 remain
 *   Step 3: Combine (10 - B) + ones: 6 + 3 = 9, blocks slide together
 *   Step 4: Final equation
 */
const BLOCK_SIZE = 52;
const BLOCK_GAP = 8;
const BLOCK_RADIUS = 10;
const Block = ({ color, opacity = 1, scale = 1, }) => ((0, jsx_runtime_1.jsx)("div", { style: {
        width: BLOCK_SIZE, height: BLOCK_SIZE, borderRadius: BLOCK_RADIUS,
        backgroundColor: color, opacity, transform: `scale(${scale})`,
        border: "2px solid rgba(255,255,255,0.15)", flexShrink: 0,
    } }));
const MediumSubtractionScene = ({ groupedScenes, timings }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    // Parse equation "A - B"
    const eqStr = groupedScenes[0]?.equation || "13 - 4";
    const numMatches = eqStr.match(/\d+/g);
    const A = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 13;
    const B = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 4;
    const result = A - B;
    // Split minuend: A = 10 + ones
    const ones = A - 10; // e.g. 13 - 10 = 3
    const tenAfterSub = 10 - B; // e.g. 10 - 4 = 6  (blocks left in ten-frame)
    // Colors
    const colorTen = "#6366f1"; // indigo — ten-frame blocks
    const colorOnes = "#10b981"; // emerald — the ones blocks
    const colorRemoved = "#ef4444"; // red — blocks being removed from ten-frame
    // Internal 4-step timings
    const totalDur = timings[0]?.dur || 20 * fps;
    const step = totalDur / 4;
    const step1End = step;
    const step2End = step * 2;
    const step3End = step * 3;
    // Step 1: pop in
    const popIn = (0, remotion_1.spring)({ frame, fps, config: { damping: 12 } });
    // Step 2: removal animation
    const removeProgress = (0, remotion_1.spring)({
        frame: Math.max(0, frame - step1End),
        fps, config: { damping: 14 },
    });
    // Step 3: merge (10-B) blocks + ones blocks slide together
    const mergeProgress = (0, remotion_1.spring)({
        frame: Math.max(0, frame - step2End),
        fps, config: { damping: 14 },
    });
    // Step 4: final equation
    const eqOpacity = (0, remotion_1.spring)({
        frame: Math.max(0, frame - step3End),
        fps, from: 0, to: 1, durationInFrames: 12,
    });
    // Per-block removal: stagger each removed block
    const getRemovedBlockStyle = (idx) => {
        const delay = step1End + (idx / Math.max(1, B)) * step;
        const prog = (0, remotion_1.spring)({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
        return {
            opacity: (0, remotion_1.interpolate)(prog, [0, 1], [1, 0], { extrapolateRight: "clamp" }),
            scale: (0, remotion_1.interpolate)(prog, [0, 1], [1, 0.2], { extrapolateRight: "clamp" }),
        };
    };
    // Gap between remaining ten-frame blocks and ones blocks closes on merge
    const mergeGap = (0, remotion_1.interpolate)(mergeProgress, [0, 1], [60, 0]);
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: "100%", gap: 32,
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 28, transform: `scale(${popIn})` }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { color: "rgba(255,255,255,0.5)", fontSize: 18, fontFamily: "'Inter', sans-serif" }, children: ["Split ", A, " = 10 + ", ones] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP }, children: [Array.from({ length: tenAfterSub }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: colorTen }, `stay-${i}`))), Array.from({ length: B }).map((_, i) => {
                                        const s = getRemovedBlockStyle(i);
                                        return (0, jsx_runtime_1.jsx)(Block, { color: colorRemoved, opacity: s.opacity, scale: s.scale }, `remove-${i}`);
                                    })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                    opacity: removeProgress,
                                    color: colorRemoved, fontSize: 20, fontWeight: 700,
                                    fontFamily: "'Inter', sans-serif",
                                }, children: ["10 \u2212 ", B, " = ", tenAfterSub] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { color: "rgba(255,255,255,0.5)", fontSize: 18, fontFamily: "'Inter', sans-serif" }, children: ["Plus the ", ones, " left over"] }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP }, children: Array.from({ length: ones }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: colorOnes }, `ones-${i}`))) })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                            opacity: (0, remotion_1.interpolate)(mergeProgress, [0.2, 1], [0, 1], { extrapolateRight: "clamp" }),
                            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { color: "rgba(255,255,255,0.5)", fontSize: 18, fontFamily: "'Inter', sans-serif" }, children: [tenAfterSub, " + ", ones, " = ", result] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP, alignItems: "center" }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP }, children: Array.from({ length: tenAfterSub }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: colorTen }, `merged-ten-${i}`))) }), (0, jsx_runtime_1.jsx)("div", { style: { width: mergeGap, flexShrink: 0, transition: "width 0.3s" } }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "row", gap: BLOCK_GAP }, children: Array.from({ length: ones }).map((_, i) => ((0, jsx_runtime_1.jsx)(Block, { color: colorOnes }, `merged-ones-${i}`))) })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    opacity: eqOpacity,
                    transform: `translateY(${(0, remotion_1.interpolate)(eqOpacity, [0, 1], [24, 0])}px)`,
                    background: "rgba(239, 68, 68, 0.12)",
                    borderRadius: 20, padding: "18px 56px",
                    border: "2px solid rgba(239, 68, 68, 0.35)",
                }, children: [(0, jsx_runtime_1.jsxs)("p", { style: {
                            color: "#fee2e2", fontSize: 58, fontWeight: 800,
                            fontFamily: "'Inter', sans-serif", margin: 0, letterSpacing: 2,
                        }, children: [A, " \u2212 ", B, " = ", result] }), (0, jsx_runtime_1.jsxs)("p", { style: {
                            color: "rgba(255,255,255,0.5)", fontSize: 22,
                            fontFamily: "'Inter', sans-serif", margin: "6px 0 0", textAlign: "center",
                        }, children: ["(10 \u2212 ", B, ") + ", ones, " = ", result] })] })] }));
};
exports.MediumSubtractionScene = MediumSubtractionScene;
