import express from "express";
import pool from "../db.js";

const router = express.Router();

// 1. GET /api/cobranzas → Listar cobranzas (Ya lo tenías)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, c.mes, c.anio, c.fecha_pago, c.pago,
        s.nro_socio, s.nombre
      FROM cobranzas c
      JOIN socios s ON s.nro_socio = c.nro_socio
      ORDER BY c.anio DESC, c.mes DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo cobranzas:", err);
    res.status(500).json({ error: "Error al obtener cobranzas" });
  }
});

// 2. POST /api/cobranzas → Registrar una nueva cobranza
router.post("/", async (req, res) => {
  const { nro_socio, mes, anio, pago, fecha_pago } = req.body;

  // Validación básica de campos obligatorios
  if (!nro_socio || !mes || !anio) {
    return res.status(400).json({ error: "Faltan datos obligatorios (socio, mes o año)" });
  }

  try {
    // Insertamos en la tabla cobranzas
    // La DB validará automáticamente si el nro_socio existe (FK) 
    // y si la combinación socio-mes-año es única (UNIQUE)
    const result = await pool.query(
      `INSERT INTO cobranzas (nro_socio, mes, anio, pago, fecha_pago) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [nro_socio, mes, anio, pago, fecha_pago]
    );

    res.status(201).json({
      message: "Cobranza registrada con éxito",
      data: result.rows[0]
    });

  } catch (err) {
    console.error("Error al insertar cobranza:", err);

    // Manejo de errores específicos de PostgreSQL
    if (err.code === '23503') { // Foreign Key Violation
      return res.status(400).json({ error: "El número de socio no existe." });
    }
    if (err.code === '23505') { // Unique Violation
      return res.status(400).json({ error: "Ya existe un registro para este socio en este mes/año." });
    }
    if (err.code === '23514') { // Check Constraint Violation (chk_pago_fecha)
      return res.status(400).json({ error: "Si marca 'Pagó', debe incluir la fecha de pago." });
    }

    res.status(500).json({ error: "Error interno del servidor al guardar." });
  }
});

export default router;