const fs = require("fs");
const path = require("path");

function guardarLog({ operador, accion, detalle }) {
  const fecha = new Date();
  const mes = fecha.toISOString().slice(0, 7); // "2026-04"
  
  const logPath = path.join(__dirname, `logs-${mes}.txt`);

  const log = {
    fecha: fecha.toISOString(),
    operador,
    accion,
    detalle
  };

  fs.appendFileSync(logPath, JSON.stringify(log) + "\n");
}

module.exports = { guardarLog };