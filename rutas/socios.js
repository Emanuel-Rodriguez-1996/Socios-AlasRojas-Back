import express from "express";
import pool from "../db.js";
import { guardarLog } from "./logs.js"; 

const router = express.Router();

// GET
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM socios ORDER BY nro_socio ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener socios" });
  }
});

// ALTA
router.post("/", async (req, res) => {
  const { nro_socio, nombre, apellido, tel, tipo_pago, operador } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO socios (nro_socio, nombre, apellido, tel, tipo_pago) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [parseInt(nro_socio), nombre, apellido, tel, tipo_pago || "mensual"]
    );

    // LOG ✔
    if (operador) {
      guardarLog({
        operador,
        accion: "ALTA_SOCIO",
        detalle: { nro_socio, nombre, apellido }
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear socio" });
  }
});

// BAJA
router.delete("/:nro", async (req, res) => {
  const { nro } = req.params;
  const { operador } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM cobranzas WHERE nro_socio = $1", [nro]);

    const result = await client.query(
      "DELETE FROM socios WHERE nro_socio = $1",
      [nro]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Socio no encontrado" });
    }

    await client.query("COMMIT");

    // LOG ✔
    if (operador) {
      guardarLog({
        operador,
        accion: "BAJA_SOCIO",
        detalle: { nro_socio: nro }
      });
    }

    res.json({ message: "Socio eliminado" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Error en baja" });
  } finally {
    client.release();
  }
});

export default router;