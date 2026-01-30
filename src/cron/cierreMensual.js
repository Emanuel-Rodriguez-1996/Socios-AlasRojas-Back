import cron from "node-cron";
import pool from "../../db.js";


console.log("🟢 Cron de cierre mensual cargado");

// TEST: cada 2 minutos
cron.schedule("*/2 * * * *", async () => {
  console.log("⏱️ Ejecutando cierre:", new Date().toISOString());

  try {
    console.log("🔌 Conectando a la base...");
    await pool.query("SELECT generar_cobranzas_mes_actual();");
    console.log("✅ Cierre ejecutado correctamente");
  } catch (err) {
    console.error("❌ Error en cierre:", err.message);
  }
});
