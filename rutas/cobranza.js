import express from "express";
import pool from "../db.js";

const router = express.Router();

// GET /api/cobranzas → listar cobranzas con datos del socio
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.mes,
        c.anio,
        c.fecha_pago,
        s.nro_socio,
        s.nombre
      FROM cobranzas c
      JOIN socios s ON s.nro_socio = c.nro_socio
      ORDER BY c.anio, c.mes
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo cobranzas:", err);
    res.status(500).json({ error: "Error al obtener cobranzas" });
  }
});

export default router;