import express from "express";
import pool from "../db.js";

const router = express.Router();

// GET /api/socios → listar todos los socios
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM socios ORDER BY nro_socio"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo socios:", err);
    res.status(500).json({ error: "Error al obtener socios" });
  }
});

export default router;