"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MathVideo = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const Scenes_1 = require("../components/Scenes");
const FractionScene_1 = require("../components/Scenes/FractionScene");
const GeometryScene_1 = require("../components/Scenes/GeometryScene");
const MeasurementScene_1 = require("../components/Scenes/MeasurementScene");
const DataScene_1 = require("../components/Scenes/DataScene");
const AlgebraScene_1 = require("../components/Scenes/AlgebraScene");
const NumberLineScene_1 = require("../components/Scenes/NumberLineScene");
const PlaceValueScene_1 = require("../components/Scenes/PlaceValueScene");
const ColumnArithmeticScene_1 = require("../components/Scenes/ColumnArithmeticScene");
const BODMASScene_1 = require("../components/Scenes/BODMASScene");
const EvenOddScene_1 = require("../components/Scenes/EvenOddScene");
const PercentageScene_1 = require("../components/Scenes/PercentageScene");
const SmallAdditionScene_1 = require("../components/Scenes/SmallAdditionScene");
const SmallSubtractionScene_1 = require("../components/Scenes/SmallSubtractionScene");
const NumberOrderingScene_1 = require("../components/Scenes/NumberOrderingScene");
const BG_COLOR = "#0F172A";
const FPS = 24;
function sceneComponent(scene) {
    switch (scene.action) {
        case "ADD_ITEMS":
        case "REMOVE_ITEMS":
        case "HIGHLIGHT":
            return (0, jsx_runtime_1.jsx)(Scenes_1.CounterScene, { scene: scene });
        case "GROUP_ITEMS":
            return (0, jsx_runtime_1.jsx)(Scenes_1.GroupScene, { scene: scene });
        case "SPLIT_ITEM":
            return (0, jsx_runtime_1.jsx)(FractionScene_1.FractionScene, { scene: scene });
        case "SHOW_EQUATION":
            return (0, jsx_runtime_1.jsx)(Scenes_1.EquationScene, { scene: scene });
        case "DRAW_SHAPE":
            return (0, jsx_runtime_1.jsx)(GeometryScene_1.GeometryScene, { scene: scene });
        case "MEASURE":
            return (0, jsx_runtime_1.jsx)(MeasurementScene_1.MeasurementScene, { scene: scene });
        case "PLOT_CHART":
            return (0, jsx_runtime_1.jsx)(DataScene_1.DataScene, { scene: scene });
        case "BALANCE":
            return (0, jsx_runtime_1.jsx)(AlgebraScene_1.AlgebraScene, { scene: scene });
        case "JUMP_NUMBER_LINE":
            return (0, jsx_runtime_1.jsx)(NumberLineScene_1.NumberLineScene, { scene: scene });
        case "SHOW_PLACE_VALUE":
            return (0, jsx_runtime_1.jsx)(PlaceValueScene_1.PlaceValueScene, { scene: scene });
        case "SHOW_BODMAS":
            return (0, jsx_runtime_1.jsx)(BODMASScene_1.BODMASScene, { scene: scene });
        case "SHOW_EVEN_ODD":
            return (0, jsx_runtime_1.jsx)(EvenOddScene_1.EvenOddScene, { scene: scene });
        case "SHOW_PERCENTAGE":
            return (0, jsx_runtime_1.jsx)(PercentageScene_1.PercentageScene, { scene: scene });
        default:
            return (0, jsx_runtime_1.jsx)(Scenes_1.CounterScene, { scene: scene });
    }
}
const MathVideo = ({ script, audioUrl, audioUrls, sceneDurations }) => {
    const { fps } = (0, remotion_1.useVideoConfig)();
    let currentFrame = 0;
    // Calculate scene starts
    // If `sceneDurations` is provided by Root `calculateMetadata`, use the exact audio lengths.
    // Otherwise, fallback to the ~150 wpm word-count strategy.
    const sceneStarts = script.scenes.map((scene, i) => {
        const start = currentFrame;
        let dur = 4 * fps;
        if (sceneDurations && sceneDurations[i]) {
            // Use exact duration calculated from the audio file
            dur = sceneDurations[i];
        }
        else if (!scene.narration || scene.narration.trim() === "") {
            dur = 4 * fps;
        }
        else {
            const wordCount = scene.narration.split(/\s+/).length;
            // 2.5 words per sec + 1.5 seconds of visual breathing room
            const estimatedSeconds = Math.max(3, (wordCount / 2.5) + 1.5);
            dur = Math.round(estimatedSeconds * fps);
        }
        currentFrame += dur;
        return { start, dur };
    });
    // Group scenes for continuous visual animation (e.g., Column Arithmetic)
    const visualGroups = [];
    script.scenes.forEach((scene, i) => {
        const timing = sceneStarts[i];
        const lastGroup = visualGroups[visualGroups.length - 1];
        // Group scenes that should share continuous visual state (e.g. Columns, Small Addition)
        if (lastGroup &&
            ((lastGroup.action === "SHOW_COLUMN_ARITHMETIC" && scene.action === "SHOW_COLUMN_ARITHMETIC") ||
                (lastGroup.action === "SHOW_SMALL_ADDITION" && scene.action === "SHOW_SMALL_ADDITION") ||
                (lastGroup.action === "SHOW_SMALL_SUBTRACTION" && scene.action === "SHOW_SMALL_SUBTRACTION") ||
                (lastGroup.action === "SHOW_NUMBER_ORDERING" && scene.action === "SHOW_NUMBER_ORDERING"))) {
            lastGroup.durationInFrames += timing.dur;
            lastGroup.subScenes.push({ scene, ...timing });
        }
        else {
            visualGroups.push({
                start: timing.start,
                durationInFrames: timing.dur,
                action: scene.action,
                subScenes: [{ scene, ...timing }]
            });
        }
    });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { backgroundColor: BG_COLOR }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.08) 0%, transparent 60%), " +
                        "radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.06) 0%, transparent 50%)",
                    pointerEvents: "none",
                } }), visualGroups.map((group, i) => ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: group.start, durationInFrames: group.durationInFrames, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { children: group.action === "SHOW_COLUMN_ARITHMETIC" ? ((0, jsx_runtime_1.jsx)(ColumnArithmeticScene_1.ColumnArithmeticScene, { groupedScenes: group.subScenes.map(s => s.scene), timings: group.subScenes })) : group.action === "SHOW_SMALL_ADDITION" ? ((0, jsx_runtime_1.jsx)(SmallAdditionScene_1.SmallAdditionScene, { groupedScenes: group.subScenes.map(s => s.scene), timings: group.subScenes })) : group.action === "SHOW_SMALL_SUBTRACTION" ? ((0, jsx_runtime_1.jsx)(SmallSubtractionScene_1.SmallSubtractionScene, { groupedScenes: group.subScenes.map(s => s.scene), timings: group.subScenes })) : group.action === "SHOW_NUMBER_ORDERING" ? ((0, jsx_runtime_1.jsx)(NumberOrderingScene_1.NumberOrderingScene, { groupedScenes: group.subScenes.map(s => s.scene), timings: group.subScenes })) : (sceneComponent(group.subScenes[0].scene)) }) }, `visual-${i}`))), script.scenes.map((scene, i) => (scene.action === "SHOW_COLUMN_ARITHMETIC" || scene.action === "SHOW_SMALL_ADDITION" || scene.action === "SHOW_SMALL_SUBTRACTION" || scene.action === "SHOW_NUMBER_ORDERING" ? null : ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: sceneStarts[i].start, durationInFrames: sceneStarts[i].dur, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { children: (0, jsx_runtime_1.jsx)(Scenes_1.NarrationBar, { text: scene.narration }) }) }, `narration-${i}`)))), audioUrls && audioUrls.length > 0 ? (audioUrls.map((url, i) => (url ? ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: sceneStarts[i].start + Math.round(fps * 0.5), children: (0, jsx_runtime_1.jsx)(remotion_1.Audio, { src: url }) }, i)) : null))) : audioUrl ? ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 0, children: (0, jsx_runtime_1.jsx)(remotion_1.Audio, { src: audioUrl }) })) : null] }));
};
exports.MathVideo = MathVideo;
