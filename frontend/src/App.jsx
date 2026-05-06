import React, { useState, useEffect, useCallback } from "react";
import FilterPanel from "./components/FilterPanel.jsx";
import MapViewer from "./components/MapViewer.jsx";
import TimelinePlayer from "./components/TimelinePlayer.jsx";
import Legend from "./components/Legend.jsx";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "";

export default function App() {
  // ── Selection state ──────────────────────────────────────────────────────
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [filters, setFilters] = useState({ dates: [], matches: [] });
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showHumans, setShowHumans] = useState(true);
  const [showBots, setShowBots] = useState(true);
  const [eventToggles, setEventToggles] = useState({
    kills: true, deaths: true, storm_deaths: true, loot: true,
  });
  const [heatmapType, setHeatmapType] = useState(null); // null = off

  // ── Data state ────────────────────────────────────────────────────────────
  const [matchData, setMatchData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Timeline state ────────────────────────────────────────────────────────
  const [currentTs, setCurrentTs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(20);

  // ── Load available maps on mount ─────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/maps`)
      .then((r) => r.json())
      .then((data) => {
        setMaps(data);
        if (data.length > 0) setSelectedMap(data[0]);
      })
      .catch(() => setError("Backend unavailable. Is the API server running?"));
  }, []);

  // ── Load filters when map changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedMap) return;
    setSelectedMatch(null);
    setMatchData(null);
    setHeatmapData(null);
    fetch(`${API}/api/filters?map_id=${encodeURIComponent(selectedMap)}`)
      .then((r) => r.json())
      .then((data) => {
        setFilters(data);
        setSelectedDates(data.dates);
      })
      .catch(() => setError("Failed to load filters."));
  }, [selectedMap]);

  // ── Load match data ───────────────────────────────────────────────────────
  useEffect(() => {
    // Guard: don't fetch if the selected match doesn't belong to the current map's filter list.
    // This prevents a stale selectedMatch from a previous map triggering a request
    // with the wrong map_id during map-switch state transitions.
    if (!selectedMatch || !selectedMap) return;
    if (filters.matches.length > 0 && !filters.matches.includes(selectedMatch)) return;
    setMatchLoading(true);
    setMatchData(null);
    setCurrentTs(0);
    setIsPlaying(false);
    setError(null);
    fetch(
      `${API}/api/match?match_id=${encodeURIComponent(selectedMatch)}&map_id=${encodeURIComponent(selectedMap)}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setMatchData(data);
        setMatchLoading(false);
      })
      .catch((e) => {
        setError(`Failed to load match: ${e.message}`);
        setMatchLoading(false);
      });
  }, [selectedMatch, selectedMap]);

  // ── Load heatmap data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!heatmapType || !selectedMap) {
      setHeatmapData(null);
      return;
    }
    setHeatmapLoading(true);
    const dateParam = selectedDates.length === 1
      ? `&date=${encodeURIComponent(selectedDates[0])}`
      : "";
    fetch(`${API}/api/heatmap?map_id=${encodeURIComponent(selectedMap)}&type=${heatmapType}${dateParam}`)
      .then((r) => r.json())
      .then((data) => {
        setHeatmapData(data.points);
        setHeatmapLoading(false);
      })
      .catch(() => {
        setHeatmapLoading(false);
      });
  }, [heatmapType, selectedMap, selectedDates]);

  // ── Timeline playback ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !matchData) return;
    const duration = matchData.duration_ms || 0;
    const interval = setInterval(() => {
      setCurrentTs((prev) => {
        const next = prev + 100 * playbackSpeed;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, matchData]);

  const handleToggleEvent = useCallback((key) => {
    setEventToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleMapChange = useCallback((m) => {
    setSelectedMap(m);
    setHeatmapType(null);
  }, []);

  return (
    <div className="app-shell">
      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-text">LILA</span>
          <span className="logo-sub">Player Journey Viz</span>
        </div>
        <FilterPanel
          maps={maps}
          selectedMap={selectedMap}
          onMapChange={handleMapChange}
          filters={filters}
          selectedDates={selectedDates}
          onDatesChange={setSelectedDates}
          selectedMatch={selectedMatch}
          onMatchChange={setSelectedMatch}
          showHumans={showHumans}
          onToggleHumans={() => setShowHumans((v) => !v)}
          showBots={showBots}
          onToggleBots={() => setShowBots((v) => !v)}
          eventToggles={eventToggles}
          onToggleEvent={handleToggleEvent}
          heatmapType={heatmapType}
          onHeatmapTypeChange={setHeatmapType}
        />
      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="main-content">
        {error && (
          <div className="error-banner">
            ⚠ {error}
          </div>
        )}

        <div className="map-area">
          {matchLoading && (
            <div className="loading-overlay">
              <div className="spinner" />
              <span>Loading match data…</span>
            </div>
          )}
          <MapViewer
            mapId={selectedMap}
            matchData={matchData}
            heatmapData={heatmapData}
            heatmapLoading={heatmapLoading}
            currentTs={currentTs}
            showHumans={showHumans}
            showBots={showBots}
            eventToggles={eventToggles}
            heatmapType={heatmapType}
          />
          {matchData && (
            <Legend />
          )}
          {matchData && (
            <div className="stats-overlay">
              <div className="stats-title">Match Stats</div>
              <div className="stats-row"><span>Players</span><span>{matchData.stats.total_players}</span></div>
              <div className="stats-row"><span>Humans</span><span className="stat-human">{matchData.stats.human_count}</span></div>
              <div className="stats-row"><span>Bots</span><span className="stat-bot">{matchData.stats.bot_count}</span></div>
              <div className="stats-row"><span>Kills</span><span>{matchData.stats.total_kills}</span></div>
              <div className="stats-row">
                <span>Duration</span>
                <span>{msToMMSS(matchData.stats.duration_ms)}</span>
              </div>
            </div>
          )}
          {!selectedMatch && !matchLoading && (
            <div className="empty-state">
              <div className="empty-icon">🗺</div>
              <div className="empty-text">Select a match to begin</div>
              <div className="empty-sub">Use the panel on the left to choose a map and match</div>
            </div>
          )}
        </div>

        <TimelinePlayer
          duration={matchData?.duration_ms || 0}
          currentTs={currentTs}
          onSeek={setCurrentTs}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((v) => !v)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          disabled={!matchData}
        />
      </main>
    </div>
  );
}

function msToMMSS(ms) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = Math.floor(ms / 1000);
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const millis = String(Math.floor(ms % 1000)).padStart(3, "0");
  return `${m}:${String(s % 60).padStart(2, "0")}.${millis}`;
}
