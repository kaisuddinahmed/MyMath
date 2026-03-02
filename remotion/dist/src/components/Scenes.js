"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquationScene = exports.GroupScene = exports.CounterScene = exports.TitleCard = exports.NarrationBar = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const ItemSvgs_1 = require("../assets/items/ItemSvgs");
/**
 * Renders a caption bar at the bottom of the screen.
 */
const NarrationBar = ({ text }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const fadeIn = (0, remotion_1.spring)({ frame, fps, from: 0, to: 1, durationInFrames: 12 });
    if (!text)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { style: {
            position: "absolute",
            bottom: 24,
            left: 24,
            right: 24,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            borderRadius: 16,
            padding: "14px 24px",
            opacity: fadeIn,
            transform: `translateY(${(0, remotion_1.interpolate)(fadeIn, [0, 1], [20, 0])}px)`,
        }, children: (0, jsx_runtime_1.jsx)("p", { style: {
                color: "#F8FAFC",
                fontSize: 22,
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                fontWeight: 600,
                margin: 0,
                lineHeight: 1.4,
            }, children: text }) }));
};
exports.NarrationBar = NarrationBar;
const TitleCard = ({ problem }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const scale = (0, remotion_1.spring)({ frame, fps, from: 0.8, to: 1, durationInFrames: 30 });
    const opacity = (0, remotion_1.spring)({ frame, fps, from: 0, to: 1, durationInFrames: 20 });
    return ((0, jsx_runtime_1.jsx)("div", { style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            opacity,
            transform: `scale(${scale})`,
            padding: "0 60px",
        }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(16px)",
                borderRadius: 24,
                padding: "50px 70px",
                border: "1px solid rgba(255,255,255,0.15)",
                textAlign: "center",
                maxWidth: 1000,
            }, children: (0, jsx_runtime_1.jsx)("p", { style: {
                    color: "#F8FAFC",
                    fontSize: 40,
                    fontWeight: 700,
                    margin: 0,
                    fontFamily: "'Inter', sans-serif",
                    lineHeight: 1.5,
                }, children: problem }) }) }));
};
exports.TitleCard = TitleCard;
/** Helper: choose SVG component by item_type */
function ItemComponent({ itemType, size }) {
    switch (itemType) {
        case "APPLE_SVG":
            return (0, jsx_runtime_1.jsx)(ItemSvgs_1.AppleSvg, { size: size });
        case "BLOCK_SVG":
            return (0, jsx_runtime_1.jsx)(ItemSvgs_1.BlockSvg, { size: size });
        case "STAR_SVG":
            return (0, jsx_runtime_1.jsx)(ItemSvgs_1.StarSvg, { size: size });
        default:
            return (0, jsx_runtime_1.jsx)(ItemSvgs_1.CounterSvg, { size: size });
    }
}
/** Animate a single item appearing */
function AnimatedItem({ index, total, itemType, animationStyle, size = 56, }) {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    // Ensure all items finish appearing within ~2 seconds (40-50 frames)
    const stagger = Math.max(1, 40 / total);
    const delay = Math.round(index * stagger);
    let opacity = 1;
    let transform = "";
    if (animationStyle === "BOUNCE_IN") {
        const s = (0, remotion_1.spring)({
            frame: Math.max(0, frame - delay),
            fps,
            from: 0,
            to: 1,
            config: { damping: 8, mass: 0.6 },
        });
        opacity = s;
        transform = `scale(${(0, remotion_1.interpolate)(s, [0, 1], [0.2, 1])})`;
    }
    else if (animationStyle === "FADE_IN") {
        opacity = (0, remotion_1.spring)({
            frame: Math.max(0, frame - delay),
            fps,
            from: 0,
            to: 1,
            durationInFrames: 15,
        });
    }
    else if (animationStyle === "SLIDE_LEFT") {
        const s = (0, remotion_1.spring)({
            frame: Math.max(0, frame - delay),
            fps,
            from: 0,
            to: 1,
            durationInFrames: 18,
        });
        opacity = s;
        transform = `translateX(${(0, remotion_1.interpolate)(s, [0, 1], [80, 0])}px)`;
    }
    else if (animationStyle === "POP") {
        const s = (0, remotion_1.spring)({
            frame: Math.max(0, frame - delay),
            fps,
            from: 0,
            to: 1,
            config: { damping: 5, mass: 0.4 },
        });
        opacity = s;
        transform = `scale(${(0, remotion_1.interpolate)(s, [0, 0.5, 1], [0, 1.3, 1])})`;
    }
    return ((0, jsx_runtime_1.jsx)("div", { style: { opacity, transform, display: "inline-flex", margin: 6 }, children: (0, jsx_runtime_1.jsx)(ItemComponent, { itemType: itemType, size: size }) }));
}
/**
 * CounterScene — Adds or removes items with animation.
 */
const CounterScene = ({ scene }) => {
    const itemType = scene.item_type || "COUNTER";
    const animation = scene.animation_style || "BOUNCE_IN";
    const isRemove = scene.action === "REMOVE_ITEMS";
    const isHighlight = scene.action === "HIGHLIGHT";
    let leftCount = 0;
    let rightCount = 0;
    let isAddSplit = false;
    let isSubSplit = false;
    let isCompSplit = false;
    let compOp = "";
    if (scene.equation) {
        const addMatch = scene.equation.match(/(\d+)\s*\+\s*(\d+)/);
        const subMatch = scene.equation.match(/(\d+)\s*-\s*(\d+)/);
        const compMatch = scene.equation.match(/(\d+)\s*([><=]+)\s*(\d+)/);
        if (addMatch && !isRemove && !isHighlight) {
            leftCount = parseInt(addMatch[1], 10);
            rightCount = parseInt(addMatch[2], 10);
            if (leftCount + rightCount <= 40) {
                isAddSplit = true;
            }
        }
        else if (subMatch && !isHighlight) {
            leftCount = parseInt(subMatch[1], 10); // total starting items
            rightCount = parseInt(subMatch[2], 10); // items to take away
            if (leftCount <= 40) {
                isSubSplit = true;
            }
        }
        else if (compMatch) {
            leftCount = parseInt(compMatch[1], 10);
            rightCount = parseInt(compMatch[3], 10);
            compOp = compMatch[2];
            if (leftCount + rightCount <= 40) {
                isCompSplit = true;
            }
        }
    }
    const realCount = scene.count || (isAddSplit || isCompSplit ? leftCount + rightCount : 5);
    const visualCount = Math.min(realCount, 40);
    let labelText = isAddSplit ? `Adding ${leftCount} and ${rightCount}` : `Bringing in ${realCount}!`;
    if (isRemove || isSubSplit)
        labelText = isSubSplit ? `Taking away ${rightCount} from ${leftCount}` : `Taking away...`;
    if (isCompSplit)
        labelText = `Comparing ${leftCount} and ${rightCount}`;
    // For highlight action in comparison, dull out the smaller group
    const leftOpacity = isHighlight && isCompSplit && leftCount <= rightCount ? 0.3 : 1;
    const rightOpacity = isHighlight && isCompSplit && rightCount <= leftCount ? 0.3 : 1;
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 20,
        }, children: [(0, jsx_runtime_1.jsx)("p", { style: {
                    color: "#94A3B8",
                    fontSize: 24,
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    margin: 0,
                }, children: labelText }), isCompSplit ? ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 50, marginTop: 40 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 400, gap: 10, opacity: leftOpacity, transition: "opacity 1s" }, children: Array.from({ length: leftCount }).map((_, i) => ((0, jsx_runtime_1.jsx)(AnimatedItem, { index: i, total: leftCount, itemType: itemType, animationStyle: animation }, `left-${i}`))) }), isHighlight ? ((0, jsx_runtime_1.jsx)("div", { style: { fontSize: 90, color: "#fcd34d", fontWeight: "bold" }, children: compOp })) : ((0, jsx_runtime_1.jsx)("div", { style: { fontSize: 90, color: "transparent", fontWeight: "bold" }, children: " ? " })), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 400, gap: 10, opacity: rightOpacity, transition: "opacity 1s" }, children: Array.from({ length: rightCount }).map((_, i) => ((0, jsx_runtime_1.jsx)(AnimatedItem, { index: i, total: rightCount, itemType: itemType, animationStyle: animation }, `right-${i}`))) })] })) : isAddSplit ? ((0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 50, marginTop: 40 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 400, gap: 10 }, children: Array.from({ length: leftCount }).map((_, i) => ((0, jsx_runtime_1.jsx)(AnimatedItem, { index: i, total: leftCount, itemType: itemType, animationStyle: animation }, `left-${i}`))) }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 80, color: "#10b981", fontWeight: "bold" }, children: "+" }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 400, gap: 10 }, children: Array.from({ length: rightCount }).map((_, i) => ((0, jsx_runtime_1.jsx)(AnimatedItem, { index: i, total: rightCount, itemType: itemType, animationStyle: animation }, `right-${i}`))) })] })) : isSubSplit ? ((0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 800, gap: 10, marginTop: 40 }, children: Array.from({ length: leftCount }).map((_, i) => {
                    const isRemovedItem = i >= leftCount - rightCount;
                    return ((0, jsx_runtime_1.jsxs)("div", { style: {
                            opacity: isRemovedItem ? 0.2 : 1,
                            transform: isRemovedItem ? `translateY(40px) scale(0.8)` : `none`,
                            transition: "all 1s cubic-bezier(0.34, 1.56, 0.64, 1)"
                        }, children: [(0, jsx_runtime_1.jsx)(AnimatedItem, { index: i, total: leftCount, itemType: itemType, animationStyle: isRemovedItem ? "FADE_IN" : animation }), isRemovedItem && ((0, jsx_runtime_1.jsx)("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 50, fontWeight: "bold" }, children: "\u00D7" }))] }, i));
                }) })) : ((0, jsx_runtime_1.jsx)("div", { style: {
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    maxWidth: 600,
                    gap: 10,
                    marginTop: 40
                }, children: Array.from({ length: visualCount }).map((_, i) => ((0, jsx_runtime_1.jsx)(AnimatedItem, { index: i, total: visualCount, itemType: itemType, animationStyle: animation }, i))) }))] }));
};
exports.CounterScene = CounterScene;
/**
 * GroupScene — Shows items arranged in groups (for multiplication/division).
 */
const GroupScene = ({ scene }) => {
    const groups = Math.min(scene.groups || 3, 10);
    const perGroup = Math.min(scene.per_group || scene.count || 4, 12);
    const itemType = scene.item_type || "BLOCK_SVG";
    const animation = scene.animation_style || "BOUNCE_IN";
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 24,
        }, children: [(0, jsx_runtime_1.jsxs)("p", { style: {
                    color: "#94A3B8",
                    fontSize: 20,
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    margin: 0,
                }, children: [groups, " groups of ", perGroup] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 20,
                }, children: Array.from({ length: groups }).map((_, gi) => ((0, jsx_runtime_1.jsx)("div", { style: {
                        border: "2px dashed rgba(148,163,184,0.4)",
                        borderRadius: 16,
                        padding: 12,
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 2,
                        maxWidth: 180,
                    }, children: Array.from({ length: perGroup }).map((_, ii) => ((0, jsx_runtime_1.jsx)(AnimatedItem, { index: gi * perGroup + ii, total: groups * perGroup, itemType: itemType, animationStyle: animation, size: 40 }, ii))) }, gi))) })] }));
};
exports.GroupScene = GroupScene;
/**
 * EquationScene — Shows a math equation prominently.
 */
const EquationScene = ({ scene, }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const scale = (0, remotion_1.spring)({
        frame,
        fps,
        from: 0.6,
        to: 1,
        durationInFrames: 20,
        config: { damping: 10 },
    });
    const opacity = (0, remotion_1.spring)({ frame, fps, from: 0, to: 1, durationInFrames: 12 });
    return ((0, jsx_runtime_1.jsx)("div", { style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            opacity,
            transform: `scale(${scale})`,
        }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                background: "rgba(99,102,241,0.12)",
                borderRadius: 20,
                padding: "40px 60px",
                border: "2px solid rgba(99,102,241,0.3)",
            }, children: (0, jsx_runtime_1.jsx)("p", { style: {
                    color: "#E0E7FF",
                    fontSize: 52,
                    fontWeight: 800,
                    fontFamily: "'Inter', sans-serif",
                    margin: 0,
                    letterSpacing: 2,
                    whiteSpace: "pre-wrap",
                }, children: scene.equation || scene.narration }) }) }));
};
exports.EquationScene = EquationScene;
