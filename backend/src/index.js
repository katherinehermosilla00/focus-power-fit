import "dotenv/config";
import express from "express";
import cors from "cors";

import sequelize from "./config/database.js";
import clientesRoutes from "./routes/clientes.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/clientes", clientesRoutes);

app.get("/", (req, res) => {
  res.json({
    ok: true,
    mensaje: "Backend Focus Power Fit funcionando",
  });
});

app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();

    res.json({
      ok: true,
      backend: "activo",
      database: "conectada",
    });
  } catch (error) {
    console.error("Error MySQL:", error.message);

    res.status(500).json({
      ok: false,
      backend: "activo",
      database: "sin conexión",
    });
  }
});

const iniciarServidor = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL conectado correctamente");

    await sequelize.sync();
    console.log("Modelos sincronizados correctamente");

    app.listen(PORT, () => {
      console.log(
        `Focus Power Fit API ejecutándose en http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Error al iniciar el backend:",
      error.message
    );
  }
};

iniciarServidor();