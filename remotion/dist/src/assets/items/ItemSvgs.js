"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmojiItemSvg = exports.CounterSvg = exports.BirdSvg = exports.StarSvg = exports.BlockSvg = exports.AppleSvg = void 0;
exports.ItemComponent = ItemComponent;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
/** Apple SVG — red with a green leaf */
const AppleSvg = ({ size = 60 }) => ((0, jsx_runtime_1.jsxs)("svg", { width: size, height: size, viewBox: "0 0 64 64", fill: "none", children: [(0, jsx_runtime_1.jsx)("ellipse", { cx: "32", cy: "38", rx: "22", ry: "24", fill: "#EF4444" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "32", cy: "38", rx: "22", ry: "24", fill: "url(#appleShine)" }), (0, jsx_runtime_1.jsx)("path", { d: "M32 14 C28 6, 22 8, 24 14", stroke: "#16A34A", strokeWidth: "3", fill: "none", strokeLinecap: "round" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "26", cy: "12", rx: "6", ry: "4", fill: "#22C55E", transform: "rotate(-20 26 12)" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "24", cy: "30", rx: "4", ry: "6", fill: "rgba(255,255,255,0.25)" }), (0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("radialGradient", { id: "appleShine", cx: "0.35", cy: "0.3", r: "0.65", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "0%", stopColor: "rgba(255,255,255,0.15)" }), (0, jsx_runtime_1.jsx)("stop", { offset: "100%", stopColor: "transparent" })] }) })] }));
exports.AppleSvg = AppleSvg;
/** Colored block — rounded square with shadow */
const BlockSvg = ({ size = 56, color = "#3B82F6", }) => ((0, jsx_runtime_1.jsxs)("svg", { width: size, height: size, viewBox: "0 0 56 56", fill: "none", children: [(0, jsx_runtime_1.jsx)("rect", { x: "4", y: "6", width: "48", height: "48", rx: "8", fill: "#1E3A5F", opacity: "0.2" }), (0, jsx_runtime_1.jsx)("rect", { x: "2", y: "2", width: "48", height: "48", rx: "8", fill: color }), (0, jsx_runtime_1.jsx)("rect", { x: "2", y: "2", width: "48", height: "48", rx: "8", fill: "url(#blockShine)" }), (0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("linearGradient", { id: "blockShine", x1: "0", y1: "0", x2: "1", y2: "1", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "0%", stopColor: "rgba(255,255,255,0.3)" }), (0, jsx_runtime_1.jsx)("stop", { offset: "100%", stopColor: "transparent" })] }) })] }));
exports.BlockSvg = BlockSvg;
/** Star SVG — gold 5-pointed star */
const StarSvg = ({ size = 56 }) => ((0, jsx_runtime_1.jsxs)("svg", { width: size, height: size, viewBox: "0 0 56 56", fill: "none", children: [(0, jsx_runtime_1.jsx)("path", { d: "M28 4 L33.5 20.5 L51 20.5 L37 31 L42 48 L28 38 L14 48 L19 31 L5 20.5 L22.5 20.5 Z", fill: "#FBBF24", stroke: "#F59E0B", strokeWidth: "1.5" }), (0, jsx_runtime_1.jsx)("path", { d: "M28 4 L33.5 20.5 L51 20.5 L37 31 L42 48 L28 38 L14 48 L19 31 L5 20.5 L22.5 20.5 Z", fill: "url(#starShine)" }), (0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("linearGradient", { id: "starShine", x1: "0.2", y1: "0", x2: "0.8", y2: "1", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "0%", stopColor: "rgba(255,255,255,0.35)" }), (0, jsx_runtime_1.jsx)("stop", { offset: "100%", stopColor: "transparent" })] }) })] }));
exports.StarSvg = StarSvg;
/** Bird SVG — simple blue bird */
const BirdSvg = ({ size = 60 }) => ((0, jsx_runtime_1.jsxs)("svg", { width: size, height: size, viewBox: "0 0 64 64", fill: "none", children: [(0, jsx_runtime_1.jsx)("path", { d: "M12 30 C 20 20, 30 15, 45 20 C 50 22, 55 28, 55 35 C 55 45, 40 50, 25 45 C 15 42, 10 35, 12 30 Z", fill: "#38BDF8" }), (0, jsx_runtime_1.jsx)("circle", { cx: "45", cy: "27", r: "3", fill: "#1E293B" }), (0, jsx_runtime_1.jsx)("path", { d: "M55 30 L 62 33 L 55 36 Z", fill: "#FBBF24" }), (0, jsx_runtime_1.jsx)("path", { d: "M25 45 L 22 55 M 35 43 L 32 55", stroke: "#FBBF24", strokeWidth: "2", strokeLinecap: "round" }), (0, jsx_runtime_1.jsx)("path", { d: "M15 32 C 20 42, 30 42, 35 32 C 25 35, 18 35, 15 32 Z", fill: "#0284C7" })] }));
exports.BirdSvg = BirdSvg;
/** Simple circular counter */
const CounterSvg = ({ size = 50, color = "#8B5CF6", }) => ((0, jsx_runtime_1.jsxs)("svg", { width: size, height: size, viewBox: "0 0 50 50", fill: "none", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "25", cy: "27", r: "22", fill: "#1E1B4B", opacity: "0.15" }), (0, jsx_runtime_1.jsx)("circle", { cx: "25", cy: "25", r: "22", fill: color }), (0, jsx_runtime_1.jsx)("circle", { cx: "18", cy: "18", r: "6", fill: "rgba(255,255,255,0.2)" })] }));
exports.CounterSvg = CounterSvg;
/**
 * Renders emoji as an image from Twemoji CDN.
 * Native emoji text does NOT render in Remotion's headless Chromium,
 * so we convert the emoji to its unicode codepoint and load the Twemoji SVG.
 */
function emojiToTwemojiUrl(emoji) {
    const codepoints = [...emoji]
        .map(c => c.codePointAt(0).toString(16))
        .filter(cp => cp !== "fe0f") // Remove variation selector
        .join("-");
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
}
const EmojiItemSvg = ({ emoji, size = 60 }) => ((0, jsx_runtime_1.jsx)(remotion_1.Img, { src: emojiToTwemojiUrl(emoji), width: size, height: size, style: { objectFit: "contain" } }));
exports.EmojiItemSvg = EmojiItemSvg;
function ItemComponent({ itemType, size = 56 }) {
    switch (itemType) {
        case "APPLE_SVG": return (0, jsx_runtime_1.jsx)(exports.AppleSvg, { size: size });
        case "BIRD_SVG": return (0, jsx_runtime_1.jsx)(exports.BirdSvg, { size: size });
        case "BLOCK_SVG": return (0, jsx_runtime_1.jsx)(exports.BlockSvg, { size: size });
        case "STAR_SVG": return (0, jsx_runtime_1.jsx)(exports.StarSvg, { size: size });
        case "FOOTBALL_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\u26BD", size: size });
        case "PEN_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDD8A\uFE0F", size: size });
        case "PENCIL_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\u270F\uFE0F", size: size });
        case "TREE_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF33", size: size });
        case "BOTTLE_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF7E", size: size });
        case "CAR_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDE97", size: size });
        case "RICKSHAW_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDEFA", size: size });
        case "FEATHER_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDEB6", size: size });
        case "JACKFRUIT_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF48", size: size });
        case "BOOK_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDCD8", size: size });
        case "FLOWER_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF38", size: size });
        case "MANGO_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDD6D", size: size });
        case "BRINJAL_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF46", size: size });
        case "BUS_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDE8C", size: size });
        case "BD_FLAG_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDDE7\uD83C\uDDE9", size: size });
        case "MAGPIE_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDC26\u200D\u2B1B", size: size });
        case "LILY_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDEB7", size: size });
        case "TIGER_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDC05", size: size });
        case "BANANA_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF4C", size: size });
        case "ROSE_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF39", size: size });
        case "LEAF_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF43", size: size });
        case "UMBRELLA_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\u2614", size: size });
        case "HILSA_FISH_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDC1F", size: size });
        case "BALLOON_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF88", size: size });
        case "PINEAPPLE_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF4D", size: size });
        case "COCONUT_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDD65", size: size });
        case "CARROT_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDD55", size: size });
        case "WATER_GLASS_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDD5B", size: size });
        case "EGG_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDD5A", size: size });
        case "TEA_CUP_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\u2615", size: size });
        case "POMEGRANATE_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF4E", size: size });
        case "RABBIT_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDC07", size: size });
        case "CAT_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDC08", size: size });
        case "HORSE_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDC0E", size: size });
        case "BOAT_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\u26F5", size: size });
        case "MARBLE_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDD2E", size: size });
        case "CROW_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDC26\u200D\u2B1B", size: size });
        case "PEACOCK_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDD9A", size: size });
        case "COCK_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDC13", size: size });
        case "HEN_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDC14", size: size });
        case "GUAVA_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF50", size: size });
        case "ELEPHANT_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83D\uDC18", size: size });
        case "TOMATO_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF45", size: size });
        case "PALM_FRUIT_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF34", size: size });
        case "ICE_CREAM_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF66", size: size });
        case "WATERMELON_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF49", size: size });
        case "CAP_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDDE2", size: size });
        case "HAT_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDFA9", size: size });
        case "BUTTERFLY_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDD8B", size: size });
        case "CHOCOLATE_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF6B", size: size });
        case "CHAIR_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDE91", size: size });
        case "SLICED_WATERMELON_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83C\uDF49", size: size });
        case "CHILD_SVG": return (0, jsx_runtime_1.jsx)(exports.EmojiItemSvg, { emoji: "\uD83E\uDDD2", size: size });
        default: return (0, jsx_runtime_1.jsx)(exports.CounterSvg, { size: size });
    }
}
