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
| Backend hosting | Render |
| Frontend hosting | Vercel |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- The `player_data/` folder extracted somewhere on disk

### 1 — Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Point to your data folder (default: ../player_data)
set PLAYER_DATA_PATH=C:\path\to\player_data   # Windows
export PLAYER_DATA_PATH=/path/to/player_data                        # macOS/Linux

uvicorn main:app --reload --port 8000
```

API will be live at http://localhost:8000
Swagger docs at http://localhost:8000/docs

### 2 — Frontend

```bash
cd frontend
npm install

# (Optional) point at a deployed backend:
# Create frontend/.env.local with: VITE_API_URL=https://your-service.onrender.com

npm run dev
```

Frontend will be live at http://localhost:5173

### 3 — Copy minimap images

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

## Environment Variables

| Variable | Where | Default | Description |
|----------|-------|---------|-------------|
| `PLAYER_DATA_PATH` | backend | `../player_data` | Absolute path to extracted data folder |
| `VITE_API_URL` | frontend | `""` (same origin) | Backend base URL for production |

---

## Deployment

### Backend → Render
1. Push the repo to GitHub
2. **Option A — Blueprint:** in Render, **New → Blueprint**, connect the repo, and apply `render.yaml` at the repo root (defines `rootDir: backend`, build/start commands, `/health`).
3. **Option B — Web Service:** **New → Web Service**, connect the repo, set **Root Directory** to `backend`, **Build Command** `pip install -r requirements.txt`, **Start Command** `uvicorn main:app --host 0.0.0.0 --port $PORT` (same as `backend/Procfile`).
4. In **Environment**, set `PLAYER_DATA_PATH` to the path where your Parquet data lives on the instance (use a [persistent disk](https://render.com/docs/disks) if the dataset is not in the image).
5. Note: free web services may spin down after idle; first request after sleep can be slow.

### Frontend → Vercel
1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `frontend`
3. Add env var `VITE_API_URL=https://your-service.onrender.com` (your Render API URL, no trailing slash)
4. Deploy — `vercel.json` handles SPA routing

---

## Deployed URLs

- **Frontend:** https://lila-viz.vercel.app *(placeholder)*
- **Backend API:** https://lila-viz.onrender.com *(placeholder)*

---

## Quick API Reference

```
GET /api/maps                          → ["AmbroseValley", "GrandRift", "Lockdown"]
GET /api/filters?map_id=AmbroseValley  → {dates, matches}
GET /api/match?match_id=…&map_id=…    → full match with pixel coords
GET /api/heatmap?map_id=…&type=kills  → [{px, py, weight}, …]
GET /health                            → {status: "ok"}
```
