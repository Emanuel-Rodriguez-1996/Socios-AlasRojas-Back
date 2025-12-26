import express from "express";
import pool from "../db.js";

const router = express.Router();

// 1. GET /api/cobranzas → Listar cobranzas (Soporta ?limit=X)
router.get("/", async (req, res) => {
  try {
    const { limit } = req.query;

    let queryText = `
      SELECT
        c.id, c.mes, c.anio, c.fecha_pago, c.pago,
        s.nro_socio, s.nombre
      FROM cobranzas c
      JOIN socios s ON s.nro_socio = c.nro_socio
      ORDER BY c.anio DESC, c.mes DESC, c.id DESC
    `;

    // Si hay un límite definido en la URL, se añade a la query de PostgreSQL
    if (limit) {
      queryText += ` LIMIT ${parseInt(limit)}`;
    }

    const result = await pool.query(queryText);
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo cobranzas:", err);
    res.status(500).json({ error: "Error al obtener cobranzas" });
  }
});

// 2. POST /api/cobranzas → Registrar una nueva cobranza
router.post("/", async (req, res) => {
  const { nro_socio, mes, anio, pago, fecha_pago } = req.body;
  if (!nro_socio || !mes || !anio) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO cobranzas (nro_socio, mes, anio, pago, fecha_pago) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nro_socio, mes, anio, pago, fecha_pago]
    );
    res.status(201).json({ message: "Éxito", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar" });
  }
});

// 3. PUT /api/cobranzas/:id → Actualizar pago
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { pago, fecha_pago } = req.body;
  try {
    const result = await pool.query(
      "UPDATE cobranzas SET pago = $1, fecha_pago = $2 WHERE id = $3 RETURNING *",
      [pago, fecha_pago, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    res.json({ message: "Actualizado", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar" });
  }
});

export default router;