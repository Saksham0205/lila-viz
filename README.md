# LILA Games — Player Journey Visualization Tool

A production-quality web tool for Level Designers to explore player behavior on game maps.
Visualise movement paths, kills, deaths, storm events, loot pickups and heatmaps — all overlaid on the actual game minimap.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 + FastAPI |
| Data | pandas + pyarrow (Parquet) |
| Frontend | React 18 + Vite |
| Map rendering | Canvas 2D API |
| Heatmaps | heatmap.js |

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- The **`player_data`** bundle **on your machine** — this repo does **not** include match data. You (or your studio) extract or copy that folder somewhere such as next to the repo, under Documents, or on another drive. **Everyone’s path is different**, so you must configure it before the backend will load anything.

### 1 — Point the backend at your extracted `player_data` (required)

After you have `player_data` on disk:

1. In **`backend/`**, copy **`.env.example`** → **`.env`** (same folder).
2. Open **`backend/.env`** and set **`PLAYER_DATA_PATH`** to the full path of your **`player_data`** directory (the folder that contains the Parquet files and `minimaps/`, not a single file).
   - You may use an **absolute** path (recommended on Windows), or a path **relative to `backend/`** (e.g. `../player_data` if that folder sits beside `backend/`).

The API reads all Parquet files from this path **at startup**. If the path is wrong or the folder is missing, the app will not have map/match data.

### 2 — Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API will be live at http://localhost:8000  
Swagger docs at http://localhost:8000/docs

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

By default, `npm run dev` proxies `/api` to `http://localhost:8000`. If the backend runs on another origin, set **`VITE_API_URL`** (no trailing slash) in **`frontend/.env.local`**, or put the same URL on one line in **`frontend/api_url.local`** (see `frontend/api_url.local.example`).

Frontend will be live at http://localhost:5173

### 4 — Copy minimap images

The minimaps from `player_data/minimaps/` must be placed in `frontend/public/minimaps/`:

```
frontend/public/minimaps/AmbroseValley_Minimap.png
frontend/public/minimaps/GrandRift_Minimap.png
frontend/public/minimaps/Lockdown_Minimap.jpg
```

On Windows:

```powershell
Copy-Item "C:\path\to\player_data\minimaps\*" `
          "frontend\public\minimaps\" -Force
```

---

## Configuration files (local)

| File | Purpose |
|------|---------|
| **`backend/.env`** | **`PLAYER_DATA_PATH`** — path to your extracted `player_data` (**create from `backend/.env.example`; do not skip this**). |
| `backend/data_path.local` | Optional legacy single-line path file; used only if `PLAYER_DATA_PATH` is unset. |
| `frontend/api_url.local` | Optional; API base URL for dev when not using `VITE_API_URL`. |

Do not commit `.env`, `data_path.local`, or `api_url.local` — they are gitignored.

---

## Quick API Reference

```
GET /api/maps                          → ["AmbroseValley", "GrandRift", "Lockdown"]
GET /api/filters?map_id=AmbroseValley  → {dates, matches}
GET /api/match?match_id=…&map_id=…    → full match with pixel coords
GET /api/heatmap?map_id=…&type=kills  → [{px, py, weight}, …]
GET /health                            → {status: "ok"}
```
