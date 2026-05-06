"""
LILA Games — Player Journey Visualization API
FastAPI backend serving processed match data to the React frontend.
"""

import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from data_loader import (
    load_all_data,
    get_available_maps,
    get_filters_for_map,
    get_match_df,
    get_heatmap_df,
)
from coordinate_utils import world_to_pixel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")

# ---------------------------------------------------------------------------
# Colour palettes
# ---------------------------------------------------------------------------
HUMAN_COLORS = [
    "#4fc3f7", "#29b6f6", "#0288d1", "#00acc1", "#26c6da",
    "#80deea", "#4dd0e1", "#81c784", "#aed581", "#dce775",
    "#42a5f5", "#7986cb", "#9575cd", "#4db6ac", "#26a69a",
]
BOT_COLORS = [
    "#ff7043", "#ff5722", "#f4511e", "#e64a19", "#bf360c",
    "#ffa726", "#ff9800", "#fb8c00", "#ef6c00", "#e65100",
    "#ffca28", "#ffd54f", "#ffcc02", "#ff6f00", "#ff8f00",
]


def _pick_color(is_bot: bool, index: int) -> str:
    palette = BOT_COLORS if is_bot else HUMAN_COLORS
    return palette[index % len(palette)]


def _read_first_config_line(config_path: Path) -> Optional[str]:
    if not config_path.is_file():
        return None
    text = config_path.read_text(encoding="utf-8")
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if (line.startswith('"') and line.endswith('"')) or (
            line.startswith("'") and line.endswith("'")
        ):
            line = line[1:-1]
        return line
    return None


def _resolve_configured_path(backend_dir: Path, configured: str) -> str:
    expanded = os.path.expanduser(configured.strip())
    p = Path(expanded)
    if not p.is_absolute():
        p = (backend_dir / p).resolve()
    else:
        p = p.resolve()
    return str(p)


def _resolve_data_root() -> str:
    """
    Parquet root: PLAYER_DATA_PATH (.env or host env), else data_path.local,
    else ../player_data relative to backend/.
    """
    backend_dir = _BACKEND_DIR
    env_path = (os.environ.get("PLAYER_DATA_PATH") or "").strip()
    if env_path:
        return _resolve_configured_path(backend_dir, env_path)
    file_line = _read_first_config_line(backend_dir / "data_path.local")
    if file_line:
        return _resolve_configured_path(backend_dir, file_line)
    return str((backend_dir / ".." / "player_data").resolve())


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    data_root = _resolve_data_root()
    logger.info("Loading player data from: %s", data_root)
    load_all_data(data_root)
    logger.info("Data loaded — API ready.")
    yield


app = FastAPI(title="LILA Viz API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/maps")
def list_maps() -> list[str]:
    """Return available map names that have data."""
    return get_available_maps()


@app.get("/api/filters")
def get_filters(map_id: str = Query(...)):
    """Return available dates and match IDs for the given map."""
    info = get_filters_for_map(map_id)
    if not info["matches"]:
        raise HTTPException(status_code=404, detail=f"No data for map '{map_id}'")
    return info


@app.get("/api/match")
def get_match(
    match_id: str = Query(...),
    map_id: str = Query(...),
):
    """
    Return full match data with pixel coordinates already applied.
    Players are grouped; events sorted by ts.
    """
    df = get_match_df(match_id, map_id)
    if df.empty:
        raise HTTPException(status_code=404, detail="Match not found")

    # Use the actual map_id from the data (may differ from query param after fallback)
    actual_map_id = df["map_id"].iloc[0]

    # Convert world coords to pixels using the real map_id
    df[["px", "py"]] = df.apply(
        lambda row: world_to_pixel(row["x"], row["z"], row["map_id"]),
        axis=1,
        result_type="expand",
    )

    # Normalise timestamps: offset so the earliest event in the match starts at 0
    ts_min = df["ts"].min() if not df["ts"].isna().all() else 0
    df["ts_rel"] = (df["ts"] - ts_min).clip(lower=0)
    duration_ms = int(df["ts_rel"].max()) if not df["ts_rel"].isna().all() else 0

    players = []
    color_counters = {"human": 0, "bot": 0}

    for uid, player_df in df.groupby("user_id"):
        is_bot = bool(player_df["is_bot"].iloc[0])
        key = "bot" if is_bot else "human"
        color = _pick_color(is_bot, color_counters[key])
        color_counters[key] += 1

        player_df = player_df.sort_values("ts_rel")

        # Thin position paths to max 200 pts per player
        pos_mask = player_df["event"].isin(["Position", "BotPosition"])
        event_mask = ~pos_mask

        pos_df = player_df[pos_mask]
        evt_df = player_df[event_mask]

        if len(pos_df) > 200:
            step = max(1, len(pos_df) // 200)
            pos_df = pos_df.iloc[::step]

        combined = pd.concat([pos_df, evt_df]).sort_values("ts_rel")

        events = [
            {
                "ts": int(row["ts_rel"]) if not pd.isna(row["ts_rel"]) else 0,
                "px": round(float(row["px"]), 2),
                "py": round(float(row["py"]), 2),
                "event": row["event"],
            }
            for _, row in combined.iterrows()
        ]

        players.append({
            "user_id": uid,
            "is_bot": is_bot,
            "color": color,
            "events": events,
        })

    # Summary stats
    all_events = df["event"].value_counts().to_dict()
    kill_events = ["Kill", "BotKill"]
    total_kills = sum(all_events.get(e, 0) for e in kill_events)
    human_count = int(df[~df["is_bot"]]["user_id"].nunique())
    bot_count = int(df[df["is_bot"]]["user_id"].nunique())

    return {
        "match_id": match_id,
        "map_id": actual_map_id,
        "duration_ms": duration_ms,
        "stats": {
            "total_players": human_count + bot_count,
            "human_count": human_count,
            "bot_count": bot_count,
            "total_kills": total_kills,
            "duration_ms": duration_ms,
        },
        "players": players,
    }


@app.get("/api/heatmap")
def get_heatmap(
    map_id: str = Query(...),
    type: str = Query(...),
    date: Optional[str] = Query(None),
):
    """
    Return heatmap points for the given map, type, and optional date.
    Points are capped at 5,000.
    """
    valid_types = {"kills", "deaths", "storm_deaths", "traffic"}
    if type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type. Must be one of: {', '.join(valid_types)}",
        )

    df = get_heatmap_df(map_id, type, date)
    if df.empty:
        return {"points": []}

    # Convert to pixels
    df[["px", "py"]] = df.apply(
        lambda row: world_to_pixel(row["x"], row["z"], map_id),
        axis=1,
        result_type="expand",
    )

    # Cap at 5,000 points
    if len(df) > 5000:
        df = df.sample(5000, random_state=42)

    points = [
        {
            "px": round(float(row["px"]), 2),
            "py": round(float(row["py"]), 2),
            "weight": 1.0,
        }
        for _, row in df.iterrows()
    ]

    return {"points": points}


@app.get("/health")
def health():
    return {"status": "ok"}
