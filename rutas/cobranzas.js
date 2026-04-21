import express from "express";
import pool from "../db.js";
import { guardarLog } from "./logs.js";

const router = express.Router();


// ======================
// 📥 POST generar cobranza
// ======================
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

    guardarLog({
      operador: operador || "Sistema",
      accion: "REGISTRO_PAGO",
      detalle: { nro_socio, mes, anio }
    });

    res.status(201).json({
      message: "OK",
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    guardarLog({
      operador: operador || "Sistema",
      accion: "ERROR_PAGO",
      detalle: { error: err.message }
    });

    res.status(500).json({ error: "Error al generar cobranza" });
  }
});


// ======================
// 📤 GET todas las cobranzas
// ======================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        s.nombre,
        s.apellido
      FROM cobranzas c
      LEFT JOIN socios s ON s.nro_socio = c.nro_socio
      ORDER BY c.anio DESC, c.mes DESC, c.id DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    guardarLog({
      operador: "Sistema",
      accion: "ERROR_GET_COBRANZAS",
      detalle: { error: err.message }
    });

    res.status(500).json({ error: "Error al obtener cobranzas" });
  }
});


// ======================
// 🔄 PUT actualizar pago
// ======================
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { pago, fecha_registro, monto, operador } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const base = await client.query(
      `SELECT c.*, s.tipo_pago
       FROM cobranzas c
       LEFT JOIN socios s ON s.nro_socio = c.nro_socio
       WHERE c.id = $1`,
      [id]
    );

    if (!base.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No existe la cobranza" });
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
       SET pago = $1, fecha_registro = $2, monto = $3
       WHERE nro_socio = $4 AND anio = $5 AND mes BETWEEN $6 AND $7`,
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

    guardarLog({
      operador: operador || "Sistema",
      accion: pago ? "PAGO_CONFIRMADO" : "PAGO_ANULADO",
      detalle: {
        nro_socio: data.nro_socio,
        anio: data.anio,
        monto
      }
    });

    res.json({
      message: "OK",
      updated: update.rowCount
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    guardarLog({
      operador: operador || "Sistema",
      accion: "ERROR_UPDATE_PAGO",
      detalle: { id, error: err.message }
    });

    res.status(500).json({ error: "Error al actualizar pago" });

  } finally {
    client.release();
  }
});


export default router;