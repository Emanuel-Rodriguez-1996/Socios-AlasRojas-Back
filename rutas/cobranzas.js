import express from "express";
import pool from "../db.js";

const router = express.Router();

// 1. GET /api/cobranzas → Listar cobranzas
router.get("/", async (req, res) => {
  try {
    const { limit } = req.query;

    // Ajusta c.fecha_pago por c.fecha_registro si ya renombraste la columna
    let queryText = `
      SELECT
        c.id, 
        c.mes, 
        c.anio, 
        c.pago, 
        c.monto,
        c.fecha_pago,
        s.nro_socio, 
        s.nombre
      FROM cobranzas c
      JOIN socios s ON s.nro_socio = c.nro_socio
      ORDER BY c.anio DESC, c.mes DESC, c.id DESC
    `;

    if (limit) {
      // Usamos parámetros para evitar inyecciones y errores de sintaxis
      queryText += ` LIMIT $1`;
      const result = await pool.query(queryText, [parseInt(limit)]);
      res.json(result.rows);
    } else {
      const result = await pool.query(queryText);
      res.json(result.rows);
    }
    
  } catch (err) {
    console.error("Error obteniendo cobranzas:", err); // Esto imprimirá el error en Render
    res.status(500).json({ error: "Error al obtener cobranzas" });
  }
});

// 2. POST /api/cobranzas → Registrar una nueva cobranza (Recibe monto)
router.post("/", async (req, res) => {
  // Se agrega monto a la desestructuración del body
  const { nro_socio, mes, anio, pago, fecha_pago, monto } = req.body;
  
  if (!nro_socio || !mes || !anio) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO cobranzas (nro_socio, mes, anio, pago, fecha_pago, monto) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, // Se agregó el $6 y la columna monto
      [nro_socio, mes, anio, pago, fecha_pago, monto] // Se agregó monto al array de valores
    );
    res.status(201).json({ message: "Éxito", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar" });
  }
});

// 3. PUT /api/cobranzas/:id → Actualizar pago y monto
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { pago, fecha_pago, monto } = req.body; // Se agrega monto aquí también
  try {
    const result = await pool.query(
      "UPDATE cobranzas SET pago = $1, fecha_pago = $2, monto = $3 WHERE id = $4 RETURNING *",
      [pago, fecha_pago, monto, id] // Ahora son 4 parámetros
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    res.json({ message: "Actualizado", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

export default router;