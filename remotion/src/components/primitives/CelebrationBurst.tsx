import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Audio, staticFile } from "remotion";
import { Confetti } from "./Confetti";

interface CelebrationBurstProps {
  answer: string;
  startFrame?: number;
  messages?: string[];
}

const DEFAULT_MESSAGES = ["Great job! 🎉", "Amazing! 🎉", "Well done! 🥳"];

export const CelebrationBurst: React.FC<CelebrationBurstProps> = ({
  answer,
  startFrame = 0,
  messages = DEFAULT_MESSAGES,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;

  if (localFrame < 0) return null;

  // Big answer number bounces in
  const answerScale = spring({
    frame: localFrame,
    fps,
    config: { stiffness: 200, damping: 14 },
  });

  // Stars radiate outward
  const STARS = ["⭐", "✨", "🌟", "💫", "⭐", "✨"];
  const starProgress = interpolate(localFrame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Message fades in after answer pops
  const msgOpacity = spring({
    frame: Math.max(0, localFrame - 18),
    fps,
    config: { damping: 20 },
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Confetti particles */}
      <Confetti startFrame={startFrame} />

      {/* Celebration Fanfare Sound */}
      <Audio src={staticFile("tada.mp3")} />

      {/* Radiating star emojis */}
      {STARS.map((star, i) => {
        const angle = (i / STARS.length) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 280 * starProgress;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              fontSize: 48,
              opacity: 1 - starProgress * 0.6,
              transform: `translate(${x}px, ${y}px) scale(${1 + starProgress * 0.5})`,
              top: "50%",
              left: "50%",
              marginLeft: -24,
              marginTop: -24,
            }}
          >
            {star}
          </div>
        );
      })}

      {/* "Final Answer" label above the number */}
      <div
        style={{
          opacity: answerScale,
          transform: `translateY(${interpolate(answerScale, [0, 1], [15, 0])}px)`,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "'Nunito', 'Comic Sans MS', cursive",
            fontSize: 42,
            fontWeight: 800,
            color: "rgba(255,255,255,0.95)",
            textShadow: "0 3px 0 rgba(0,0,0,0.2)",
            letterSpacing: 2,
          }}
        >
          Final Answer
        </div>
      </div>

      {/* Big answer */}
      <div
        style={{
          transform: `scale(${answerScale})`,
          background: "linear-gradient(135deg, #FF6B6B, #FFD93D)",
          borderRadius: 40,
          padding: "32px 64px",
          boxShadow: "0 12px 0 rgba(0,0,0,0.18), 0 20px 40px rgba(0,0,0,0.25)",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "'Nunito', 'Comic Sans MS', cursive",
            fontSize: 140,
            fontWeight: 900,
            color: "#FFFFFF",
            textShadow: "0 6px 0 rgba(0,0,0,0.2)",
            lineHeight: 1,
          }}
        >
          {answer}
        </div>
      </div>

      {/* Celebration message */}
      <div
        style={{
          opacity: msgOpacity,
          transform: `translateY(${interpolate(msgOpacity, [0, 1], [20, 0])}px)`,
          textAlign: "center",
          padding: "0 60px",
        }}
      >
        <div
          style={{
            fontFamily: "'Nunito', 'Comic Sans MS', cursive",
            fontSize: 52,
            fontWeight: 800,
            color: "#FFFFFF",
            textShadow: "0 4px 0 rgba(0,0,0,0.25)",
            lineHeight: 1.3,
          }}
        >
          {messages[0]}
        </div>
        <div
          style={{
            fontFamily: "'Nunito', 'Comic Sans MS', cursive",
            fontSize: 38,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            marginTop: 16,
          }}
        >
          Practice more similar questions 🎯
        </div>
      </div>
    </div>
  );
};
