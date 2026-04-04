"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAdditionChoreography = exports.generateStoryChoreography = void 0;
var TreeBranch_1 = require("./assets/items/TreeBranch");
// Map bird positions for the mock generator (matching the logic in getBirdPositions)
var BIRD_Y = 1280;
var splitNarrationSentences = function (text) {
    var normalized = String(text || "").trim();
    if (!normalized)
        return [];
    return normalized
        .split(/(?<=[.!?])\s+/)
        .map(function (part) { return part.trim(); })
        .filter(Boolean);
};
var narrationSentenceStarts = function (narration, totalFrames) {
    var sentences = splitNarrationSentences(narration);
    if (!sentences.length) {
        return [];
    }
    var wordCounts = sentences.map(function (sentence) {
        return sentence.split(/\s+/).filter(Boolean).length;
    });
    var totalWords = wordCounts.reduce(function (sum, count) { return sum + count; }, 0) || 1;
    var starts = [0];
    var consumed = 0;
    for (var i = 0; i < wordCounts.length - 1; i += 1) {
        consumed += wordCounts[i];
        var start = Math.round((consumed / totalWords) * totalFrames);
        starts.push(Math.min(totalFrames - 1, Math.max(0, start)));
    }
    return starts;
};
var generateStoryChoreography = function (total, amount, itemType, environment, timings) {
    var _a, _b, _c, _d, _e, _f;
    var gap = total <= 1 ? 0 : (TreeBranch_1.SVG_BRANCH_RIGHT - TreeBranch_1.SVG_BRANCH_LEFT) / (total - 1);
    var getBirdX = function (i) { return total === 1 ? (TreeBranch_1.SVG_BRANCH_LEFT + TreeBranch_1.SVG_BRANCH_RIGHT) / 2 : TreeBranch_1.SVG_BRANCH_LEFT + i * gap; };
    var remaining = total - amount;
    // The LLM often sends the subtraction narration split across multiple scenes (e.g. 3 audio files).
    // We must SUM the total audio space across all subscenes so the animation spans the whole dialogue correctly.
    var totalDuration = timings.reduce(function (sum, t) { return sum + (t.dur || 0); }, 0) || 300;
    var narration = String(((_b = (_a = timings[0]) === null || _a === void 0 ? void 0 : _a.scene) === null || _b === void 0 ? void 0 : _b.narration) || "");
    var sentenceStarts = narrationSentenceStarts(narration, totalDuration);
    var quarter = totalDuration * 0.25;
    var act2Start = (_c = sentenceStarts[1]) !== null && _c !== void 0 ? _c : quarter;
    var act3Start = (_d = sentenceStarts[2]) !== null && _d !== void 0 ? _d : quarter * 2;
    var act4Start = (_e = sentenceStarts[3]) !== null && _e !== void 0 ? _e : quarter * 3;
    var act5Start = (_f = sentenceStarts[4]) !== null && _f !== void 0 ? _f : Math.min(totalDuration - 1, act4Start + Math.round(0.25 * totalDuration));
    return {
        environment: "TREE_BRANCH",
        actors: Array.from({ length: total }).map(function (_, i) { return ({
            id: "actor-".concat(i),
            type: (itemType || "BIRD_SVG"),
            colorIndex: i,
            startX: getBirdX(i) - 55, // Center offset for 110px bird
            startY: BIRD_Y,
        }); }),
        events: __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], Array.from({ length: total }).map(function (_, i) { return ({
            targetId: "actor-".concat(i),
            startFrame: 8 + i * 5,
            action: "POP_IN",
            text: "".concat(i + 1), // Show badge 1-N
        }); }), true), Array.from({ length: amount }).map(function (_, index) {
            var i = total - 1 - index; // rightmost birds fly away
            return {
                targetId: "actor-".concat(i),
                startFrame: act2Start + index * 8,
                action: "FLY_AWAY_ARC",
                endX: 600 + i * 40,
            };
        }), true), Array.from({ length: remaining }).map(function (_, i) { return ({
            targetId: "actor-".concat(i),
            startFrame: act2Start,
            action: "WOBBLE",
        }); }), true), Array.from({ length: remaining }).map(function (_, i) { return ({
            targetId: "actor-".concat(i),
            startFrame: act3Start + i * 15, // slower counting
            action: "SHOW_COUNT_BADGE",
            text: "".concat(i + 1),
        }); }), true), [
            // --- ACT 4: GLOBAL EQUATION ---
            {
                targetId: "scene",
                startFrame: Math.max(0, act4Start - 15), // slight lead in for equation pop
                action: "SHOW_EQUATION",
                text: "".concat(total, " \u2212 ").concat(amount, " = ").concat(remaining),
            },
            // --- CONFETTI ---
            {
                targetId: "scene",
                startFrame: act5Start,
                action: "CONFETTI",
            }
        ], false),
    };
};
exports.generateStoryChoreography = generateStoryChoreography;
var generateAdditionChoreography = function (amount1, amount2, itemType, environment, timings) {
    var _a, _b, _c, _d, _e, _f;
    var total = amount1 + amount2;
    var gap = total <= 1 ? 0 : (TreeBranch_1.SVG_BRANCH_RIGHT - TreeBranch_1.SVG_BRANCH_LEFT) / (total - 1);
    var getBirdX = function (i) { return total === 1 ? (TreeBranch_1.SVG_BRANCH_LEFT + TreeBranch_1.SVG_BRANCH_RIGHT) / 2 : TreeBranch_1.SVG_BRANCH_LEFT + i * gap; };
    // Predict total run length based on the incoming narration cuts
    var totalDuration = timings.reduce(function (sum, t) { return sum + (t.dur || 0); }, 0) || 300;
    var narration = String(((_b = (_a = timings[0]) === null || _a === void 0 ? void 0 : _a.scene) === null || _b === void 0 ? void 0 : _b.narration) || "");
    var sentenceStarts = narrationSentenceStarts(narration, totalDuration);
    // Logical Acts for Addition:
    // Act 1: Initial Group Pop In
    // Act 2: New arrivals join
    // Act 3: Counting / celebrating
    // Act 4: Equation conclusion
    var quarter = totalDuration * 0.25;
    var act2Start = (_c = sentenceStarts[1]) !== null && _c !== void 0 ? _c : quarter;
    var act3Start = (_d = sentenceStarts[2]) !== null && _d !== void 0 ? _d : quarter * 2;
    var act4Start = (_e = sentenceStarts[3]) !== null && _e !== void 0 ? _e : quarter * 3;
    var act5Start = (_f = sentenceStarts[4]) !== null && _f !== void 0 ? _f : Math.min(totalDuration - 1, act4Start + Math.round(0.25 * totalDuration));
    return {
        environment: environment === "PLAIN" ? "PLAIN" : "TREE_BRANCH",
        actors: Array.from({ length: total }).map(function (_, i) { return ({
            id: "actor-".concat(i),
            type: (itemType || "CHILD_SVG"),
            colorIndex: i,
            startX: getBirdX(i) - 55, // Center offset
            startY: BIRD_Y,
        }); }),
        events: __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], Array.from({ length: amount1 }).map(function (_, i) { return ({
            targetId: "actor-".concat(i),
            startFrame: 8 + i * 5,
            action: "POP_IN",
        }); }), true), Array.from({ length: amount2 }).map(function (_, index) {
            var i = amount1 + index;
            return {
                targetId: "actor-".concat(i),
                startFrame: act2Start + index * 8,
                action: "POP_IN", // Pop in next to the first group exactly when the voice triggers
            };
        }), true), Array.from({ length: total }).map(function (_, i) { return ({
            targetId: "actor-".concat(i),
            startFrame: act3Start - 10, // Just before counting starts
            action: "WOBBLE",
        }); }), true), Array.from({ length: total }).map(function (_, i) { return ({
            targetId: "actor-".concat(i),
            startFrame: act3Start + i * 15, // Slow, paced counting
            action: "SHOW_COUNT_BADGE",
            text: "".concat(i + 1),
        }); }), true), [
            // --- ACT 4: GLOBAL EQUATION STAMP ---
            {
                targetId: "scene",
                startFrame: act4Start - 15,
                action: "SHOW_EQUATION",
                text: "".concat(amount1, " + ").concat(amount2, " = ").concat(total),
            },
            // --- END SCENE CONFETTI ---
            {
                targetId: "scene",
                startFrame: act5Start,
                action: "CONFETTI",
            }
        ], false),
    };
};
exports.generateAdditionChoreography = generateAdditionChoreography;
