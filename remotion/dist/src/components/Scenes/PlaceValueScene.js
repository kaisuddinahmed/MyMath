"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaceValueScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const PLACE_NAMES = [
    "Ones", "Tens", "Hundreds", "Thousands", "Ten Thousands", "Lakhs", "Ten Lakhs", "Crores"
];
const PlaceValueScene = ({ scene }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    // Extract digits from the equation string (e.g. "45678")
    const equation = scene.equation || "0";
    const numMatch = equation.replace(/,/g, '').match(/\d+/);
    const numStr = numMatch ? numMatch[0] : "0";
    const digits = numStr.split('');
    return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: { justifyContent: "center", alignItems: "center", flexDirection: "column" }, children: scene.action === "SHOW_PLACE_VALUE" && ((0, jsx_runtime_1.jsx)("div", { style: { display: "flex", gap: 30, padding: 40, backgroundColor: "#1e293b", borderRadius: 20 }, children: digits.map((digit, i) => {
                const placeIndex = digits.length - 1 - i;
                const placeName = PLACE_NAMES[placeIndex] || `10^${placeIndex}`;
                // Staggered slide-in animation for each column
                const slideProgress = (0, remotion_1.spring)({
                    frame: frame - i * 5,
                    fps,
                    config: { damping: 14 }
                });
                return ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 100 }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { color: "#94a3b8", fontSize: 24, margin: "0 0 20px 0" }, children: placeName }), (0, jsx_runtime_1.jsx)("div", { style: {
                                backgroundColor: "#334155",
                                width: 80,
                                height: 100,
                                borderRadius: 12,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                transform: `translateY(${(1 - slideProgress) * -100}px)`,
                                opacity: slideProgress
                            }, children: (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 48, fontWeight: "bold", color: "#f8fafc" }, children: digit }) })] }, i));
            }) })) }));
};
exports.PlaceValueScene = PlaceValueScene;
