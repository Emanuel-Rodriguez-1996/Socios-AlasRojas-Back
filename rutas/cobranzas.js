import express from "express";
import pool from "../db.js";

const router = express.Router();

// 1. GET /api/cobranzas → Listar cobranzas
router.get("/", async (req, res) => {
  try {
    const { limit } = req.query;

    let queryText = `
      SELECT
        c.id,
        c.mes,
        c.anio,
        c.fecha_pago,
        c.pago,
        c.monto,
        s.nro_socio,
        s.nombre,
        s.apellido,
        s.tipo_pago
      FROM cobranzas c
      JOIN socios s ON s.nro_socio = c.nro_socio
      ORDER BY c.anio DESC, c.mes DESC, c.id DESC
    `;

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

// 2. POST /api/cobranzas → Registrar cobro por tipo de socio
router.post("/", async (req, res) => {
  const { nro_socio, mes, anio } = req.body;

  if (!nro_socio || !anio) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  try {
    // Llama a la función de PostgreSQL
    const result = await pool.query(
      "SELECT generar_cobranza_por_tipo($1, $2, $3) AS meses_procesados",
      [nro_socio, mes, anio]
    );

    res.status(201).json({
      message: "Cobranza procesada correctamente",
      meses_procesados: result.rows[0].meses_procesados
    });
  } catch (err) {
    console.error("Error generando cobranza:", err);
    res.status(500).json({
      error: "Error al generar cobranza",
      detalle: err.message
    });
  }
});

// 3. PUT /api/cobranzas/:id → Actualizar pago y monto manualmente
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { pago, fecha_pago, monto } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE cobranzas
      SET pago = $1,
          fecha_pago = $2,
          monto = $3
      WHERE id = $4
      RETURNING *
      `,
      [pago, fecha_pago, monto, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No encontrado" });
    }

    res.json({
      message: "Actualizado correctamente",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Error actualizando cobranza:", err);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

export default router;
