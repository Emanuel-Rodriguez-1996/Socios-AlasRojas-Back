import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM socios");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener socios" });
  }
});

export default router;