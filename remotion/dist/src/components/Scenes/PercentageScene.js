"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PercentageScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const PercentageScene = ({ scene }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    const progress = (0, remotion_1.spring)({
        frame,
        fps,
        config: { damping: 12 },
    });
    // e.g. "45%"
    const pcMatch = (scene.equation || "25%").match(/\d+/);
    const targetPct = pcMatch ? parseInt(pcMatch[0], 10) : 25;
    // Fill animation over 60 frames
    const fillProgress = (0, remotion_1.spring)({
        frame: frame - 15,
        fps,
        config: { damping: 100, mass: 2 },
        durationInFrames: 60
    });
    const filledCubes = Math.round(targetPct * fillProgress);
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", flexDirection: "column" }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { transform: `scale(${progress})`, display: "flex", alignItems: "center", gap: 60 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                            display: "grid",
                            gridTemplateColumns: "repeat(10, 1fr)",
                            gap: 2,
                            padding: 10,
                            backgroundColor: "#1e293b",
                            borderRadius: 12,
                            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)"
                        }, children: Array.from({ length: 100 }).map((_, i) => {
                            // Fill bottom-up, left-to-right
                            const col = i % 10;
                            const row = 9 - Math.floor(i / 10);
                            const index = row * 10 + col;
                            const isFilled = index < filledCubes;
                            return ((0, jsx_runtime_1.jsx)("div", { style: {
                                    width: 30,
                                    height: 30,
                                    backgroundColor: isFilled ? "#10b981" : "#334155",
                                    borderRadius: 4,
                                    transition: "background-color 0.1s"
                                } }, i));
                        }) }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 120, fontWeight: "bold", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }, children: [filledCubes, (0, jsx_runtime_1.jsx)("span", { style: { color: "#10b981" }, children: "%" })] })] }), (0, jsx_runtime_1.jsx)("h2", { style: { color: "white", fontSize: 40, marginTop: 80, opacity: progress, textAlign: "center", maxWidth: "80%" }, children: scene.narration })] }));
};
exports.PercentageScene = PercentageScene;
