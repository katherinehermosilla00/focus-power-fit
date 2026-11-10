
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";

import path from "path";
import { fileURLToPath } from "url";

import sequelize from "./config/database.js";
import { iniciarRecordatorioScheduler } from "./services/recordatorioScheduler.js";

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

// Las fechas y recordatorios usan la hora de Chile, aunque el servidor esté en
// otra zona. Se puede cambiar con la variable TZ.
process.env.TZ ||= "America/Santiago";

// Evitar revelar Express en las respuestas HTTP.
app.disable("x-powered-by");

// ==========================================
// SEGURIDAD DE LA APLICACIÓN
// Referencia: ISO/IEC 27002:2022, controles
// 8.26 y 8.28 (no implica certificación).
// ==========================================

// Encabezados de seguridad HTTP.
app.use(helmet());

// Configuración de proxy:
// Detrás de un proxy HTTPS (Caddy, Nginx o Render), todas las solicitudes
// llegan desde la dirección del proxy. Sin esta opción, los límites de
// intentos serían uno solo para todos los visitantes.
// TRUST_PROXY indica cuántos proxies hay delante (normalmente 1). Se confía
// solo en esos, no en cualquier valor X-Forwarded-For que envíe el cliente.
const proxiesDeConfianza = Number(
  process.env.TRUST_PROXY ?? (process.env.RENDER === "true" ? 1 : 0)
);

if (Number.isInteger(proxiesDeConfianza) && proxiesDeConfianza > 0) {
  app.set("trust proxy", proxiesDeConfianza);
}

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

// Los límites de intentos de cada ruta
// pública están definidos en auth.js.

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
// RUTA NO ENCONTRADA Y ERRORES
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    ok: false,
    mensaje: "Ruta no encontrada",
  });
});

// Ninguna respuesta incluye detalles internos.
// Express exige los cuatro parámetros.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      ok: false,
      mensaje:
        error.code === "LIMIT_FILE_SIZE"
          ? "El archivo supera el tamaño máximo permitido"
          : "No se pudo procesar el archivo",
    });
  }

  if (error.expuesto) {
    return res.status(error.status).json({
      ok: false,
      mensaje: error.message,
    });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      ok: false,
      mensaje: "El cuerpo de la solicitud no es válido",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      ok: false,
      mensaje: "La solicitud supera el tamaño permitido",
    });
  }

  console.error(
    `Error no controlado en ${req.method} ${req.path}:`,
    error.message
  );

  return res.status(500).json({
    ok: false,
    mensaje: "Ocurrió un error interno",
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const iniciarServidor = async () => {
  try {
    if ((process.env.JWT_SECRET ?? "").length < 32) {
      throw new Error(
        "JWT_SECRET debe definirse con al menos 32 caracteres"
      );
    }

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

    // Recordatorios de clases 24 horas antes (RF-15).
    if (process.env.EMAIL_HOST) {
      iniciarRecordatorioScheduler();
      console.log("Recordatorios automáticos activos");
    } else {
      console.warn(
        "Recordatorios desactivados: falta configurar EMAIL_HOST"
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
