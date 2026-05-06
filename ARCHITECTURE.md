# LILA Viz — Architecture

## Tech Stack Choices

| Choice | Reasoning |
|--------|-----------|
| **FastAPI** | Async, auto-generates OpenAPI docs, minimal boilerplate, excellent type support. Ideal for a small analytics API that needs to be fast. |
| **pandas + pyarrow** | Parquet is a columnar format; pyarrow reads it natively. pandas provides powerful group-by/filter operations for aggregating heatmaps. |
| **React + Vite** | Vite gives instant HMR and tree-shaking. React's component model maps cleanly onto the "panel + map + timeline" UI. |
| **Canvas 2D API** | Leaflet.js is heavy and designed for geographic tile maps. Since we already have pixel coordinates after the world→minimap conversion, a plain canvas is faster, simpler, and avoids Leaflet's CRS complexities. |
| **heatmap.js** | Pure JS, no Leaflet dependency, renders gaussian blobs directly on a canvas, small bundle. |
| **Render + Vercel** | Render runs the FastAPI service with native Python build/start commands and `$PORT`. Vercel is optimal for static React builds. Both have free tiers (Render free tier may cold-start). |

---

## Data Flow

```
player_data/*.nakama-0
      │  (pyarrow.parquet.read_table at startup)
      ▼
  pandas DataFrame (all 5 days, all players in memory)
      │  enriched with: is_bot, player_type, date
      │  decoded: event bytes → str
      ▼
  FastAPI endpoints (no per-request I/O)
      │  coordinate_utils.world_to_pixel() applied before serialisation
      ▼
  JSON over HTTP
      │
      ▼
  React state (matchData, heatmapData)
      │
      ▼
  Canvas 2D drawPath() / drawMarker()
      │  scaled by: scale = displaySize / 1024
      ▼
  Browser screen
```

---

## Coordinate Mapping

World space uses a right-handed coordinate system where `x` is east, `z` is north, and `y` is elevation (ignored for 2D maps).

The minimap image origin is **top-left** (pixel (0,0)), which means the v-axis is flipped relative to world z.

```python
MAP_CONFIG = {
    "AmbroseValley": {"scale": 900,  "origin_x": -370, "origin_z": -473},
    "GrandRift":     {"scale": 581,  "origin_x": -290, "origin_z": -290},
    "Lockdown":      {"scale": 1000, "origin_x": -500, "origin_z": -500},
}
IMAGE_SIZE = 1024

def world_to_pixel(x, z, map_id):
    cfg = MAP_CONFIG[map_id]
    u = (x - cfg["origin_x"]) / cfg["scale"]     # [0, 1] normalised
    v = (z - cfg["origin_z"]) / cfg["scale"]     # [0, 1] normalised
    pixel_x = u * IMAGE_SIZE
    pixel_y = (1 - v) * IMAGE_SIZE               # Y FLIPPED
    return pixel_x, pixel_y
```

The `origin_x`/`origin_z` values are the world coordinates that correspond to the **bottom-left** corner of the image. `scale` is the world-unit width of the map.

---

## Assumptions

1. All minimap images are exactly 1024 × 1024 pixels.
2. `map_id` inside Parquet rows exactly matches the keys in `MAP_CONFIG`.
3. Filenames follow `{user_id}_{match_id}.nakama-0` with exactly one `_` separating the two IDs (UUID user IDs may contain `_` but rsplit("_", 1) ensures only the last segment is used as match_id — this works because match IDs are also UUID-format).
4. `ts` is milliseconds elapsed within the match (not a wall-clock timestamp).
5. A user may appear in multiple matches; each file is one player-in-one-match.

---

## Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| Load all data at startup | Zero per-request I/O, instant responses | High memory usage (~hundreds of MB for 5 days) |
| Canvas 2D instead of Leaflet | Simple, fast, no CRS complexity | No built-in zoom/pan (could add transform later) |
| Path thinning to 200 pts | Smooth 60 fps rendering | Some spatial precision lost for very long sessions |
| Heatmap cap at 5,000 pts | Consistent API response time | Very dense maps may under-represent certain areas |
| All data served as JSON | Simple, works anywhere | Larger payload than binary formats (protobuf etc.) |
