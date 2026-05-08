const path = require("path");
const { pathToFileURL } = require("url");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { initSchema } = require("./schema");
const apiRoutes = require("./routes");

const app = express();
const port = Number(process.env.API_PORT || 4000);
const webOrigins = (process.env.WEB_ORIGINS || process.env.WEB_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server and curl requests without an Origin header.
      if (!origin) return callback(null, true);
      if (webOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// Mount existing API routes
app.use("/api", apiRoutes);

// Mount Better Auth handler (ESM module) if available
async function mountAuthHandler() {
  try {
    const authModuleUrl = pathToFileURL(path.join(__dirname, "./auth.mjs")).href;
    const mod = await import(authModuleUrl);
    if (mod && mod.nodeHandler) {
      // Express v5 catch-all syntax
      app.all("/api/auth/{*any}", mod.nodeHandler);
      console.log("Mounted Better Auth handler at /api/auth/{*any}");
    }
  } catch (err) {
    console.warn("Better Auth handler not mounted:", err.message);
  }
}

// Keep JSON middleware after Better Auth handler to avoid request parsing conflicts.
app.use(express.json());

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
    await mountAuthHandler();
    await initSchema();
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to initialize API", error);
    process.exit(1);
  }
}

start();
