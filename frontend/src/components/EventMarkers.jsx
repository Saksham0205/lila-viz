/**
 * EventMarkers — pure utility module.
 *
 * Actual drawing is performed in MapViewer.jsx's drawMarker() function.
 * This module exports marker metadata used by Legend.jsx and FilterPanel.jsx.
 */

export const MARKER_META = [
  {
    events:  ["Kill", "BotKill"],
    toggleKey: "kills",
    icon:    "⚔",
    color:   "#ff1744",
    label:   "Kill",
  },
  {
    events:  ["Killed", "BotKilled"],
    toggleKey: "deaths",
    icon:    "💀",
    color:   "#ffffff",
    label:   "Death",
  },
  {
    events:  ["KilledByStorm"],
    toggleKey: "storm_deaths",
    icon:    "⚡",
    color:   "#ce93d8",
    label:   "Storm Death",
  },
  {
    events:  ["Loot"],
    toggleKey: "loot",
    icon:    "💎",
    color:   "#ffd740",
    label:   "Loot",
  },
];

export const MARKER_EVENTS = MARKER_META.flatMap((m) => m.events);

export const EVENT_TO_TOGGLE = Object.fromEntries(
  MARKER_META.flatMap(({ events, toggleKey }) =>
    events.map((e) => [e, toggleKey])
  )
);
