// socios.jsx (Backend)
import express from "express";
import pool from "../db.js";

const router = express.Router();

// GET /api/socios
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM socios ORDER BY nro_socio ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener socios" });
  }
});

// POST /api/socios -> ALTA
router.post("/", async (req, res) => {
  const { nro_socio, nombre, apellido, tel, tipo_pago } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO socios (nro_socio, nombre, apellido, tel, tipo_pago) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [parseInt(nro_socio), nombre, apellido, tel, tipo_pago || 'mensual']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Código de error Postgres para duplicados en PK
      return res.status(400).json({ error: "El Nº de Socio ya existe en el sistema." });
    }
    res.status(500).json({ error: "Error interno al crear el socio." });
  }
});

// DELETE /api/socios/:nro -> BAJA
router.delete("/:nro", async (req, res) => {
  const { nro } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN"); // Iniciamos transacción por la FK

    // 1. Borrar cobranzas asociadas (por la restricción de FK)
    await client.query("DELETE FROM cobranzas WHERE nro_socio = $1", [nro]);

    // 2. Borrar al socio
    const result = await client.query("DELETE FROM socios WHERE nro_socio = $1", [nro]);

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Socio no encontrado" });
    }

    await client.query("COMMIT");
    res.json({ message: "Socio y su historial eliminados correctamente" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Error al procesar la baja definitiva" });
  } finally {
    client.release();
  }
});

export default router;