const { getPool } = require("./erpHelpers");

async function health(_req, res) {
  try {
    await getPool().query("SELECT 1");
    res.json({ ok: true });
  } catch (_error) {
    res.status(500).json({ ok: false, error: "Database not reachable" });
  }
}

module.exports = { health };