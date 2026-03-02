"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeometryScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const GeometryScene = ({ scene }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    const progress = (0, remotion_1.spring)({
        frame,
        fps,
        config: { damping: 12 },
    });
    const shapeStr = ((scene.equation || "") + " " + (scene.narration || "")).toLowerCase();
    const drawShape = () => {
        if (shapeStr.includes("triangle")) {
            return ((0, jsx_runtime_1.jsxs)("svg", { width: "400", height: "400", viewBox: "0 0 100 100", style: { overflow: "visible" }, children: [(0, jsx_runtime_1.jsx)("polygon", { points: "50,10 10,90 90,90", fill: "rgba(59, 130, 246, 0.2)", stroke: "#3b82f6", strokeWidth: "2", strokeLinejoin: "round" }), (0, jsx_runtime_1.jsx)("line", { x1: "50", y1: "10", x2: "50", y2: "90", stroke: "#f8fafc", strokeWidth: "1", strokeDasharray: "2" }), (0, jsx_runtime_1.jsx)("text", { x: "50", y: "100", fontSize: "6", fill: "#fcd34d", textAnchor: "middle", fontWeight: "bold", children: "Base" }), (0, jsx_runtime_1.jsx)("text", { x: "52", y: "55", fontSize: "6", fill: "#fcd34d", textAnchor: "start", fontWeight: "bold", children: "Height" })] }));
        }
        else if (shapeStr.includes("circle")) {
            return ((0, jsx_runtime_1.jsxs)("svg", { width: "400", height: "400", viewBox: "0 0 100 100", style: { overflow: "visible" }, children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "40", fill: "rgba(239, 68, 68, 0.2)", stroke: "#ef4444", strokeWidth: "2" }), (0, jsx_runtime_1.jsx)("line", { x1: "10", y1: "50", x2: "90", y2: "50", stroke: "#f8fafc", strokeWidth: "1", strokeDasharray: "2" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "1.5", fill: "white" }), (0, jsx_runtime_1.jsx)("text", { x: "50", y: "47", fontSize: "6", fill: "#fcd34d", textAnchor: "middle", fontWeight: "bold", children: "Diameter" })] }));
        }
        else if (shapeStr.includes("parallelogram")) {
            // Parallelogram transformation animation to show area equivalence
            const slide = (0, remotion_1.spring)({ frame: Math.max(0, frame - 45), fps, config: { damping: 14 } });
            const moveX = (0, remotion_1.interpolate)(slide, [0, 1], [0, 80]);
            return ((0, jsx_runtime_1.jsxs)("svg", { width: "500", height: "300", viewBox: "0 0 140 80", style: { overflow: "visible" }, children: [(0, jsx_runtime_1.jsx)("polygon", { points: "30,10 90,10 90,70 30,70", fill: "rgba(16, 185, 129, 0.2)", stroke: "#10b981", strokeWidth: "2", strokeLinejoin: "round" }), (0, jsx_runtime_1.jsx)("polygon", { points: "10,70 30,10 30,70", fill: "rgba(16, 185, 129, 0.5)", stroke: "#10b981", strokeWidth: "2", strokeLinejoin: "round", style: { transform: `translateX(${moveX}px)` } }), (0, jsx_runtime_1.jsx)("polygon", { points: "10,70 30,10 30,70", fill: "none", stroke: "rgba(255,255,255,0.4)", strokeWidth: "1.5", strokeDasharray: "2" }), (0, jsx_runtime_1.jsx)("text", { x: "60", y: "78", fontSize: "6", fill: "#fcd34d", textAnchor: "middle", fontWeight: "bold", children: "Base" }), (0, jsx_runtime_1.jsx)("text", { x: "32", y: "40", fontSize: "6", fill: "#fcd34d", textAnchor: "start", fontWeight: "bold", children: "Height" })] }));
        }
        else {
            // Rectangle/Square fallback
            return ((0, jsx_runtime_1.jsxs)("svg", { width: "400", height: "400", viewBox: "0 0 100 100", style: { overflow: "visible" }, children: [(0, jsx_runtime_1.jsx)("rect", { x: "10", y: "20", width: "80", height: "60", fill: "rgba(245, 158, 11, 0.2)", stroke: "#f59e0b", strokeWidth: "2", rx: "2" }), (0, jsx_runtime_1.jsx)("text", { x: "50", y: "15", fontSize: "6", fill: "#fcd34d", textAnchor: "middle", fontWeight: "bold", children: "Length" }), (0, jsx_runtime_1.jsx)("text", { x: "95", y: "50", fontSize: "6", fill: "#fcd34d", textAnchor: "start", fontWeight: "bold", children: "Width" })] }));
        }
    };
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", flexDirection: "column" }, children: [(0, jsx_runtime_1.jsx)("div", { style: { transform: `scale(${progress})` }, children: drawShape() }), (0, jsx_runtime_1.jsx)("h2", { style: { color: "white", fontSize: 40, marginTop: 80, opacity: progress, textAlign: "center", maxWidth: "80%", lineHeight: 1.4 }, children: scene.narration })] }));
};
exports.GeometryScene = GeometryScene;
