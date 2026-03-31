import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export type BgTheme =
  | "sky"       // addition — sky blue + clouds
  | "sunset"    // subtraction — warm orange/coral
  | "forest"    // multiplication — green
  | "candy"     // fractions — pink/purple
  | "ocean"     // data/geometry — teal
  | "default";  // fallback — indigo

const THEMES: Record<BgTheme, { top: string; bottom: string; ground: string; cloudColor: string }> = {
  sky:     { top: "#87CEEB", bottom: "#E0F4FF", ground: "#7EC850", cloudColor: "#FFFFFF" },
  sunset:  { top: "#FF8C69", bottom: "#FFD580", ground: "#E8A045", cloudColor: "#FFD580" },
  forest:  { top: "#52BE80", bottom: "#A9DFBF", ground: "#27AE60", cloudColor: "#D5F5E3" },
  candy:   { top: "#F06292", bottom: "#F8BBD9", ground: "#BA68C8", cloudColor: "#FFFFFF" },
  ocean:   { top: "#26B4C5", bottom: "#B2EBF2", ground: "#00838F", cloudColor: "#E0F7FA" },
  default: { top: "#4C6EF5", bottom: "#A5B4FC", ground: "#3B5BDB", cloudColor: "#E8EAFD" },
};

/** A simple decorative cloud shape made of overlapping circles */
const Cloud: React.FC<{ x: number; y: number; scale: number; color: string; swayOffset?: number }> = ({
  x, y, scale, color, swayOffset = 0,
}) => {
  const frame = useCurrentFrame();
  const sway = Math.sin((frame + swayOffset) / 50) * 8;
  return (
    <div style={{ position: "absolute", left: x + sway, top: y, transform: `scale(${scale})`, transformOrigin: "left top" }}>
      {[
        { w: 90, h: 70, l: 0,   t: 30 },
        { w: 110, h: 90, l: 60,  t: 10 },
        { w: 80,  h: 65, l: 140, t: 30 },
        { w: 70,  h: 60, l: 195, t: 45 },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.l, top: c.t,
            width: c.w, height: c.h,
            borderRadius: "50%",
            backgroundColor: color,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
};

export const CartoonBackground: React.FC<{ theme?: BgTheme }> = ({ theme = "default" }) => {
  const t = THEMES[theme];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Sky gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, ${t.top} 0%, ${t.bottom} 65%, ${t.ground} 65%, ${t.ground} 100%)`,
        }}
      />

      {/* Clouds */}
      <Cloud x={40}   y={80}   scale={1.1} color={t.cloudColor} swayOffset={0}  />
      <Cloud x={500}  y={130}  scale={0.85} color={t.cloudColor} swayOffset={40} />
      <Cloud x={730}  y={60}   scale={1.0}  color={t.cloudColor} swayOffset={20} />

      {/* Subtle grass bumps on horizon line */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: i * 260 - 40,
            top: "calc(65% - 40px)",
            width: 220,
            height: 80,
            borderRadius: "50%",
            backgroundColor: t.ground,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
};

/** Map topic strings to background themes */
export function themeForTopic(topic: string): BgTheme {
  const t = topic?.toLowerCase() || "";
  if (t.includes("add"))      return "sky";
  if (t.includes("sub"))      return "sunset";
  if (t.includes("mult") || t.includes("times")) return "forest";
  if (t.includes("fract") || t.includes("div"))  return "candy";
  if (t.includes("data") || t.includes("geom") || t.includes("meas")) return "ocean";
  return "default";
}
