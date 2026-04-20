import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// ======================
// 🔴 ESCRIBIR LOG
// ======================
function writeLog(data) {
  const fecha = new Date().toISOString().slice(0, 7);
  const logPath = path.join(process.cwd(), `logs-${fecha}.txt`);

  const line = JSON.stringify({
    ...data,
    fecha: new Date().toISOString()
  });

  fs.appendFileSync(logPath, line + "\n");
}

// ======================
// 📥 ENDPOINT MANUAL (opcional debug)
// ======================
router.post("/logs", (req, res) => {
  try {
    writeLog(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error escribiendo log" });
  }
});

// ======================
// 📤 LEER LOGS
// ======================
router.get("/logs", (req, res) => {
  try {
    const fecha = new Date().toISOString().slice(0, 7);
    const logPath = path.join(process.cwd(), `logs-${fecha}.txt`);

    if (!fs.existsSync(logPath)) {
      return res.json([]);
    }

    const data = fs.readFileSync(logPath, "utf-8");

    const logs = data
      .split("\n")
      .filter(Boolean)
      .map(line => JSON.parse(line));

    res.json(logs);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error leyendo logs" });
  }
});

export default router;