import express from "express";
import pool from "../db.js";
import { guardarLog } from "./logs.js";

const router = express.Router();

// POST generar cobranza
router.post("/", async (req, res) => {
  const { nro_socio, mes, anio, operador } = req.body;

  if (!nro_socio || !anio) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const result = await pool.query(
      "SELECT generar_cobranza_por_tipo($1, $2, $3)",
      [parseInt(nro_socio), mes, parseInt(anio)]
    );

    // LOG ✔
    if (operador) {
      guardarLog({
        operador,
        accion: "REGISTRO_PAGO",
        detalle: { nro_socio, mes, anio }
      });
    }

    res.status(201).json({
      message: "OK",
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

// PUT update pago
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { pago, fecha_registro, monto, operador } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const base = await client.query(
      `SELECT c.*, s.tipo_pago
       FROM cobranzas c
       JOIN socios s ON s.nro_socio = c.nro_socio
       WHERE c.id = $1`,
      [id]
    );

    if (!base.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No existe" });
    }

    const data = base.rows[0];

    let mesInicio = data.mes;
    let mesFin = data.mes;

    if (data.tipo_pago === "semestral") {
      mesInicio = data.mes <= 6 ? 1 : 7;
      mesFin = data.mes <= 6 ? 6 : 12;
    }

    if (data.tipo_pago === "anual") {
      mesInicio = 1;
      mesFin = 12;
    }

    const update = await client.query(
      `UPDATE cobranzas
       SET pago=$1, fecha_registro=$2, monto=$3
       WHERE nro_socio=$4 AND anio=$5 AND mes BETWEEN $6 AND $7`,
      [
        pago,
        fecha_registro,
        monto,
        data.nro_socio,
        data.anio,
        mesInicio,
        mesFin
      ]
    );

    await client.query("COMMIT");

    // LOG ✔
    if (operador) {
      guardarLog({
        operador,
        accion: "ACTUALIZA_PAGO",
        detalle: { id, pago, monto }
      });
    }

    res.json({ message: "OK", updated: update.rowCount });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Error" });
  } finally {
    client.release();
  }
});

export default router;