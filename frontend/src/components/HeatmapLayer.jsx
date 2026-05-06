import React, { useRef, useEffect } from "react";
import * as heatmapExports from "heatmap.js";

/** Resolve CommonJS default / namespace interop (Vite + heatmap.js 2.x). */
function getHeatmapFactory() {
  const mod = heatmapExports;
  const d = mod?.default ?? mod;
  if (d && typeof d.create === "function") return d;
  if (typeof mod.create === "function") return mod;
  return null;
}

/**
 * HeatmapLayer — renders heatmap.js on a canvas overlaid on the minimap.
 *
 * props:
 *   points   — [{px, py, weight}, …]  (pixel coords, 0-1024 range)
 *   scale    — number   minimap display scale factor
 *   size     — number   canvas display size in px
 *   loading  — bool
 */
export default function HeatmapLayer({ points, scale, size, loading }) {
  const containerRef = useRef(null);
  const heatmapInstanceRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    try {
      const h = getHeatmapFactory();
      if (!h) {
        console.error("heatmap.js: could not resolve create() export.");
        return;
      }

      const instance = h.create({
        container,
        radius: Math.max(10, 18 * scale),
        maxOpacity: 0.75,
        minOpacity: 0.0,
        blur: 0.85,
        gradient: {
          "0.0": "rgba(0,0,128,0)",
          "0.3": "#0d47a1",
          "0.5": "#1565c0",
          "0.65": "#00bcd4",
          "0.8": "#ffd600",
          "1.0": "#ff1744",
        },
      });

      const scaledPoints = (points || []).map((p) => ({
        x: Math.round(p.px * scale),
        y: Math.round(p.py * scale),
        value: p.weight ?? 1,
      }));

      instance.setData({
        max: 1,
        min: 0,
        data: scaledPoints,
      });

      heatmapInstanceRef.current = instance;
    } catch (e) {
      console.error("HeatmapLayer:", e);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      heatmapInstanceRef.current = null;
    };
  }, [points, scale, size]);

  return (
    <div
      ref={containerRef}
      className="heatmap-canvas"
      style={{
        position: "absolute",
        inset: 0,
        width: size,
        height: size,
        pointerEvents: "none",
        opacity: loading ? 0.3 : 1,
        transition: "opacity 0.3s",
      }}
    />
  );
}
