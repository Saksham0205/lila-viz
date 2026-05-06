import React, { useRef, useEffect, useState } from "react";
import HeatmapLayer from "./HeatmapLayer.jsx";
import { MARKER_EVENTS, EVENT_TO_TOGGLE } from "./EventMarkers.jsx";

const MAP_IMAGES = {
  AmbroseValley: "/minimaps/AmbroseValley_Minimap.png",
  GrandRift:     "/minimaps/GrandRift_Minimap.png",
  Lockdown:      "/minimaps/Lockdown_Minimap.jpg",
};

const IMAGE_SIZE = 1024;

export default function MapViewer({
  mapId,
  matchData,
  heatmapData,
  heatmapLoading,
  currentTs,
  showHumans,
  showBots,
  eventToggles,
  heatmapType,
}) {
  const wrapperRef  = useRef(null);
  const canvasRef   = useRef(null);
  const [scale, setScale] = useState(1);
  const [tooltip, setTooltip] = useState(null); // { x, y, content }

  // Compute display scale to fit 1024×1024 into available space
  useEffect(() => {
    const updateScale = () => {
      if (!wrapperRef.current) return;
      const parent = wrapperRef.current.parentElement;
      const available = Math.min(parent.clientWidth, parent.clientHeight) - 8;
      setScale(available / IMAGE_SIZE);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const displaySize = IMAGE_SIZE * scale;
  const imageSrc = mapId ? MAP_IMAGES[mapId] : null;

  return (
    <div
      ref={wrapperRef}
      className="map-wrapper"
      style={{ width: displaySize, height: displaySize }}
    >
      {imageSrc && (
        <img
          className="minimap-img"
          src={imageSrc}
          alt={`${mapId} minimap`}
          draggable={false}
        />
      )}

      {/* Heatmap canvas layer (below paths) */}
      {heatmapData && heatmapType && (
        <HeatmapLayer
          points={heatmapData}
          scale={scale}
          size={displaySize}
          loading={heatmapLoading}
        />
      )}

      {/* Paths + markers canvas layer */}
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        width={displaySize}
        height={displaySize}
        onMouseMove={(e) => handleMouseMove(e, canvasRef, matchData, currentTs, showHumans, showBots, eventToggles, setTooltip)}
        onMouseLeave={() => setTooltip(null)}
      />

      {matchData && (
        <CanvasRenderer
          canvasRef={canvasRef}
          matchData={matchData}
          currentTs={currentTs}
          showHumans={showHumans}
          showBots={showBots}
          eventToggles={eventToggles}
          scale={scale}
          size={displaySize}
        />
      )}

      {tooltip && (
        <div
          className="tooltip"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <div className="tooltip-title">{tooltip.title}</div>
          {tooltip.rows.map((r, i) => (
            <div key={i} className="tooltip-row">{r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Canvas renderer (draws paths + markers) ───────────────────────────────

function CanvasRenderer({ canvasRef, matchData, currentTs, showHumans, showBots, eventToggles, scale, size }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matchData) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    const players = matchData.players.filter((p) => {
      return (p.is_bot ? showBots : showHumans);
    });

    // Draw paths first
    players.forEach((player) => {
      drawPath(ctx, player, currentTs, scale);
    });

    // Draw markers on top
    players.forEach((player) => {
      drawMarkers(ctx, player, currentTs, eventToggles, scale);
    });
  }, [canvasRef, matchData, currentTs, showHumans, showBots, eventToggles, scale, size]);

  return null;
}

function drawPath(ctx, player, currentTs, scale) {
  const posEvents = player.events.filter(
    (e) => (e.event === "Position" || e.event === "BotPosition") && e.ts <= currentTs
  );
  if (posEvents.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = player.color;
  ctx.lineWidth = player.is_bot ? 1.5 : 2;
  ctx.globalAlpha = 0.75;

  if (player.is_bot) {
    ctx.setLineDash([4, 4]);
  } else {
    ctx.setLineDash([]);
  }

  const first = posEvents[0];
  ctx.moveTo(first.px * scale, first.py * scale);
  for (let i = 1; i < posEvents.length; i++) {
    ctx.lineTo(posEvents[i].px * scale, posEvents[i].py * scale);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawMarkers(ctx, player, currentTs, eventToggles, scale) {
  const markers = player.events.filter(
    (e) => MARKER_EVENTS.includes(e.event) && e.ts <= currentTs
  );

  markers.forEach((e) => {
    const toggleKey = EVENT_TO_TOGGLE[e.event];
    if (toggleKey && !eventToggles[toggleKey]) return;

    const cx = e.px * scale;
    const cy = e.py * scale;
    drawMarker(ctx, e.event, cx, cy);
  });
}

function drawMarker(ctx, eventType, cx, cy) {
  ctx.save();
  ctx.globalAlpha = 0.9;

  switch (eventType) {
    case "Kill":
    case "BotKill": {
      // Red X
      ctx.strokeStyle = "#ff1744";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy + 6);
      ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 6, cy + 6);
      ctx.stroke();
      break;
    }
    case "Killed":
    case "BotKilled": {
      // White skull circle
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();
      // Cross-bones lines
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
      ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
      ctx.stroke();
      break;
    }
    case "KilledByStorm": {
      // Purple circle
      ctx.fillStyle = "#ce93d8";
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      // Lightning stroke
      ctx.strokeStyle = "#e040fb";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx - 3, cy);
      ctx.lineTo(cx + 1, cy);
      ctx.lineTo(cx - 2, cy + 6);
      ctx.stroke();
      break;
    }
    case "Loot": {
      // Yellow diamond
      ctx.fillStyle = "#ffd740";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx + 4, cy);
      ctx.lineTo(cx, cy + 5);
      ctx.lineTo(cx - 4, cy);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default: break;
  }
  ctx.restore();
}

// ── Mouse hover detection ─────────────────────────────────────────────────

function handleMouseMove(e, canvasRef, matchData, currentTs, showHumans, showBots, eventToggles, setTooltip) {
  if (!matchData || !canvasRef.current) { setTooltip(null); return; }
  const rect = canvasRef.current.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const RADIUS = 10;
  let found = null;

  for (const player of matchData.players) {
    if (player.is_bot && !showBots) continue;
    if (!player.is_bot && !showHumans) continue;

    for (const ev of player.events) {
      if (ev.ts > currentTs) continue;
      if (!MARKER_EVENTS.includes(ev.event)) continue;
      const toggleKey = EVENT_TO_TOGGLE[ev.event];
      if (toggleKey && !eventToggles[toggleKey]) continue;

      const ex = ev.px * (rect.width / 1024);
      const ey = ev.py * (rect.height / 1024);
      const dist = Math.hypot(mx - ex, my - ey);

      if (dist < RADIUS) {
        found = { player, ev, ex, ey };
        break;
      }
    }
    if (found) break;
  }

  if (found) {
    const { player, ev } = found;
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      title: ev.event,
      rows: [
        `Player: ${player.user_id.slice(0, 12)}…`,
        `Type: ${player.is_bot ? "Bot" : "Human"}`,
        `Time: ${msToMMSS(ev.ts)}`,
      ],
    });
  } else {
    setTooltip(null);
  }
}

function msToMMSS(ms) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = Math.floor(ms / 1000);
  const millis = String(Math.floor(ms % 1000)).padStart(3, "0");
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.${millis}`;
}
