"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BODMASScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const BODMASScene = ({ scene }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    const progress = (0, remotion_1.spring)({
        frame,
        fps,
        config: { damping: 12 },
    });
    // Example equation format: "(3+4)×2−1" -> we expect scenes to pass the current equation state
    const eqStr = scene.equation || "(3+4)×2";
    // Highlight bracket logic (if '(' exists, glow it)
    const hasBrackets = eqStr.includes("(") && eqStr.includes(")");
    let displayHTML = eqStr;
    if (hasBrackets) {
        const startIdx = eqStr.indexOf("(");
        const endIdx = eqStr.indexOf(")") + 1;
        const beforePart = eqStr.substring(0, startIdx);
        const bracketPart = eqStr.substring(startIdx, endIdx);
        const afterPart = eqStr.substring(endIdx);
        // Dim the non-bracket part, pulse the bracket part
        const pulse = (0, remotion_1.interpolate)(Math.sin((frame * Math.PI) / 15), [-1, 1], [0.6, 1]);
        displayHTML = `
      <span style="opacity: 0.4">${beforePart}</span>
      <span style="color: #fcd34d; filter: drop-shadow(0 0 10px rgba(252,211,77,${pulse}))">${bracketPart}</span>
      <span style="opacity: 0.4">${afterPart}</span>
    `;
    }
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", flexDirection: "column" }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                    transform: `scale(${progress})`,
                    fontSize: 100,
                    fontWeight: "bold",
                    color: "#f8fafc",
                    letterSpacing: "0.1em",
                    fontFamily: "'Inter', monospace",
                    backgroundColor: "#1e293b",
                    padding: "40px 60px",
                    borderRadius: 24,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
                }, dangerouslySetInnerHTML: { __html: displayHTML } }), (0, jsx_runtime_1.jsx)("h2", { style: { color: "white", fontSize: 40, marginTop: 100, opacity: progress, textAlign: "center", maxWidth: "80%" }, children: scene.narration })] }));
};
exports.BODMASScene = BODMASScene;
