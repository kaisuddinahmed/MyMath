/**
 * Remotion Render API Server
 *
 * Tiny Express service that accepts a director script JSON,
 * bundles the Remotion project, and renders an MP4 via headless Chrome.
 *
 * POST /render
 *   body: { script: DirectorScript, audioUrl?: string, outputName?: string }
 *   returns: { outputPath: string, durationSeconds: number }
 */

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const RENDER_PORT = Number(process.env.REMOTION_PORT || 1235);
const OUTPUT_DIR = path.resolve(__dirname, "..", "backend", "video_engine", "output");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let bundled = null;

async function ensureBundle() {
  if (bundled) return bundled;

  const { bundle } = require("@remotion/bundler");
  console.log("[remotion] Bundling project...");
  const entryPoint = path.resolve(__dirname, "src", "index.ts");
  bundled = await bundle({
    entryPoint,
    // Enable webpack caching for fast rebuilds
    webpackOverride: (config) => config,
  });
  console.log("[remotion] Bundle ready.");
  return bundled;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "remotion-renderer" });
});

// Render endpoint
app.post("/render", async (req, res) => {
  const { script, audioUrl, outputName } = req.body;

  if (!script || !Array.isArray(script.scenes) || script.scenes.length === 0) {
    return res.status(400).json({ error: "Invalid script: must include non-empty scenes array" });
  }

  try {
    const serveUrl = await ensureBundle();

    const { renderMedia, selectComposition } = require("@remotion/renderer");

    const inputProps = { script, audioUrl };

    const composition = await selectComposition({
      serveUrl,
      id: "MathVideo",
      inputProps,
    });

    const outputFile = path.join(
      OUTPUT_DIR,
      (outputName || `render-${Date.now()}.mp4`).replace(/[^a-zA-Z0-9._-]/g, "_")
    );

    console.log(`[remotion] Rendering ${composition.durationInFrames} frames → ${outputFile}`);

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputFile,
      inputProps,
      chromiumOptions: {
        enableMultiProcessOnLinux: true,
      },
    });

    const durationSeconds = Math.round(composition.durationInFrames / composition.fps);

    console.log(`[remotion] Done: ${outputFile} (${durationSeconds}s)`);
    res.json({
      outputPath: outputFile,
      outputName: path.basename(outputFile),
      durationSeconds,
    });
  } catch (err) {
    console.error("[remotion] Render error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(RENDER_PORT, () => {
  console.log(`[remotion] Render API listening on http://localhost:${RENDER_PORT}`);
  // Pre-bundle at startup
  ensureBundle().catch((err) => console.error("[remotion] Pre-bundle failed:", err));
});
