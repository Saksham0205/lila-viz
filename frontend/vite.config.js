import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function firstNonCommentLine(filePath) {
  if (!fs.existsSync(filePath)) return "";
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    return s;
  }
  return "";
}

/** Local: from api_url.local. Production build: set VITE_API_URL (e.g. on Render). */
function getApiBase() {
  const fromEnv = (process.env.VITE_API_URL || "").trim();
  if (fromEnv) return fromEnv;
  return firstNonCommentLine(path.join(__dirname, "api_url.local"));
}

const apiBase = getApiBase();

export default defineConfig({
  plugins: [react()],
  define: {
    __API_BASE__: JSON.stringify(apiBase),
  },
  server: {
    proxy: {
      "/api": {
        target: apiBase || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
