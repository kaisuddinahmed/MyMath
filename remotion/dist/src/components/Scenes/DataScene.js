"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const DataScene = ({ scene }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    const frame = (0, remotion_1.useCurrentFrame)();
    const progress = (0, remotion_1.spring)({
        frame,
        fps,
        config: { damping: 12 },
    });
    // Parse data. If equation is "A:10,B:20,C:15", extract labels and values
    const rawDataStr = scene.equation || "A:80,B:120,C:150,D:100";
    const dataItems = rawDataStr.split(",").map(item => {
        const [label, valStr] = item.split(":");
        return { label: label?.trim() || "", value: parseInt(valStr || "50", 10) };
    });
    const maxValue = Math.max(...dataItems.map(d => d.value), 10);
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
    const renderBarChart = () => {
        return ((0, jsx_runtime_1.jsx)("div", { style: { display: "flex", alignItems: "flex-end", height: 400, gap: 20, borderBottom: "4px solid #94a3b8", paddingBottom: 10, paddingLeft: 10, borderLeft: "4px solid #94a3b8" }, children: dataItems.map((d, i) => {
                // Normalize height to max 350px
                const normHeight = (d.value / maxValue) * 350;
                return ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                width: 60,
                                height: normHeight * progress,
                                backgroundColor: colors[i % colors.length],
                                borderTopLeftRadius: 6,
                                borderTopRightRadius: 6,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "flex-start",
                                paddingTop: 10
                            }, children: (0, jsx_runtime_1.jsx)("span", { style: { color: "white", fontWeight: "bold", opacity: Math.max(0, (0, remotion_1.interpolate)(progress, [0.8, 1], [0, 1])) }, children: d.value }) }), (0, jsx_runtime_1.jsx)("span", { style: { color: "#f8fafc", fontSize: 20, fontWeight: "bold" }, children: d.label })] }, i));
            }) }));
    };
    const renderPieChart = () => {
        // Basic pie chart logic
        const total = dataItems.reduce((acc, d) => acc + d.value, 0);
        let currentAngle = 0;
        // Animate rotation to spin while scaling
        const rotation = (0, remotion_1.interpolate)(progress, [0, 1], [-90, 0]);
        const gradients = dataItems.map((d, i) => {
            const pct = (d.value / total) * 100;
            const start = currentAngle;
            const end = currentAngle + pct;
            currentAngle = end;
            return `${colors[i % colors.length]} ${start}% ${end}%`;
        });
        return ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 50 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                        width: 350,
                        height: 350,
                        borderRadius: "50%",
                        transform: `scale(${progress}) rotate(${rotation}deg)`,
                        background: `conic-gradient(${gradients.join(', ')})`,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                    } }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 15, opacity: progress }, children: dataItems.map((d, i) => ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 15 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { width: 20, height: 20, backgroundColor: colors[i % colors.length], borderRadius: 4 } }), (0, jsx_runtime_1.jsxs)("span", { style: { color: "#f8fafc", fontSize: 24 }, children: [d.label, " - ", Math.round((d.value / total) * 100), "%"] })] }, i))) })] }));
    };
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", flexDirection: "column" }, children: [scene.item_type === "BAR_CHART" && renderBarChart(), scene.item_type === "PIE_CHART" && renderPieChart(), scene.item_type === "TALLY_MARK" && ((0, jsx_runtime_1.jsx)("div", { style: { display: "flex", gap: 30, transform: `scale(${progress})` }, children: Array.from({ length: Math.ceil(dataItems[0]?.value || 12) / 5 }).map((_, groupIdx) => ((0, jsx_runtime_1.jsxs)("div", { style: { position: "relative", width: 60, height: 100 }, children: [[...Array(4)].map((_, i) => ((0, jsx_runtime_1.jsx)("div", { style: { position: "absolute", left: i * 15, width: 6, height: 100, backgroundColor: "#3b82f6", borderRadius: 3 } }, i))), (0, jsx_runtime_1.jsx)("div", { style: { position: "absolute", top: 45, left: -10, width: 80, height: 6, backgroundColor: "#ef4444", transform: "rotate(-30deg)", borderRadius: 3 } })] }, groupIdx))) })), (0, jsx_runtime_1.jsx)("h2", { style: { color: "white", fontSize: 40, marginTop: 60, opacity: progress, textAlign: "center", maxWidth: "80%" }, children: scene.narration })] }));
};
exports.DataScene = DataScene;
