import React from "react";

const LEGEND_ITEMS = [
  { type: "line",   color: "#4fc3f7",  label: "Human Player",  style: "solid" },
  { type: "line",   color: "#ff7043",  label: "Bot Player",    style: "dashed" },
  { type: "icon",   icon: "⚔",         label: "Kill" },
  { type: "icon",   icon: "💀",         label: "Death" },
  { type: "icon",   icon: "⚡",         label: "Storm Death" },
  { type: "icon",   icon: "💎",         label: "Loot" },
];

export default function Legend() {
  return (
    <div className="legend">
      <div className="legend-title">Legend</div>
      {LEGEND_ITEMS.map((item, i) => (
        <div key={i} className="legend-item">
          {item.type === "line" ? (
            <div
              className="legend-line"
              style={{
                background: "none",
                borderTop: item.style === "dashed"
                  ? `3px dashed ${item.color}`
                  : `3px solid ${item.color}`,
              }}
            />
          ) : (
            <span className="legend-icon">{item.icon}</span>
          )}
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
