import express from "express";
import cors from "cors";

import sociosRouter from "./rutas/socios.js";

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/socios", sociosRouter);

// Test
app.get("/", (req, res) => {
  res.send("✅ Socios Alas Rojas - Backend OK 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});