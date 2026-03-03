"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmallSubtractionScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const ItemSvgs_1 = require("../../assets/items/ItemSvgs");
function ItemComponent({ itemType, size = 56 }) {
    switch (itemType) {
        case "APPLE_SVG": return (0, jsx_runtime_1.jsx)(ItemSvgs_1.AppleSvg, { size: size });
        case "BIRD_SVG": return (0, jsx_runtime_1.jsx)(ItemSvgs_1.BirdSvg, { size: size });
        case "BLOCK_SVG": return (0, jsx_runtime_1.jsx)(ItemSvgs_1.BlockSvg, { size: size });
        default: return (0, jsx_runtime_1.jsx)(ItemSvgs_1.CounterSvg, { size: size });
    }
}
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
    // Calculate timing boundaries dynamically based on the number of provided scenes
    const hasCountingStep = timings.length >= 4;
    const step1End = timings[0]?.dur || 4 * fps;
    const step2End = step1End + (timings[1]?.dur || 4 * fps);
    // If counting step exists, step3End uses its duration. Otherwise, step3End is just step2End.
    const step3Dur = hasCountingStep ? timings[2].dur : 0;
    const step3End = step2End + step3Dur;
    // Layout interpolations
    // Step 1: Items pop in altogether
    const step1Pop = (0, remotion_1.spring)({ frame, fps, config: { damping: 12 } });
    // Step 2: The subtracted items slide away to the right and fade out
    const splitProgress = (0, remotion_1.spring)({
        frame: Math.max(0, frame - step1End),
        fps,
        config: { damping: 14 }
    });
    const gap = (0, remotion_1.interpolate)(splitProgress, [0, 1], [10, 150]);
    const minusOpacity = (0, remotion_1.interpolate)(splitProgress, [0, 0.5, 1], [0, 1, 1], { extrapolateRight: "clamp" });
    const takeAwayOpacity = (0, remotion_1.interpolate)(splitProgress, [0, 0.8, 1], [1, 0.4, 0.1], { extrapolateRight: "clamp" });
    // Step 3 (Optional): Counting numbers appear ONLY under the remaining items
    const getCountOpacity = (index) => {
        if (!hasCountingStep)
            return 0;
        const staggerFrames = step3Dur / Math.max(1, remainCount);
        const delay = step2End + (index * staggerFrames);
        return (0, remotion_1.spring)({
            frame: Math.max(0, frame - delay),
            fps,
            from: 0,
            to: 1,
            durationInFrames: 10
        });
    };
    // Step 4: Final equation fades in
    const step4Opacity = (0, remotion_1.spring)({
        frame: Math.max(0, frame - step3End),
        fps,
        from: 0,
        to: 1,
        durationInFrames: 15
    });
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            paddingTop: 80,
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: gap }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: "flex", gap: 10, transform: `scale(${step1Pop})` }, children: Array.from({ length: remainCount }).map((_, i) => ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }, children: [(0, jsx_runtime_1.jsx)(ItemComponent, { itemType: itemType }), (0, jsx_runtime_1.jsx)("div", { style: {
                                        color: "#fcd34d",
                                        fontSize: 32,
                                        fontWeight: "bold",
                                        opacity: getCountOpacity(i),
                                        transform: `translateY(${(0, remotion_1.interpolate)(getCountOpacity(i), [0, 1], [10, 0])}px)`
                                    }, children: i + 1 })] }, `Remain${i}`))) }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 90, color: "#ef4444", fontWeight: "bold", opacity: minusOpacity }, children: "-" }), (0, jsx_runtime_1.jsx)("div", { style: {
                            display: "flex",
                            gap: 10,
                            transform: `scale(${step1Pop}) translateX(${(0, remotion_1.interpolate)(splitProgress, [0, 1], [0, 50])}px)`,
                            opacity: takeAwayOpacity
                        }, children: Array.from({ length: subtractCount }).map((_, i) => ((0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }, children: (0, jsx_runtime_1.jsx)("div", { style: { filter: `grayscale(${(0, remotion_1.interpolate)(splitProgress, [0, 1], [0, 100])}%)` }, children: (0, jsx_runtime_1.jsx)(ItemComponent, { itemType: itemType }) }) }, `Sub${i}`))) })] }), (0, jsx_runtime_1.jsx)("div", { style: {
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
