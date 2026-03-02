"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmallAdditionScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const ItemSvgs_1 = require("../../assets/items/ItemSvgs");
function ItemComponent({ itemType, size = 56 }) {
    switch (itemType) {
        case "APPLE_SVG": return (0, jsx_runtime_1.jsx)(ItemSvgs_1.AppleSvg, { size: size });
        case "BLOCK_SVG": return (0, jsx_runtime_1.jsx)(ItemSvgs_1.BlockSvg, { size: size });
        default: return (0, jsx_runtime_1.jsx)(ItemSvgs_1.CounterSvg, { size: size });
    }
}
const SmallAdditionScene = ({ groupedScenes, timings }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    // Parse the equation from the first scene (expected "A + B")
    const eqStr = groupedScenes[0]?.equation || "4 + 2";
    const match = eqStr.match(/(\d+)\s*\+\s*(\d+)/);
    const leftCount = match ? parseInt(match[1], 10) : 4;
    const rightCount = match ? parseInt(match[2], 10) : 2;
    const totalCount = leftCount + rightCount;
    const itemType = groupedScenes[0]?.item_type || "APPLE_SVG";
    // Calculate timing boundaries dynamically based on the number of provided scenes
    const hasCountingStep = timings.length >= 4;
    const step1End = timings[0]?.dur || 4 * fps;
    const step2End = step1End + (timings[1]?.dur || 4 * fps);
    // If counting step exists, step3End uses its duration. Otherwise, step3End is just step2End.
    const step3Dur = hasCountingStep ? timings[2].dur : 0;
    const step3End = step2End + step3Dur;
    // Layout interpolations based on step transitions
    // Step 1: Items pop in separate groups
    const step1Pop = (0, remotion_1.spring)({ frame, fps, config: { damping: 12 } });
    // Step 2: Plus sign fades out, objects slide together
    const mergeProgress = (0, remotion_1.spring)({
        frame: Math.max(0, frame - step1End),
        fps,
        config: { damping: 14 }
    });
    const gap = (0, remotion_1.interpolate)(mergeProgress, [0, 1], [150, 10]);
    const plusOpacity = (0, remotion_1.interpolate)(mergeProgress, [0, 0.5], [1, 0], { extrapolateRight: "clamp" });
    // Step 3 (Optional): Counting numbers appear under items sequentially
    const getCountOpacity = (index) => {
        if (!hasCountingStep)
            return 0; // Don't show counters if step is skipped
        const staggerFrames = step3Dur / totalCount;
        const delay = step2End + (index * staggerFrames);
        return (0, remotion_1.spring)({
            frame: Math.max(0, frame - delay),
            fps,
            from: 0,
            to: 1,
            durationInFrames: 10
        });
    };
    // Step 4 (or 3, if counting skipped): Final equation fades in
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
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: gap }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: "flex", gap: 10, transform: `scale(${step1Pop})` }, children: Array.from({ length: leftCount }).map((_, i) => ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }, children: [(0, jsx_runtime_1.jsx)(ItemComponent, { itemType: itemType }), (0, jsx_runtime_1.jsx)("div", { style: {
                                        color: "#fcd34d",
                                        fontSize: 32,
                                        fontWeight: "bold",
                                        opacity: getCountOpacity(i),
                                        transform: `translateY(${(0, remotion_1.interpolate)(getCountOpacity(i), [0, 1], [10, 0])}px)`
                                    }, children: i + 1 })] }, `L${i}`))) }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 90, color: "#10b981", fontWeight: "bold", opacity: plusOpacity }, children: "+" }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", gap: 10, transform: `scale(${step1Pop})` }, children: Array.from({ length: rightCount }).map((_, i) => ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }, children: [(0, jsx_runtime_1.jsx)(ItemComponent, { itemType: itemType }), (0, jsx_runtime_1.jsx)("div", { style: {
                                        color: "#fcd34d",
                                        fontSize: 32,
                                        fontWeight: "bold",
                                        opacity: getCountOpacity(leftCount + i),
                                        transform: `translateY(${(0, remotion_1.interpolate)(getCountOpacity(leftCount + i), [0, 1], [10, 0])}px)`
                                    }, children: leftCount + i + 1 })] }, `R${i}`))) })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    marginTop: 80,
                    opacity: step4Opacity,
                    transform: `translateY(${(0, remotion_1.interpolate)(step4Opacity, [0, 1], [30, 0])}px)`,
                    background: "rgba(99,102,241,0.12)",
                    borderRadius: 20,
                    padding: "20px 60px",
                    border: "2px solid rgba(99,102,241,0.3)",
                }, children: (0, jsx_runtime_1.jsxs)("p", { style: {
                        color: "#E0E7FF",
                        fontSize: 60,
                        fontWeight: 800,
                        fontFamily: "'Inter', sans-serif",
                        margin: 0,
                        letterSpacing: 2,
                    }, children: [leftCount, " + ", rightCount, " = ", totalCount] }) })] }));
};
exports.SmallAdditionScene = SmallAdditionScene;
