"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const CurrencyScene = ({ scene }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    const progress = (0, remotion_1.spring)({
        frame,
        fps,
        config: { damping: 12 },
    });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { justifyContent: "center", alignItems: "center", flexDirection: "column" }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", width: 800, transform: `scale(${progress})` }, children: [scene.item_type === "COIN" && [...Array(scene.count || 5)].map((_, i) => ((0, jsx_runtime_1.jsx)("div", { style: {
                            width: 80, height: 80, borderRadius: "50%",
                            background: "radial-gradient(#fde047, #ca8a04)",
                            display: "flex", justifyContent: "center", alignItems: "center",
                            border: "4px solid #a16207", color: "#713f12", fontWeight: "bold", fontSize: 24
                        }, children: "$1" }, i))), scene.item_type === "NOTE" && [...Array(scene.count || 3)].map((_, i) => ((0, jsx_runtime_1.jsx)("div", { style: {
                            width: 140, height: 70, backgroundColor: "#bbf7d0",
                            border: "2px solid #166534", borderRadius: 4,
                            display: "flex", justifyContent: "center", alignItems: "center",
                            color: "#14532d", fontWeight: "bold", fontSize: 24, padding: 5,
                            boxShadow: "inset 0 0 10px rgba(0,0,0,0.1)"
                        }, children: "$10" }, i)))] }), (0, jsx_runtime_1.jsx)("h2", { style: { color: "white", fontSize: 40, marginTop: 60, opacity: progress }, children: scene.narration })] }));
};
exports.CurrencyScene = CurrencyScene;
