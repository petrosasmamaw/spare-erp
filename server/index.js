const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { initSchema } = require("./schema");
const apiRoutes = require("./routes");

const app = express();
const port = Number(process.env.API_PORT || 4000);

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
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
