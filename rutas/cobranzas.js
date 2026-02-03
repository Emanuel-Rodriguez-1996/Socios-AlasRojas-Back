import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
=================================
1. GET /api/cobranzas
   Lista cobranzas
   ?limit=10 (opcional)
=================================
*/
router.get("/", async (req, res) => {
  try {
    const { limit } = req.query;

    let queryText = `
      SELECT
        c.id,
        c.mes,
        c.anio,
        c.fecha_registro,
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

    const values = [];

    if (limit) {
      const lim = parseInt(limit, 10);
      if (isNaN(lim) || lim <= 0) {
        return res.status(400).json({ error: "limit debe ser un número positivo" });
      }
      queryText += ` LIMIT $1`;
      values.push(lim);
    }

    const result = await pool.query(queryText, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo cobranzas:", err);
    res.status(500).json({ error: "Error al obtener cobranzas" });
  }
});

/*
=================================
2. POST /api/cobranzas
   Genera cobranzas según tipo de socio
=================================
*/
router.post("/", async (req, res) => {
  const { nro_socio, mes, anio } = req.body;

  if (!nro_socio || !anio) {
    return res.status(400).json({
      error: "Faltan datos obligatorios: nro_socio y anio"
    });
  }

  // Validación de período
  const periodo = mes ? String(mes) : null;

  if (
    periodo &&
    !(
      ["S1", "S2"].includes(periodo) ||
      (!isNaN(periodo) && Number(periodo) >= 1 && Number(periodo) <= 12)
    )
  ) {
    return res.status(400).json({
      error: "Periodo inválido. Use 1-12, S1 o S2"
    });
  }

  try {
    const result = await pool.query(
      "SELECT generar_cobranza_por_tipo($1, $2, $3) AS meses_procesados",
      [parseInt(nro_socio, 10), periodo, parseInt(anio, 10)]
    );

    res.status(201).json({
      message: "Cobranza procesada correctamente",
      meses_procesados: result.rows[0].meses_procesados
    });
  } catch (err) {
    console.error("Error generando cobranza:", err);
    res.status(500).json({
      error: err.message || "Error al generar cobranza"
    });
  }
});


/*
=================================
3. PUT /api/cobranzas/:id
   Actualiza pago, fecha y monto
   Aplica a mensual / semestre / anual
=================================
*/
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { pago, fecha_registro, monto } = req.body;

  if (typeof pago !== "boolean") {
    return res.status(400).json({
      error: "pago debe ser true o false"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ==========================
    // 1. Buscar cobranza base
    // ==========================
    const baseResult = await client.query(
      `
      SELECT 
        c.id,
        c.mes,
        c.anio,
        c.nro_socio,
        s.tipo_pago
      FROM cobranzas c
      JOIN socios s ON s.nro_socio = c.nro_socio
      WHERE c.id = $1
      `,
      [parseInt(id)]
    );

    if (baseResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Cobranza no encontrada" });
    }

    const base = baseResult.rows[0];

    let mesInicio = base.mes;
    let mesFin = base.mes;

    // ==========================
    // 2. Determinar rango
    // ==========================
    if (base.tipo_pago === "semestral") {
      if (base.mes >= 1 && base.mes <= 6) {
        mesInicio = 1;
        mesFin = 6;
      } else {
        mesInicio = 7;
        mesFin = 12;
      }
    }

    if (base.tipo_pago === "anual") {
      mesInicio = 1;
      mesFin = 12;
    }

    // ==========================
    // 3. Actualizar período
    // ==========================
    const updateResult = await client.query(
      `
      UPDATE cobranzas
      SET pago = $1,
          fecha_registro = $2,
          monto = $3
      WHERE nro_socio = $4
        AND anio = $5
        AND mes BETWEEN $6 AND $7
      RETURNING *
      `,
      [
        pago,
        fecha_registro || new Date(),
        monto ? parseFloat(monto) : 0,
        base.nro_socio,
        base.anio,
        mesInicio,
        mesFin
      ]
    );

    await client.query("COMMIT");

    res.json({
      message: `Actualizado correctamente (${updateResult.rowCount} mes(es) modificados)`,
      data: updateResult.rows
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error actualizando cobranzas:", err);
    res.status(500).json({ error: "Error al actualizar" });
  } finally {
    client.release();
  }
});


export default router;
