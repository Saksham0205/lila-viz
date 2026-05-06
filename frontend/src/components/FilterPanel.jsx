import React, { useState, useMemo } from "react";

const HEATMAP_OPTIONS = [
  { value: "kills",        label: "⚔ Kill Zones" },
  { value: "deaths",       label: "💀 Death Zones" },
  { value: "storm_deaths", label: "⚡ Storm Deaths" },
  { value: "traffic",      label: "🚶 Player Traffic" },
];

const EVENT_TOGGLES = [
  { key: "kills",        label: "Kills ⚔" },
  { key: "deaths",       label: "Deaths 💀" },
  { key: "storm_deaths", label: "Storm Deaths ⚡" },
  { key: "loot",         label: "Loot 💎" },
];

export default function FilterPanel({
  maps,
  selectedMap,
  onMapChange,
  filters,
  selectedDates,
  onDatesChange,
  selectedMatch,
  onMatchChange,
  showHumans,
  onToggleHumans,
  showBots,
  onToggleBots,
  eventToggles,
  onToggleEvent,
  heatmapType,
  onHeatmapTypeChange,
}) {
  const [matchSearch, setMatchSearch] = useState("");

  const filteredMatches = useMemo(() => {
    const q = matchSearch.toLowerCase();
    return filters.matches.filter((m) => m.toLowerCase().includes(q));
  }, [filters.matches, matchSearch]);

  const handleDateToggle = (date) => {
    if (selectedDates.includes(date)) {
      onDatesChange(selectedDates.filter((d) => d !== date));
    } else {
      onDatesChange([...selectedDates, date]);
    }
  };

  const handleHeatmapClick = (value) => {
    onHeatmapTypeChange(heatmapType === value ? null : value);
  };

  return (
    <div className="filter-panel">
      {/* ── Map selector ─────────────────────────────────────────────── */}
      <div className="filter-section">
        <div className="filter-label">Map</div>
        <div className="map-tabs">
          {maps.map((m) => (
            <button
              key={m}
              className={`map-tab ${selectedMap === m ? "active" : ""}`}
              onClick={() => onMapChange(m)}
            >
              {m === "AmbroseValley" ? "Ambrose" : m === "GrandRift" ? "GrandRift" : m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Date filter ──────────────────────────────────────────────── */}
      <div className="filter-section">
        <div className="filter-label">Date</div>
        <div className="check-list">
          {filters.dates.map((d) => (
            <label key={d} className="check-item">
              <input
                type="checkbox"
                checked={selectedDates.includes(d)}
                onChange={() => handleDateToggle(d)}
              />
              {d.replace("_", " ")}
            </label>
          ))}
        </div>
      </div>

      {/* ── Match selector ───────────────────────────────────────────── */}
      <div className="filter-section">
        <div className="filter-label">Match ({filters.matches.length} total)</div>
        <input
          className="match-search"
          type="text"
          placeholder="Search match ID…"
          value={matchSearch}
          onChange={(e) => setMatchSearch(e.target.value)}
        />
        <div className="match-list">
          {filteredMatches.map((m) => (
            <div
              key={m}
              className={`match-item ${selectedMatch === m ? "active" : ""}`}
              onClick={() => onMatchChange(m)}
              title={m}
            >
              {m.slice(0, 20)}…
            </div>
          ))}
          {filteredMatches.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "4px 0" }}>
              No matches found
            </div>
          )}
        </div>
      </div>

      {/* ── Player type ──────────────────────────────────────────────── */}
      <div className="filter-section">
        <div className="filter-label">Players</div>
        <div className="toggle-pair">
          <button
            className={`toggle-btn ${showHumans ? "active human" : ""}`}
            onClick={onToggleHumans}
          >
            🔵 Humans
          </button>
          <button
            className={`toggle-btn ${showBots ? "active bot" : ""}`}
            onClick={onToggleBots}
          >
            🟠 Bots
          </button>
        </div>
      </div>

      {/* ── Event toggles ────────────────────────────────────────────── */}
      <div className="filter-section">
        <div className="filter-label">Events</div>
        <div className="check-list">
          {EVENT_TOGGLES.map(({ key, label }) => (
            <label key={key} className="check-item">
              <input
                type="checkbox"
                checked={eventToggles[key] ?? true}
                onChange={() => onToggleEvent(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Heatmap ──────────────────────────────────────────────────── */}
      <div className="filter-section">
        <div className="filter-label">Heatmap Overlay</div>
        <div className="heatmap-options">
          {HEATMAP_OPTIONS.map(({ value, label }) => (
            <label key={value} className="heatmap-option">
              <input
                type="radio"
                name="heatmap"
                checked={heatmapType === value}
                onChange={() => handleHeatmapClick(value)}
                onClick={() => heatmapType === value && onHeatmapTypeChange(null)}
              />
              {label}
            </label>
          ))}
          {heatmapType && (
            <button
              onClick={() => onHeatmapTypeChange(null)}
              style={{
                marginTop: 4,
                background: "none",
                border: "1px solid var(--border)",
                color: "var(--text-dim)",
                borderRadius: "var(--radius)",
                padding: "4px 8px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              ✕ Clear heatmap
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
