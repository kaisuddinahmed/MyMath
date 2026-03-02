import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, interpolate } from "remotion";
import type { DirectorScene } from "../../types";

export const DataScene: React.FC<{ scene: DirectorScene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const progress = spring({
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
    return (
      <div style={{ display: "flex", alignItems: "flex-end", height: 400, gap: 20, borderBottom: "4px solid #94a3b8", paddingBottom: 10, paddingLeft: 10, borderLeft: "4px solid #94a3b8" }}>
        {dataItems.map((d, i) => {
          // Normalize height to max 350px
          const normHeight = (d.value / maxValue) * 350;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ 
                width: 60, 
                height: normHeight * progress, 
                backgroundColor: colors[i % colors.length],
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                paddingTop: 10
              }}>
                <span style={{ color: "white", fontWeight: "bold", opacity: Math.max(0, interpolate(progress, [0.8, 1], [0, 1])) }}>{d.value}</span>
              </div>
              <span style={{ color: "#f8fafc", fontSize: 20, fontWeight: "bold" }}>{d.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPieChart = () => {
    // Basic pie chart logic
    const total = dataItems.reduce((acc, d) => acc + d.value, 0);
    let currentAngle = 0;
    
    // Animate rotation to spin while scaling
    const rotation = interpolate(progress, [0, 1], [-90, 0]);

    const gradients = dataItems.map((d, i) => {
      const pct = (d.value / total) * 100;
      const start = currentAngle;
      const end = currentAngle + pct;
      currentAngle = end;
      return `${colors[i % colors.length]} ${start}% ${end}%`;
    });

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 50 }}>
        <div
          style={{
            width: 350,
            height: 350,
            borderRadius: "50%",
            transform: `scale(${progress}) rotate(${rotation}deg)`,
            background: `conic-gradient(${gradients.join(', ')})`,
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
          }}
        />
        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 15, opacity: progress }}>
          {dataItems.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 15 }}>
              <div style={{ width: 20, height: 20, backgroundColor: colors[i % colors.length], borderRadius: 4 }} />
              <span style={{ color: "#f8fafc", fontSize: 24 }}>{d.label} - {Math.round((d.value/total)*100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", flexDirection: "column" }}>
      
      {scene.item_type === "BAR_CHART" && renderBarChart()}
      {scene.item_type === "PIE_CHART" && renderPieChart()}
      
      {/* Tally Marks - Quick fallback */}
      {scene.item_type === "TALLY_MARK" && (
        <div style={{ display: "flex", gap: 30, transform: `scale(${progress})` }}>
           {Array.from({ length: Math.ceil(dataItems[0]?.value || 12) / 5 }).map((_, groupIdx) => (
             <div key={groupIdx} style={{ position: "relative", width: 60, height: 100 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ position: "absolute", left: i * 15, width: 6, height: 100, backgroundColor: "#3b82f6", borderRadius: 3 }} />
                ))}
                {/* 5th cross-slash */}
                <div style={{ position: "absolute", top: 45, left: -10, width: 80, height: 6, backgroundColor: "#ef4444", transform: "rotate(-30deg)", borderRadius: 3 }} />
             </div>
           ))}
        </div>
      )}

      <h2 style={{ color: "white", fontSize: 40, marginTop: 60, opacity: progress, textAlign: "center", maxWidth: "80%" }}>
        {scene.narration}
      </h2>
    </AbsoluteFill>
  );
};
