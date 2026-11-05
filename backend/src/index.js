
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import path from "path";
import { fileURLToPath } from "url";

import sequelize from "./config/database.js";

// ==========================================
// RUTAS
// ==========================================
import clientesRoutes from "./routes/clientes.js";
import profesoresRoutes from "./routes/profesores.js";
import planesRoutes from "./routes/planes.js";
import horariosRoutes from "./routes/horarios.js";
import asignacionesRoutes from "./routes/asignaciones.js";
import asistenciasRoutes from "./routes/asistencias.js";
import contratosRoutes from "./routes/contratos.js";
import pagosRoutes from "./routes/pagos.js";
import recordatoriosRoutes from "./routes/recordatorios.js";
import sucursalesRoutes from "./routes/sucursales.js";
import maquinasRoutes from "./routes/maquinas.js";
import fitbotRoutes from "./routes/fitbot.js";
import authRoutes from "./auth.js";

// RUTAS DE GESTIÓN GENERAL DE IMÁGENES
import imagenesRoutes from "./routes/imagenes.js";

// ==========================================
// MODELOS
// ==========================================
import "./models/cliente.js";
import "./models/profesor.js";
import "./models/plan.js";
import "./models/horario.js";
import "./models/asignacion.js";
import "./models/asistencia.js";
import "./models/contrato.js";
import "./models/pago.js";
import "./models/recordatorio.js";
import "./models/sucursal.js";
import "./models/maquina.js";
import "./models/imagen.js";

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================
const app = express();
const PORT = process.env.PORT || 3001;

// Evitar revelar Express en las respuestas HTTP.
app.disable("x-powered-by");

// ==========================================
// SEGURIDAD - ISO/IEC 27001
// ==========================================

// Encabezados de seguridad HTTP.
app.use(helmet());

// Configuración de proxy:
// En Render, Express está detrás de un proxy HTTPS.
// Confiar únicamente en el primer proxy, no en
// cualquier valor X-Forwarded-For.
//
// Esta configuración debe verificarse en Render
// antes del despliegue a producción.
if (process.env.RENDER === "true") {
  app.set("trust proxy", 1);
}

// Limitar intentos repetidos de inicio de sesión.
// 10 solicitudes por IP cada 15 minutos.
//
// El almacenamiento por defecto es en memoria.
// Para múltiples instancias, se recomienda
// utilizar un almacenamiento compartido.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    ok: false,
    mensaje:
      "Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.",
  },
});

// ==========================================
// CONFIGURACIÓN DE CORS
// ==========================================

// En producción, definir CORS_ORIGINS
// con los dominios reales del frontend.
//
// En desarrollo se permiten los puertos
// habituales de React, Vite y Next.js.

const origenesDesarrollo = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const origenesConfigurados = (
  process.env.CORS_ORIGINS || ""
)
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

const origenesPermitidos = new Set(
  origenesConfigurados.length > 0
    ? origenesConfigurados
    : process.env.NODE_ENV === "production"
      ? []
      : origenesDesarrollo
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Las solicitudes sin Origin, como las
      // de servicios backend o curl, no
      // necesitan permisos CORS.
      if (!origin) {
        return callback(null, false);
      }

      if (origenesPermitidos.has(origin)) {
        return callback(null, true);
      }

      // No enviar cabeceras CORS para
      // orígenes no autorizados.
      return callback(null, false);
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    optionsSuccessStatus: 204,
  })
);

// ==========================================
// MIDDLEWARES
// ==========================================

// Limitar el tamaño de solicitudes JSON.
// No afecta directamente a las subidas
// multipart/form-data gestionadas por Multer.

app.use(
  express.json({
    limit: "20kb",
  })
);

// ==========================================
// PROTECCIÓN DE CONTRATOS PRIVADOS
// ==========================================

// Los contratos NO deben descargarse
// mediante URLs públicas.
//
// Descarga autenticada:
// GET /api/contratos/:id/archivo

app.use("/uploads/contratos", (req, res) => {
  return res.status(403).json({
    ok: false,
    mensaje:
      "Acceso directo a contratos no permitido",
  });
});

// ==========================================
// PROTECCIÓN DE IMÁGENES ADMINISTRADAS
// ==========================================

// Las imágenes administradas se almacenan
// en backend/uploads/imagenes.
//
// No se permite acceder directamente a ellas.
// Solo podrán consultarse mediante las rutas
// controladas de /api/imagenes.
//
// Esto permite respetar la configuración
// mostrarPublicamente de cada imagen.

app.use("/uploads/imagenes", (req, res) => {
  return res.status(403).json({
    ok: false,
    mensaje:
      "Acceso directo a imágenes no permitido",
  });
});

// ==========================================
// PROTECCIÓN DE ARCHIVOS
// ==========================================

// Bloquear el acceso directo a /uploads.
// Los archivos deben entregarse mediante
// rutas controladas por el backend.

app.use("/uploads", (req, res) => {
  return res.status(403).json({
    ok: false,
    mensaje: "Acceso directo a archivos no permitido",
  });
});

// ==========================================
// RUTAS API
// ==========================================

app.use("/api/clientes", clientesRoutes);

app.use("/api/profesores", profesoresRoutes);

app.use("/api/planes", planesRoutes);

app.use("/api/horarios", horariosRoutes);

app.use("/api/asignaciones", asignacionesRoutes);

app.use("/api/asistencias", asistenciasRoutes);

app.use("/api/contratos", contratosRoutes);

app.use("/api/pagos", pagosRoutes);

app.use("/api/recordatorios", recordatoriosRoutes);

app.use("/api/sucursales", sucursalesRoutes);

// ==========================================
// GESTIÓN DE MÁQUINAS
// ==========================================

// Acceso protegido para administradores.
// Incluye registro, consulta, edición,
// eliminación y filtros por sucursal y estado.

app.use("/api/maquinas", maquinasRoutes);

// ==========================================
// GESTIÓN GENERAL DE IMÁGENES
// ==========================================

// Permite administrar imágenes de:
// - Profesores
// - Sucursales
// - Máquinas
// - Sitio web
//
// Las operaciones administrativas requieren
// autenticación y rol de administrador.
//
// Las imágenes públicas solo se entregan
// cuando mostrarPublicamente es true.

app.use("/api/imagenes", imagenesRoutes);

// ==========================================
// FITBOT - CHATBOT
// ==========================================

// Comunicación:
// React -> Express -> n8n
//
// Las medidas de seguridad específicas
// de FitBot se encuentran en fitbot.js.

app.use("/api/fitbot", fitbotRoutes);

// ==========================================
// AUTENTICACIÓN
// ==========================================

// Aplicar limitación al login.
// Durante las pruebas automatizadas se
// omite el límite para evitar interferencias.
// Se agregarán pruebas específicas del
// limitador en la auditoría de seguridad.

app.use("/api/auth/login", loginLimiter);

app.use("/api/auth", authRoutes);

// ==========================================
// RUTA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {
  return res.json({
    ok: true,
    mensaje: "Backend Focus Power Fit funcionando",
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();

    return res.json({
      ok: true,
      backend: "activo",
      database: "conectada",
    });
  } catch (error) {
    console.error(
      "Error MySQL:",
      error.message
    );

    return res.status(503).json({
      ok: false,
      backend: "activo",
      database: "sin conexión",
    });
  }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const iniciarServidor = async () => {
  try {
    await sequelize.authenticate();

    console.log(
      "MySQL conectado correctamente"
    );

    if (process.env.DB_SYNC === "true") {
      await sequelize.sync();
      console.log(
        "Modelos sincronizados correctamente"
      );
    } else {
      console.log(
        "Sincronización automática de modelos desactivada"
      );
    }

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

    process.exitCode = 1;
  }
};

// ==========================================
// EXPORTAR APP PARA PRUEBAS
// ==========================================

export default app;

// ==========================================
// EJECUCIÓN DIRECTA
// ==========================================

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)
) {
  iniciarServidor();
}
