import React, { useCallback } from "react";

const SPEEDS = [1, 5, 20, 50];

function msToMMSS(ms) {
  if (ms < 1000) {
    // Sub-second — show ms directly (e.g. "523 ms")
    return `${Math.round(ms)} ms`;
  }
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const millis = Math.floor(ms % 1000);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export default function TimelinePlayer({
  duration,
  currentTs,
  onSeek,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  disabled,
}) {
  const handleScrub = useCallback(
    (e) => {
      onSeek(Number(e.target.value));
    },
    [onSeek]
  );

  return (
    <div className={`timeline-bar ${disabled ? "disabled" : ""}`}>
      {/* Play / Pause */}
      <button className="play-btn" onClick={onTogglePlay} title={isPlaying ? "Pause" : "Play"}>
        {isPlaying ? "⏸" : "▶"}
      </button>

      {/* Scrubber */}
      <div className="timeline-scrubber-wrap">
        <input
          type="range"
          className="scrubber"
          min={0}
          max={duration || 1}
          value={currentTs}
          step={100}
          onChange={handleScrub}
        />
        <div className="timeline-timestamp">
          {msToMMSS(currentTs)} / {msToMMSS(duration)}
        </div>
      </div>

      {/* Speed buttons */}
      <div className="speed-btns">
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={`speed-btn ${playbackSpeed === s ? "active" : ""}`}
            onClick={() => onSpeedChange(s)}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
