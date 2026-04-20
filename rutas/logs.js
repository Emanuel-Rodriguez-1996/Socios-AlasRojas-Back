import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// ======================
// 🔴 GUARDAR LOG
// ======================
export function guardarLog(data) {
  try {
     // 🛑 SOLO TESORERO o OTROS
    if (data.operador === "Admin") return;

    const fecha = new Date().toISOString().slice(0, 7);
    const logPath = path.join(process.cwd(), `logs-${fecha}.txt`);

    const line = JSON.stringify({
      ...data,
      fecha: new Date().toISOString()
    });

    fs.appendFileSync(logPath, line + "\n");

  } catch (err) {
    console.error("Error guardando log:", err);
  }
}

// ======================
// 🗑 BORRAR TODOS LOS LOGS
// ======================
router.delete("/", (req, res) => {
  try {
    const dir = process.cwd();
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      if (file.startsWith("logs-") && file.endsWith(".txt")) {
        fs.unlinkSync(path.join(dir, file));
      }
    });

    res.json({ ok: true, message: "Todos los logs eliminados" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error borrando logs" });
  }
});

// ======================
// 📥 CREAR LOG (DEBUG)
// ======================
router.post("/", (req, res) => {
  try {
    guardarLog(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error escribiendo log" });
  }
});

// ======================
// 📤 LEER LOGS
// ======================
router.get("/", (req, res) => {
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