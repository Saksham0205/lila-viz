"""
Data loader: reads all .nakama-0 Parquet files, enriches them, and caches
the combined DataFrame in memory so API handlers never touch the filesystem
during a request.
"""

import os
import logging
from pathlib import Path
from typing import Optional

import pandas as pd
import pyarrow.parquet as pq

from coordinate_utils import world_to_pixel, get_supported_maps

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global in-memory cache
# ---------------------------------------------------------------------------
_master_df: Optional[pd.DataFrame] = None
_index: dict = {}          # {"map_id": {"dates": [...], "matches": [...]}}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _decode_events(df: pd.DataFrame) -> pd.DataFrame:
    """Decode the `event` column from bytes to str where needed."""
    df["event"] = df["event"].apply(
        lambda x: x.decode("utf-8") if isinstance(x, bytes) else x
    )
    return df


def _detect_bot(user_id: str) -> bool:
    """Bots have short numeric IDs; humans have UUID-format IDs."""
    return user_id.isdigit()


def _load_file(filepath: Path, date: str) -> Optional[pd.DataFrame]:
    """Load one .nakama-0 Parquet file and attach metadata columns."""
    try:
        df = pq.read_table(str(filepath)).to_pandas()
        df = _decode_events(df)

        # The match_id column inside the file includes the '.nakama-0' suffix —
        # strip it so queries work with clean UUIDs.
        if "match_id" in df.columns:
            df["match_id"] = (
                df["match_id"].str.replace(".nakama-0", "", regex=False)
            )

        # Ensure user_id is a plain string column
        if "user_id" in df.columns:
            df["user_id"] = df["user_id"].astype(str)

        # Bot detection from user_id (bots have short numeric IDs)
        df["is_bot"] = df["user_id"].apply(_detect_bot)
        df["player_type"] = df["is_bot"].map({True: "bot", False: "human"})
        df["date"] = date

        return df
    except Exception as exc:
        logger.error("Failed to load %s: %s", filepath, exc)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_all_data(data_root: str) -> None:
    """
    Walk all day folders under *data_root*, load every .nakama-0 file, and
    store the combined DataFrame in the module-level cache.

    Call once at application startup.
    """
    global _master_df, _index

    data_path = Path(data_root)
    if not data_path.exists():
        raise FileNotFoundError(
            f"Data root not found: {data_root}. "
            "Set the path in backend/data_path.local (see data_path.local.example)."
        )

    day_folders = sorted(
        d for d in data_path.iterdir()
        if d.is_dir() and d.name.startswith("February_")
    )

    frames: list[pd.DataFrame] = []
    file_count = 0

    for day_dir in day_folders:
        date_label = day_dir.name
        files = list(day_dir.glob("*.nakama-0"))
        logger.info("Loading %d files from %s …", len(files), date_label)
        for fp in files:
            df = _load_file(fp, date_label)
            if df is not None:
                frames.append(df)
                file_count += 1

    if not frames:
        raise RuntimeError(
            "No data files loaded — check backend/data_path.local and that "
            "day folders with *.nakama-0 Parquet files exist under that path."
        )

    combined = pd.concat(frames, ignore_index=True)

    # Cast all ArrowStringArray / object string columns to plain Python str (object dtype)
    # so that equality comparisons like df["match_id"] == "uuid-string" always work.
    for col in ("user_id", "match_id", "map_id", "event"):
        if col in combined.columns:
            combined[col] = combined[col].astype(str)

    # Ensure numeric types are correct
    for col in ("x", "y", "z"):
        if col in combined.columns:
            combined[col] = pd.to_numeric(combined[col], errors="coerce")

    # Convert ts to integer milliseconds (handles both int and datetime64)
    if "ts" in combined.columns:
        if pd.api.types.is_datetime64_any_dtype(combined["ts"]):
            # datetime64[ms] → int64 is already in ms; datetime64[ns] needs //1e6
            unit = combined["ts"].dtype.str  # e.g. "=M8[ms]" or "=M8[ns]"
            raw = combined["ts"].astype("int64")
            if "ns" in unit:
                raw = raw // 1_000_000
            combined["ts"] = raw
        else:
            combined["ts"] = pd.to_numeric(combined["ts"], errors="coerce")

    _master_df = combined
    _build_index()

    logger.info(
        "Loaded %d files → %d rows across %d unique maps.",
        file_count, len(_master_df), _master_df["map_id"].nunique()
    )


def _build_index() -> None:
    """Pre-compute per-map lists of dates and match IDs."""
    global _index
    _index = {}
    if _master_df is None:
        return
    for map_id in _master_df["map_id"].unique():
        sub = _master_df[_master_df["map_id"] == map_id]
        _index[map_id] = {
            "dates":   sorted(sub["date"].unique().tolist()),
            "matches": sorted(sub["match_id"].unique().tolist()),
        }


def get_master_df() -> pd.DataFrame:
    if _master_df is None:
        raise RuntimeError("Data not loaded. Call load_all_data() first.")
    return _master_df


def get_available_maps() -> list[str]:
    """Return maps present in both the data and the supported config."""
    if _master_df is None:
        return []
    supported = set(get_supported_maps())
    present = set(_master_df["map_id"].unique())
    return sorted(supported & present)


def get_filters_for_map(map_id: str) -> dict:
    return _index.get(map_id, {"dates": [], "matches": []})


def get_match_df(match_id: str, map_id: str) -> pd.DataFrame:
    """
    Return all rows for a specific match.
    Filters by match_id first; if map_id is also provided it is used as a hint
    but we fall back to whatever map the match actually lives on so a stale
    map_id in the URL never causes a spurious 404.
    """
    df = get_master_df()
    # Primary filter: exact match on both columns
    result = df[(df["match_id"] == match_id) & (df["map_id"] == map_id)].copy()
    # Fallback: match_id only (handles stale map_id from frontend race condition)
    if result.empty:
        result = df[df["match_id"] == match_id].copy()
    result.sort_values(["user_id", "ts"], inplace=True)
    return result


def get_heatmap_df(
    map_id: str,
    heatmap_type: str,
    date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Return a filtered DataFrame for heatmap generation.

    heatmap_type values:
        kills        → Kill, BotKill
        deaths       → Killed, BotKilled
        storm_deaths → KilledByStorm
        traffic      → Position, BotPosition (sampled every 5th row)
    """
    EVENT_FILTERS = {
        "kills":        ["Kill", "BotKill"],
        "deaths":       ["Killed", "BotKilled"],
        "storm_deaths": ["KilledByStorm"],
        "traffic":      ["Position", "BotPosition"],
    }
    events = EVENT_FILTERS.get(heatmap_type, [])

    df = get_master_df()
    mask = (df["map_id"] == map_id) & (df["event"].isin(events))
    if date:
        mask &= df["date"] == date

    result = df[mask].copy()

    if heatmap_type == "traffic":
        result = result.iloc[::5]  # every 5th row

    return result
