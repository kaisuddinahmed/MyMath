"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmallSubtractionScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const ItemSvgs_1 = require("../../assets/items/ItemSvgs");
const SmallSubtractionScene = ({ groupedScenes, timings }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    // Parse the equation from the first scene (expected "A - B")
    const eqStr = groupedScenes[0]?.equation || "8 - 3";
    const numMatches = eqStr.match(/\d+/g);
    const totalCount = numMatches && numMatches.length >= 1 ? parseInt(numMatches[0], 10) : 8;
    const subtractCount = numMatches && numMatches.length >= 2 ? parseInt(numMatches[1], 10) : 3;
    const remainCount = totalCount - subtractCount;
    const itemType = groupedScenes[0]?.item_type || "APPLE_SVG";
    // Internal 4-step timings derived from the single scene duration
    const totalDuration = timings[0]?.dur || 16 * fps;
    const stepSplit = totalDuration / 4;
    const step1End = stepSplit; // Pop in as one group
    const step2End = stepSplit * 2; // Subtracted items animate away
    const step3Dur = remainCount >= 3 ? stepSplit : 0;
    const step3End = step2End + step3Dur;
    const hasCountingStep = step3Dur > 0;
    // Step 1: All items pop in together as one group
    const step1Pop = (0, remotion_1.spring)({ frame, fps, config: { damping: 12 } });
    // Step 2: Split progress — drives the rightmost items moving right + fading
    const splitProgress = (0, remotion_1.spring)({
        frame: Math.max(0, frame - step1End),
        fps,
        config: { damping: 14 },
    });
    // Step 3: Counting numbers stagger in under REMAINING items only
    const getCountOpacity = (index) => {
        if (!hasCountingStep)
            return 0;
        const staggerFrames = step3Dur / Math.max(1, remainCount);
        const delay = step2End + index * staggerFrames;
        return (0, remotion_1.spring)({ frame: Math.max(0, frame - delay), fps, from: 0, to: 1, durationInFrames: 10 });
    };
    // Step 4: Final equation fades in
    const step4Opacity = (0, remotion_1.spring)({
        frame: Math.max(0, frame - step3End),
        fps,
        from: 0,
        to: 1,
        durationInFrames: 15,
    });
    // Per-item split animation for each subtracted item
    const getItemSplitStyle = (idx) => {
        if (idx < remainCount)
            return {}; // Remaining items just stay in place
        // Subtracted items — slide right and fade out
        const itemSplitOffset = (0, remotion_1.interpolate)(splitProgress, [0, 1], [0, 100 + (idx - remainCount) * 10]);
        const itemFade = (0, remotion_1.interpolate)(splitProgress, [0, 0.7, 1], [1, 0.5, 0.15], { extrapolateRight: "clamp" });
        return {
            transform: `translateX(${itemSplitOffset}px)`,
            opacity: itemFade,
        };
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
        }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 20,
                    transform: `scale(${step1Pop})`,
                }, children: Array.from({ length: totalCount }).map((_, idx) => {
                    const isSubtracted = idx >= remainCount;
                    const countOpacity = getCountOpacity(idx);
                    return ((0, jsx_runtime_1.jsxs)("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                            ...getItemSplitStyle(idx),
                        }, children: [(0, jsx_runtime_1.jsx)("div", { style: { transform: "scale(0.9)" }, children: (0, jsx_runtime_1.jsx)(ItemSvgs_1.ItemComponent, { itemType: itemType }) }), !isSubtracted && ((0, jsx_runtime_1.jsx)("div", { style: {
                                    color: "#fcd34d",
                                    fontSize: 26,
                                    fontWeight: "bold",
                                    opacity: countOpacity,
                                    transform: `translateY(${(0, remotion_1.interpolate)(countOpacity, [0, 1], [10, 0])}px)`,
                                }, children: idx + 1 })), isSubtracted && (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 26, opacity: 0 }, children: "0" })] }, `item-${idx}`));
                }) }), (0, jsx_runtime_1.jsx)("div", { style: {
                    marginTop: 80,
                    opacity: step4Opacity,
                    transform: `translateY(${(0, remotion_1.interpolate)(step4Opacity, [0, 1], [30, 0])}px)`,
                    background: "rgba(239, 68, 68, 0.12)",
                    borderRadius: 20,
                    padding: "20px 60px",
                    border: "2px solid rgba(239, 68, 68, 0.3)",
                }, children: (0, jsx_runtime_1.jsxs)("p", { style: {
                        color: "#fee2e2",
                        fontSize: 60,
                        fontWeight: 800,
                        fontFamily: "'Inter', sans-serif",
                        margin: 0,
                        letterSpacing: 2,
                    }, children: [totalCount, " - ", subtractCount, " = ", remainCount] }) })] }));
};
exports.SmallSubtractionScene = SmallSubtractionScene;
