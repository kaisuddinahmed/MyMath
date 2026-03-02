"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvenOddScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const EvenOddScene = ({ scene }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    const progress = (0, remotion_1.spring)({
        frame,
        fps,
        config: { damping: 12 },
    });
    const num = parseInt(scene.equation || "13", 10);
    const isEven = num % 2 === 0;
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", flexDirection: "column" }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 60, transform: `scale(${progress})` }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }, children: Array.from({ length: Math.floor(num / 2) }).map((_, i) => ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 10 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { width: 40, height: 40, backgroundColor: "#3b82f6", borderRadius: "50%" } }), (0, jsx_runtime_1.jsx)("div", { style: { width: 40, height: 40, backgroundColor: "#3b82f6", borderRadius: "50%" } })] }, `pair-${i}`))) }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 10, alignItems: "center", justifyContent: "flex-end" }, children: !isEven && ((0, jsx_runtime_1.jsx)("div", { style: {
                                width: 40,
                                height: 40,
                                backgroundColor: "#ef4444",
                                borderRadius: "50%",
                                boxShadow: `0 0 20px rgba(239, 68, 68, ${Math.abs(Math.sin(frame / 10))})`,
                                transform: `scale(${1 + Math.abs(Math.sin(frame / 10)) * 0.2})`
                            } })) })] }), progress > 0.8 && ((0, jsx_runtime_1.jsx)("div", { style: { marginTop: 60, fontSize: 80, fontWeight: "bold", color: isEven ? "#10b981" : "#ef4444" }, children: isEven ? "Even" : "Odd" })), (0, jsx_runtime_1.jsx)("h2", { style: { color: "white", fontSize: 40, marginTop: 40, opacity: progress, textAlign: "center", maxWidth: "80%" }, children: scene.narration })] }));
};
exports.EvenOddScene = EvenOddScene;
