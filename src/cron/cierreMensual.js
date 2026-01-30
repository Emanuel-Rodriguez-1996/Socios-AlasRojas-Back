import cron from "node-cron";
import pool from "../db.js"; // tu conexión a Postgres

let yaEjecutadoEsteMes = false;

// Se ejecuta todos los días 25 a las 03:00 AM
cron.schedule("*/2 * * * *", async () => {
  if (yaEjecutadoEsteMes) {
    console.log("⏭️ Cierre mensual ya ejecutado este mes");
    return;
  }

  try {
    console.log("🚀 Ejecutando cierre mensual de cobranzas...");

    await pool.query("SELECT generar_cobranzas_mes_actual();");

    yaEjecutadoEsteMes = true;
    console.log("✅ Cierre mensual completado");
  } catch (err) {
    console.error("❌ Error en cierre mensual:", err);
  }
});

// Reset automático cuando cambia el mes
cron.schedule("0 0 1 * *", () => {
  yaEjecutadoEsteMes = false;
  console.log("🔄 Reset bandera mensual");
});
