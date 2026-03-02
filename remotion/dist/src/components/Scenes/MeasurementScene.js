"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeasurementScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const MeasurementScene = ({ scene }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    const progress = (0, remotion_1.spring)({
        frame,
        fps,
        config: { damping: 12 },
    });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { justifyContent: "center", alignItems: "center", flexDirection: "column" }, children: [scene.item_type === "RULER" && ((0, jsx_runtime_1.jsx)("div", { style: {
                    width: 600,
                    height: 80,
                    backgroundColor: "#fcd34d",
                    transform: `scale(${progress})`,
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0 20px",
                    alignItems: "flex-end",
                    border: "2px solid #b45309",
                    borderRadius: "4px"
                }, children: [...Array(11)].map((_, i) => ((0, jsx_runtime_1.jsx)("div", { style: { height: "40%", width: 2, backgroundColor: "#b45309" } }, i))) })), scene.item_type === "CLOCK" && ((0, jsx_runtime_1.jsxs)("div", { style: {
                    width: 200,
                    height: 200,
                    backgroundColor: "white",
                    transform: `scale(${progress})`,
                    borderRadius: "50%",
                    border: "8px solid #1e293b",
                    position: "relative"
                }, children: [(0, jsx_runtime_1.jsx)("div", { style: { position: "absolute", bottom: "50%", left: "48%", width: 6, height: 50, backgroundColor: "#1e293b", transformOrigin: "bottom" } }), (0, jsx_runtime_1.jsx)("div", { style: { position: "absolute", bottom: "50%", left: "49%", width: 4, height: 80, backgroundColor: "#ef4444", transformOrigin: "bottom", transform: "rotate(90deg)" } })] })), (0, jsx_runtime_1.jsx)("h2", { style: { color: "white", fontSize: 40, marginTop: 40, opacity: progress }, children: scene.narration })] }));
};
exports.MeasurementScene = MeasurementScene;
