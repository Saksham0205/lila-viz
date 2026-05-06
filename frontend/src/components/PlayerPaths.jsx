/**
 * PlayerPaths — pure utility module used by MapViewer's CanvasRenderer.
 *
 * The actual drawing happens inside MapViewer.jsx (drawPath / drawMarker).
 * This module exports helper functions for path thinning and colour mapping
 * that can be unit-tested independently.
 */

/**
 * Thin a position-event array to at most maxPoints entries.
 * Preserves first and last point.
 */
export function thinPath(events, maxPoints = 200) {
  if (events.length <= maxPoints) return events;
  const step = Math.ceil(events.length / maxPoints);
  const result = [];
  for (let i = 0; i < events.length; i++) {
    if (i === 0 || i === events.length - 1 || i % step === 0) {
      result.push(events[i]);
    }
  }
  return result;
}

/**
 * Return the subset of a player's position events up to currentTs.
 */
export function pathUpToTime(player, currentTs) {
  return player.events.filter(
    (e) =>
      (e.event === "Position" || e.event === "BotPosition") &&
      e.ts <= currentTs
  );
}
