import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

import sequelize from "./config/database.js";

// RUTAS
import clientesRoutes from "./routes/clientes.js";
import profesoresRoutes from "./routes/profesores.js";
import planesRoutes from "./routes/planes.js";
import horariosRoutes from "./routes/horarios.js";
import asignacionesRoutes from "./routes/asignaciones.js";
import asistenciasRoutes from "./routes/asistencias.js";
import contratosRoutes from "./routes/contratos.js";
import pagosRoutes from "./routes/pagos.js";
import recordatoriosRoutes from "./routes/recordatorios.js";

// MODELOS
import "./models/cliente.js";
import "./models/profesor.js";
import "./models/plan.js";
import "./models/horario.js";
import "./models/asignacion.js";
import "./models/asistencia.js";
import "./models/contrato.js";
import "./models/pago.js";
import "./models/recordatorio.js";

import authRoutes from "./auth.js";

const app = express();
const PORT = process.env.PORT || 3001;

/*
 * MIDDLEWARES
 */
app.use(cors());
app.use(express.json());

/*
 * ARCHIVOS PÚBLICOS
 * Permite abrir las copias digitales de contratos
 * desde:
 * /uploads/contratos/archivo.pdf
 */
app.use(
  "/uploads",
  express.static(
    path.join(
      process.cwd(),
      "uploads"
    )
  )
);

/*
 * RUTAS API
 */
app.use("/api/clientes", clientesRoutes);

app.use(
  "/api/profesores",
  profesoresRoutes
);

app.use("/api/planes", planesRoutes);

app.use(
  "/api/horarios",
  horariosRoutes
);

app.use(
  "/api/asignaciones",
  asignacionesRoutes
);

app.use(
  "/api/asistencias",
  asistenciasRoutes
);

app.use(
  "/api/contratos",
  contratosRoutes
);

app.use("/api/pagos", pagosRoutes);

app.use(
  "/api/recordatorios",
  recordatoriosRoutes
);

/*
 * RUTA PRINCIPAL
 */
app.get("/", (req, res) => {
  res.json({
    ok: true,
    mensaje:
      "Backend Focus Power Fit funcionando",
  });
});

/*
 * HEALTH CHECK
 */
app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();

    res.json({
      ok: true,
      backend: "activo",
      database: "conectada",
    });
  } catch (error) {
    console.error(
      "Error MySQL:",
      error.message
    );

    res.status(500).json({
      ok: false,
      backend: "activo",
      database: "sin conexión",
    });
  }
});

/*
 * INICIAR SERVIDOR
 */
const iniciarServidor = async () => {
  try {
    await sequelize.authenticate();

    console.log(
      "MySQL conectado correctamente"
    );

    await sequelize.sync();

    console.log(
      "Modelos sincronizados correctamente"
    );

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