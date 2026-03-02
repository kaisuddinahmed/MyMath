"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlgebraScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const AlgebraScene = ({ scene }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    const progress = (0, remotion_1.spring)({
        frame,
        fps,
        config: { damping: 12 },
    });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { justifyContent: "center", alignItems: "center", flexDirection: "column" }, children: [scene.action === "BALANCE" && ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", alignItems: "center", transform: `scale(${progress})` }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 60, backgroundColor: "#1e293b", padding: 30, borderRadius: 10, color: "white" }, children: "\uD83D\uDCE6 + 5" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 80, margin: "0 40px", color: "#fcd34d" }, children: "=" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 60, backgroundColor: "#1e293b", padding: 30, borderRadius: 10, color: "white" }, children: "12" })] })), (0, jsx_runtime_1.jsx)("h2", { style: { color: "white", fontSize: 40, marginTop: 60, opacity: progress }, children: scene.narration })] }));
};
exports.AlgebraScene = AlgebraScene;
